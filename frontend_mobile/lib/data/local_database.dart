import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// LocalDatabase manages the SQLite database on the phone.
/// 
/// This is the "mini MySQL" that lives on the device. It mirrors the server
/// schema so data can be used offline and synced later.
/// 
/// Key concepts:
/// - Every table has `uuid`, `updated_at`, `is_deleted` (same as server)
/// - Additional column: `is_dirty` — marks records changed locally but not yet synced
/// - The UI always reads from here (never directly from the server)
class LocalDatabase {
  static Database? _db;

  /// Get the database instance, creating it if needed
  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  static Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'grocery_sync.db');

    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // --- Categories ---
        await db.execute('''
          CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            category_name TEXT NOT NULL,
            created_by INTEGER,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
          )
        ''');

        // --- Master Items ---
        await db.execute('''
          CREATE TABLE master_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            item_name TEXT NOT NULL,
            category_id INTEGER,
            category_uuid TEXT,
            unit TEXT DEFAULT 'pcs',
            default_quantity REAL DEFAULT 1,
            category_name TEXT,
            created_by INTEGER,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
          )
        ''');

        // --- Shopping Lists ---
        await db.execute('''
          CREATE TABLE shopping_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            list_name TEXT NOT NULL,
            user_id INTEGER,
            status TEXT DEFAULT 'Pending',
            created_at TEXT,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
          )
        ''');

        // --- Shopping List Items ---
        await db.execute('''
          CREATE TABLE shopping_list_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            shopping_list_id INTEGER,
            shopping_list_uuid TEXT,
            master_item_id INTEGER,
            master_item_uuid TEXT,
            item_name TEXT,
            category_name TEXT,
            category_id INTEGER,
            quantity REAL DEFAULT 1,
            unit TEXT DEFAULT 'pcs',
            priority TEXT DEFAULT 'Medium',
            notes TEXT,
            purchased INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
          )
        ''');

        // --- Purchase History ---
        await db.execute('''
          CREATE TABLE purchase_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            shopping_list_id INTEGER,
            shopping_list_uuid TEXT,
            list_name TEXT,
            user_id INTEGER,
            total_items INTEGER,
            completed_date TEXT,
            total_spent REAL DEFAULT 0,
            updated_at TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
          )
        ''');

        // --- Sync Metadata ---
        // Stores the last sync timestamp so we know what to ask the server for
        await db.execute('''
          CREATE TABLE sync_meta (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        ''');
      },
    );
  }

  // ============================================================
  // SYNC METADATA
  // ============================================================

  /// Get the last sync timestamp
  static Future<String?> getLastSyncTime() async {
    final db = await database;
    final result = await db.query('sync_meta', where: 'key = ?', whereArgs: ['last_sync']);
    if (result.isEmpty) return null;
    return result.first['value'] as String?;
  }

  /// Set the last sync timestamp
  static Future<void> setLastSyncTime(String timestamp) async {
    final db = await database;
    await db.insert(
      'sync_meta',
      {'key': 'last_sync', 'value': timestamp},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  // ============================================================
  // GENERIC CRUD HELPERS
  // ============================================================

  /// Get all non-deleted records from a table
  static Future<List<Map<String, dynamic>>> getAll(String table) async {
    final db = await database;
    return db.query(table, where: 'is_deleted = 0', orderBy: 'id DESC');
  }

  /// Get a single record by UUID
  static Future<Map<String, dynamic>?> getByUuid(String table, String uuid) async {
    final db = await database;
    final results = await db.query(table, where: 'uuid = ?', whereArgs: [uuid]);
    return results.isNotEmpty ? results.first : null;
  }

  /// Get all dirty (unsynced) records from a table
  static Future<List<Map<String, dynamic>>> getDirty(String table) async {
    final db = await database;
    return db.query(table, where: 'is_dirty = 1');
  }

  /// Insert or update a record (used during sync pull)
  /// This does NOT set is_dirty because it's coming from the server
  static Future<void> upsertFromServer(String table, Map<String, dynamic> data) async {
    final db = await database;
    final uuid = data['uuid'];
    final existing = await db.query(table, where: 'uuid = ?', whereArgs: [uuid]);

    // Remove server-only fields that don't exist in local schema
    final cleanData = Map<String, dynamic>.from(data);
    cleanData.remove('id'); // Don't overwrite local auto-increment ID
    cleanData['is_dirty'] = 0; // Came from server, so it's clean

    if (existing.isNotEmpty) {
      await db.update(table, cleanData, where: 'uuid = ?', whereArgs: [uuid]);
    } else {
      await db.insert(table, cleanData, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }

  /// Insert a new record locally (marks as dirty for sync)
  static Future<int> insertLocal(String table, Map<String, dynamic> data) async {
    final db = await database;
    data['is_dirty'] = 1;
    data['updated_at'] = DateTime.now().toUtc().toIso8601String();
    return db.insert(table, data);
  }

  /// Update a record locally (marks as dirty for sync)
  static Future<void> updateLocal(String table, String uuid, Map<String, dynamic> data) async {
    final db = await database;
    data['is_dirty'] = 1;
    data['updated_at'] = DateTime.now().toUtc().toIso8601String();
    await db.update(table, data, where: 'uuid = ?', whereArgs: [uuid]);
  }

  /// Soft-delete a record locally (marks as dirty for sync)
  static Future<void> softDeleteLocal(String table, String uuid) async {
    final db = await database;
    await db.update(
      table,
      {
        'is_deleted': 1,
        'is_dirty': 1,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      where: 'uuid = ?',
      whereArgs: [uuid],
    );
  }

  /// Mark a record as clean (synced successfully)
  static Future<void> markClean(String table, String uuid) async {
    final db = await database;
    await db.update(table, {'is_dirty': 0}, where: 'uuid = ?', whereArgs: [uuid]);
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  static Future<List<Map<String, dynamic>>> getCategories() async {
    return getAll('categories');
  }

  // ============================================================
  // MASTER ITEMS (with joined category name)
  // ============================================================

  static Future<List<Map<String, dynamic>>> getMasterItems() async {
    final db = await database;
    // Join category name from the local categories table
    return db.rawQuery('''
      SELECT m.*, COALESCE(c.category_name, m.category_name, 'Uncategorized') as category_name
      FROM master_items m
      LEFT JOIN categories c ON m.category_uuid = c.uuid
      WHERE m.is_deleted = 0
      ORDER BY m.id DESC
    ''');
  }

  // ============================================================
  // SHOPPING LISTS
  // ============================================================

  static Future<List<Map<String, dynamic>>> getShoppingLists() async {
    final db = await database;
    return db.rawQuery('''
      SELECT s.*, 
        (SELECT COUNT(*) FROM shopping_list_items WHERE shopping_list_uuid = s.uuid AND is_deleted = 0) as item_count
      FROM shopping_lists s
      WHERE s.is_deleted = 0
      ORDER BY s.created_at DESC
    ''');
  }

  static Future<Map<String, dynamic>?> getShoppingList(String uuid) async {
    final db = await database;
    final results = await db.query('shopping_lists', where: 'uuid = ? AND is_deleted = 0', whereArgs: [uuid]);
    return results.isNotEmpty ? results.first : null;
  }

  // ============================================================
  // SHOPPING LIST ITEMS
  // ============================================================

  static Future<List<Map<String, dynamic>>> getShoppingListItems(String listUuid) async {
    final db = await database;
    return db.rawQuery('''
      SELECT si.*, 
        COALESCE(m.item_name, si.item_name) as item_name,
        COALESCE(c.category_name, si.category_name) as category_name
      FROM shopping_list_items si
      LEFT JOIN master_items m ON si.master_item_uuid = m.uuid
      LEFT JOIN categories c ON m.category_uuid = c.uuid
      WHERE si.shopping_list_uuid = ? AND si.is_deleted = 0
    ''', [listUuid]);
  }

  // ============================================================
  // PURCHASE HISTORY
  // ============================================================

  static Future<List<Map<String, dynamic>>> getPurchaseHistory() async {
    final db = await database;
    return db.rawQuery('''
      SELECT ph.*, COALESCE(s.list_name, ph.list_name) as list_name
      FROM purchase_history ph
      LEFT JOIN shopping_lists s ON ph.shopping_list_uuid = s.uuid
      WHERE ph.is_deleted = 0
      ORDER BY ph.completed_date DESC
    ''');
  }

  // ============================================================
  // UTILITY
  // ============================================================

  /// Clear all data (used on logout)
  static Future<void> clearAll() async {
    final db = await database;
    await db.delete('categories');
    await db.delete('master_items');
    await db.delete('shopping_lists');
    await db.delete('shopping_list_items');
    await db.delete('purchase_history');
    await db.delete('sync_meta');
  }
}
