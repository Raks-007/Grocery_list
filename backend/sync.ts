import { Router } from "express";
import { db, uuidv4 } from "../db/index.js";

/**
 * Sync Router
 * 
 * Two endpoints that enable offline-first mobile sync:
 * 
 * GET  /api/sync/pull?since=<ISO timestamp>
 *   → Returns all records modified after `since` for the authenticated user.
 *     Includes soft-deleted records so the mobile can remove them locally.
 * 
 * POST /api/sync/push
 *   → Receives local changes from the mobile app.
 *     Uses "last write wins" — if the server version is newer, the push is ignored.
 *     Returns the final server state of each record.
 */
export function createSyncRouter(): Router {
  const router = Router();

  // ============================================================
  // PULL — Mobile asks: "What changed since I last synced?"
  // ============================================================
  router.get("/pull", async (req: any, res: any) => {
    if (!db) return res.status(500).json({ success: false, message: "Database not configured." });

    const since = req.query.since || "1970-01-01T00:00:00Z";
    const userId = req.user.id;

    try {
      // Get all categories modified after `since` for this user (including deleted ones)
      const categories = await db.all(
        `SELECT * FROM categories 
         WHERE updated_at > ? AND (created_by IS NULL OR created_by = ?)`,
        [since, userId]
      );

      // Get all master items modified after `since`
      const masterItems = await db.all(
        `SELECT m.*, c.category_name, c.uuid AS category_uuid
         FROM master_items m
         LEFT JOIN categories c ON m.category_id = c.id
         WHERE m.updated_at > ? AND (m.created_by IS NULL OR m.created_by = ?)`,
        [since, userId]
      );

      // Get all shopping lists modified after `since`
      const shoppingLists = await db.all(
        `SELECT * FROM shopping_lists 
         WHERE updated_at > ? AND user_id = ?`,
        [since, userId]
      );

      // Get all shopping list items modified after `since`
      // (only for lists owned by this user)
      const shoppingListItems = await db.all(
        `SELECT si.*, sl.uuid AS shopping_list_uuid, m.uuid AS master_item_uuid
         FROM shopping_list_items si
         JOIN shopping_lists sl ON si.shopping_list_id = sl.id
         JOIN master_items m ON si.master_item_id = m.id
         WHERE si.updated_at > ? AND sl.user_id = ?`,
        [since, userId]
      );

      // Get purchase history modified after `since`
      const purchaseHistory = await db.all(
        `SELECT ph.*, sl.uuid AS shopping_list_uuid
         FROM purchase_history ph
         JOIN shopping_lists sl ON ph.shopping_list_id = sl.id
         WHERE ph.updated_at > ? AND ph.user_id = ?`,
        [since, userId]
      );

      // Return current server time so the mobile knows when to sync from next time
      const serverTime = new Date().toISOString();

      res.json({
        success: true,
        data: {
          categories,
          masterItems,
          shoppingLists,
          shoppingListItems,
          purchaseHistory,
          serverTime,
        },
      });
    } catch (err: any) {
      console.error("Sync pull error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ============================================================
  // PUSH — Mobile says: "Here are changes I made while offline"
  // ============================================================
  router.post("/push", async (req: any, res: any) => {
    if (!db) return res.status(500).json({ success: false, message: "Database not configured." });

    const userId = req.user.id;
    const { changes } = req.body;

    // changes is an array of:
    // { table: "categories", uuid: "abc-123", data: { category_name: "Snacks", ... }, updated_at: "...", is_deleted: false }

    if (!Array.isArray(changes)) {
      return res.status(400).json({ success: false, message: "Expected 'changes' array in body." });
    }

    const results: any[] = [];

    try {
      for (const change of changes) {
        const { table, uuid: recordUuid, data, updated_at, is_deleted } = change;

        // Validate table name to prevent SQL injection
        const allowedTables = ['categories', 'master_items', 'shopping_lists', 'shopping_list_items', 'purchase_history'];
        if (!allowedTables.includes(table)) {
          results.push({ uuid: recordUuid, status: "error", message: `Invalid table: ${table}` });
          continue;
        }

        // Check if the record already exists on the server
        const existing = await db.get(`SELECT * FROM ${table} WHERE uuid = ?`, [recordUuid]);

        if (existing) {
          // --- UPDATE: Last Write Wins ---
          // Only apply the change if the mobile's version is newer
          const serverUpdatedAt = new Date(existing.updated_at).getTime();
          const mobileUpdatedAt = new Date(updated_at).getTime();

          if (mobileUpdatedAt > serverUpdatedAt) {
            // Mobile version is newer → apply the change
            if (is_deleted) {
              await db.run(
                `UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE uuid = ?`,
                [updated_at, recordUuid]
              );
            } else {
              const updateFields = buildUpdateFields(table, data);
              if (updateFields.sql) {
                await db.run(
                  `UPDATE ${table} SET ${updateFields.sql}, updated_at = ? WHERE uuid = ?`,
                  [...updateFields.params, updated_at, recordUuid]
                );
              }
            }
            results.push({ uuid: recordUuid, status: "updated" });
          } else {
            // Server version is newer → skip (server wins)
            results.push({ uuid: recordUuid, status: "skipped", reason: "server_version_newer" });
          }
        } else {
          // --- INSERT: New record from mobile ---
          const insertResult = await insertRecord(table, recordUuid, data, updated_at, is_deleted, userId);
          results.push({ uuid: recordUuid, status: "created", serverId: insertResult.lastID });
        }
      }

      // Return the current server time
      const serverTime = new Date().toISOString();

      res.json({
        success: true,
        data: { results, serverTime },
      });
    } catch (err: any) {
      console.error("Sync push error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

/**
 * Builds a safe SET clause for UPDATE statements.
 * Only includes columns that are valid for each table.
 */
function buildUpdateFields(table: string, data: Record<string, any>): { sql: string; params: any[] } {
  // Define allowed columns per table (prevents injecting random columns)
  const allowedColumns: Record<string, string[]> = {
    categories: ['category_name'],
    master_items: ['item_name', 'category_id', 'unit', 'default_quantity'],
    shopping_lists: ['list_name', 'status'],
    shopping_list_items: ['quantity', 'unit', 'priority', 'notes', 'purchased', 'shopping_list_id', 'master_item_id'],
    purchase_history: ['total_items', 'total_spent'],
  };

  const columns = allowedColumns[table] || [];
  const setClauses: string[] = [];
  const params: any[] = [];

  for (const col of columns) {
    if (data[col] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(data[col]);
    }
  }

  return { sql: setClauses.join(", "), params };
}

/**
 * Inserts a new record that was created on the mobile device.
 * Resolves UUID references (e.g., category_uuid → category_id) to server IDs.
 */
async function insertRecord(
  table: string,
  recordUuid: string,
  data: Record<string, any>,
  updatedAt: string,
  isDeleted: boolean,
  userId: number
) {
  switch (table) {
    case "categories":
      return db!.run(
        "INSERT INTO categories (uuid, category_name, created_by, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?)",
        [recordUuid, data.category_name, userId, updatedAt, isDeleted ? 1 : 0]
      );

    case "master_items": {
      // Resolve category UUID to server ID
      let categoryId = data.category_id;
      if (data.category_uuid) {
        const cat = await db!.get("SELECT id FROM categories WHERE uuid = ?", [data.category_uuid]);
        if (cat) categoryId = cat.id;
      }
      return db!.run(
        "INSERT INTO master_items (uuid, item_name, category_id, unit, default_quantity, created_by, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [recordUuid, data.item_name, categoryId, data.unit || 'pcs', data.default_quantity || 1, userId, updatedAt, isDeleted ? 1 : 0]
      );
    }

    case "shopping_lists":
      return db!.run(
        "INSERT INTO shopping_lists (uuid, list_name, user_id, status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?)",
        [recordUuid, data.list_name, userId, data.status || 'Pending', updatedAt, isDeleted ? 1 : 0]
      );

    case "shopping_list_items": {
      // Resolve shopping list UUID and master item UUID to server IDs
      let shoppingListId = data.shopping_list_id;
      if (data.shopping_list_uuid) {
        const sl = await db!.get("SELECT id FROM shopping_lists WHERE uuid = ?", [data.shopping_list_uuid]);
        if (sl) shoppingListId = sl.id;
      }
      let masterItemId = data.master_item_id;
      if (data.master_item_uuid) {
        const mi = await db!.get("SELECT id FROM master_items WHERE uuid = ?", [data.master_item_uuid]);
        if (mi) masterItemId = mi.id;
      }
      return db!.run(
        "INSERT INTO shopping_list_items (uuid, shopping_list_id, master_item_id, quantity, unit, priority, notes, purchased, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [recordUuid, shoppingListId, masterItemId, data.quantity || 1, data.unit || 'pcs', data.priority || 'Medium', data.notes || null, data.purchased ? 1 : 0, updatedAt, isDeleted ? 1 : 0]
      );
    }

    case "purchase_history": {
      let shoppingListId = data.shopping_list_id;
      if (data.shopping_list_uuid) {
        const sl = await db!.get("SELECT id FROM shopping_lists WHERE uuid = ?", [data.shopping_list_uuid]);
        if (sl) shoppingListId = sl.id;
      }
      return db!.run(
        "INSERT INTO purchase_history (uuid, shopping_list_id, user_id, total_items, total_spent, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [recordUuid, shoppingListId, userId, data.total_items, data.total_spent || 0, updatedAt, isDeleted ? 1 : 0]
      );
    }

    default:
      throw new Error(`Unknown table: ${table}`);
  }
}
