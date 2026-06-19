import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import { db, initializeDb, uuidv4 } from "../db/index.js";
import { createSyncRouter } from "./sync.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_for_dev";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Database Setup --- //
  await initializeDb();

  // --- Auth Middleware --- //
  const authMiddleware = (req: any, res: any, next: any) => {
    if (!db) return res.status(500).json({ success: false, message: "Database not configured." });
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
  };

  // --- API Routes --- //

  // Auth
  app.post("/api/auth/register", async (req: any, res: any) => {
    if (!db) return res.status(500).json({ success: false, message: "Database not configured." });
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userUuid = uuidv4();
      const result = await db.run(
        "INSERT INTO users (uuid, name, email, password) VALUES (?, ?, ?, ?)",
        [userUuid, name, email, hashedPassword]
      );
      const token = jwt.sign({ id: result.lastID, name, email }, JWT_SECRET);
      res.json({ success: true, token, user: { id: result.lastID, uuid: userUuid, name, email } });
    } catch (err: any) {
      if (err.message.includes("Duplicate entry")) {
        return res.status(409).json({ success: false, message: "Email already exists." });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/auth/login", async (req: any, res: any) => {
    if (!db) return res.status(500).json({ success: false, message: "Database not configured." });
    const { email, password } = req.body;
    const user = await db.get("SELECT * FROM users WHERE email = ? AND is_deleted = 0", [email]);
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET);
    res.json({ success: true, token, user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email } });
  });

  app.get("/api/auth/me", authMiddleware, (req: any, res: any) => {
    res.json({ success: true, user: req.user });
  });

  // Categories
  app.get("/api/categories", authMiddleware, async (req: any, res: any) => {
    const cats = await db!.all(
      "SELECT * FROM categories WHERE is_deleted = 0 AND (created_by IS NULL OR created_by = ?)",
      [req.user.id]
    );
    res.json({ success: true, data: cats });
  });

  app.post("/api/categories", authMiddleware, async (req: any, res: any) => {
    const { category_name } = req.body;
    const catUuid = uuidv4();
    const result = await db!.run(
      "INSERT INTO categories (uuid, category_name, created_by) VALUES (?, ?, ?)",
      [catUuid, category_name, req.user.id]
    );
    const newly = await db!.get("SELECT * FROM categories WHERE id = ?", [result.lastID]);
    res.json({ success: true, data: newly });
  });

  app.delete("/api/categories/:id", authMiddleware, async (req: any, res: any) => {
    try {
      const items = await db!.get(
        "SELECT COUNT(*) as count FROM master_items WHERE category_id = ? AND is_deleted = 0",
        [req.params.id]
      );
      if (items.count > 0) {
        return res.status(400).json({ success: false, message: "Cannot delete category: It contains items." });
      }
      // Soft delete instead of hard delete
      await db!.run(
        "UPDATE categories SET is_deleted = 1 WHERE id = ? AND (created_by = ? OR created_by IS NULL)",
        [req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Master Items
  app.get("/api/master-items", authMiddleware, async (req: any, res: any) => {
    const items = await db!.all(`
      SELECT m.*, c.category_name 
      FROM master_items m 
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_deleted = 0 AND (m.created_by IS NULL OR m.created_by = ?)`, 
      [req.user.id]
    );
    res.json({ success: true, data: items });
  });

  app.post("/api/master-items", authMiddleware, async (req: any, res: any) => {
    const { item_name, category_id, unit, default_quantity } = req.body;
    const itemUuid = uuidv4();
    const result = await db!.run(
      "INSERT INTO master_items (uuid, item_name, category_id, unit, default_quantity, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [itemUuid, item_name, category_id, unit || 'pcs', default_quantity || 1, req.user.id]
    );
    const item = await db!.get(`
      SELECT m.*, c.category_name 
      FROM master_items m 
      LEFT JOIN categories c ON m.category_id = c.id 
      WHERE m.id = ?`, [result.lastID]);
    res.json({ success: true, data: item });
  });

  app.delete("/api/master-items/:id", authMiddleware, async (req: any, res: any) => {
    try {
      // Soft delete instead of hard delete
      await db!.run(
        "UPDATE master_items SET is_deleted = 1 WHERE id = ? AND created_by = ?",
        [req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Shopping Lists
  app.get("/api/shopping-lists", authMiddleware, async (req: any, res: any) => {
    const lists = await db!.all(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_id = s.id AND is_deleted = 0) as item_count 
      FROM shopping_lists s 
      WHERE user_id = ? AND s.is_deleted = 0
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: lists });
  });

  app.post("/api/shopping-lists", authMiddleware, async (req: any, res: any) => {
    const { list_name } = req.body;
    const listUuid = uuidv4();
    const result = await db!.run(
      "INSERT INTO shopping_lists (uuid, list_name, user_id) VALUES (?, ?, ?)",
      [listUuid, list_name, req.user.id]
    );
    const list = await db!.get("SELECT * FROM shopping_lists WHERE id = ?", [result.lastID]);
    list.item_count = 0;
    res.json({ success: true, data: list });
  });

  app.get("/api/shopping-lists/:id", authMiddleware, async (req: any, res: any) => {
    const list = await db!.get(
      "SELECT * FROM shopping_lists WHERE id = ? AND user_id = ? AND is_deleted = 0",
      [req.params.id, req.user.id]
    );
    if (!list) return res.status(404).json({ success: false, message: "Not found" });

    const items = await db!.all(`
      SELECT si.*, m.item_name, c.category_name, c.id as category_id
      FROM shopping_list_items si
      JOIN master_items m ON si.master_item_id = m.id
      JOIN categories c ON m.category_id = c.id
      WHERE si.shopping_list_id = ? AND si.is_deleted = 0
    `, [req.params.id]);
    
    res.json({ success: true, data: { ...list, items } });
  });

  app.post("/api/shopping-lists/:id/items", authMiddleware, async (req: any, res: any) => {
    const { master_item_id, quantity, unit, priority, notes } = req.body;
    const itemUuid = uuidv4();
    const result = await db!.run(`
      INSERT INTO shopping_list_items (uuid, shopping_list_id, master_item_id, quantity, unit, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [itemUuid, req.params.id, master_item_id, quantity || 1, unit || 'pcs', priority || 'Medium', notes || null]);
    
    const newItem = await db!.get(`
      SELECT si.*, m.item_name, c.category_name 
      FROM shopping_list_items si 
      JOIN master_items m ON si.master_item_id = m.id
      JOIN categories c ON m.category_id = c.id
      WHERE si.id = ?
    `, [result.lastID]);

    res.json({ success: true, data: newItem });
  });

  app.put("/api/shopping-lists/:id/items/:itemId", authMiddleware, async (req: any, res: any) => {
    const { purchased, quantity, notes } = req.body;
    await db!.run(
      "UPDATE shopping_list_items SET purchased = COALESCE(?, purchased), quantity = COALESCE(?, quantity), notes = COALESCE(?, notes) WHERE id = ? AND shopping_list_id = ?",
      [purchased !== undefined ? (purchased ? 1 : 0) : null, quantity || null, notes || null, req.params.itemId, req.params.id]
    );
    res.json({ success: true });
  });
  
  app.delete("/api/shopping-lists/:id/items/:itemId", authMiddleware, async (req: any, res: any) => {
    // Soft delete instead of hard delete
    await db!.run(
      "UPDATE shopping_list_items SET is_deleted = 1 WHERE id = ? AND shopping_list_id = ?",
      [req.params.itemId, req.params.id]
    );
    res.json({ success: true });
  });

  app.post("/api/shopping-lists/:id/complete", authMiddleware, async (req: any, res: any) => {
    const { total_spent } = req.body;
    await db!.run("UPDATE shopping_lists SET status = 'Completed' WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    
    const items = await db!.get(
      "SELECT COUNT(*) as count FROM shopping_list_items WHERE shopping_list_id = ? AND is_deleted = 0",
      [req.params.id]
    );
    
    const historyUuid = uuidv4();
    await db!.run(
      "INSERT INTO purchase_history (uuid, shopping_list_id, user_id, total_items, total_spent) VALUES (?, ?, ?, ?, ?)",
      [historyUuid, req.params.id, req.user.id, items.count, total_spent || 0]
    );

    res.json({ success: true });
  });

  app.get("/api/purchase-history", authMiddleware, async (req: any, res: any) => {
    const history = await db!.all(`
      SELECT ph.*, s.list_name 
      FROM purchase_history ph
      JOIN shopping_lists s ON ph.shopping_list_id = s.id
      WHERE ph.user_id = ? AND ph.is_deleted = 0
      ORDER BY ph.completed_date DESC
    `, [req.user.id]);
    res.json({ success: true, data: history });
  });

  // --- Sync Routes --- //
  app.use("/api/sync", authMiddleware, createSyncRouter());


  // --- Vite Middleware --- //
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
