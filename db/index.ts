import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

export class DBWrapper {
  pool: mysql.Pool;
  constructor(pool: mysql.Pool) {
    this.pool = pool;
  }
  async exec(sql: string) {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.pool.query(stmt);
    }
  }
  async run(sql: string, params: any[] = []) {
    const [result] = await this.pool.execute(sql, params) as any;
    return { lastID: result.insertId, changes: result.affectedRows };
  }
  async get(sql: string, params: any | any[] = []) {
    const [rows] = await this.pool.execute(sql, Array.isArray(params) ? params : [params]) as any;
    return rows[0];
  }
  async all(sql: string, params: any | any[] = []) {
    const [rows] = await this.pool.execute(sql, Array.isArray(params) ? params : [params]);
    return rows;
  }
}

// Re-export uuid generator so other files can use it
export { uuidv4 };

export let db: DBWrapper | null = null;

export async function initializeDb() {
  const dbConfig: mysql.PoolOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    if (process.env.DB_HOST) {
      const pool = mysql.createPool(dbConfig);
      db = new DBWrapper(pool);

      // --- Create tables (first-time setup) --- //
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          category_name VARCHAR(255) NOT NULL,
          created_by INT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY(created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS master_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          item_name VARCHAR(255) NOT NULL,
          category_id INT NOT NULL,
          unit VARCHAR(50) DEFAULT 'pcs',
          default_quantity FLOAT DEFAULT 1,
          created_by INT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY(category_id) REFERENCES categories(id),
          FOREIGN KEY(created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS shopping_lists (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          list_name VARCHAR(255) NOT NULL,
          user_id INT NOT NULL,
          status VARCHAR(50) DEFAULT 'Pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS shopping_list_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          shopping_list_id INT NOT NULL,
          master_item_id INT NOT NULL,
          quantity FLOAT DEFAULT 1,
          unit VARCHAR(50) DEFAULT 'pcs',
          priority VARCHAR(50) DEFAULT 'Medium',
          notes TEXT,
          purchased BOOLEAN DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY(shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
          FOREIGN KEY(master_item_id) REFERENCES master_items(id)
        );

        CREATE TABLE IF NOT EXISTS purchase_history (
          id INT PRIMARY KEY AUTO_INCREMENT,
          uuid VARCHAR(36) UNIQUE,
          shopping_list_id INT NOT NULL,
          user_id INT NOT NULL,
          total_items INT NOT NULL,
          completed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_spent FLOAT DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY(shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // --- Migration: add sync columns to existing tables if they don't have them --- //
      const tables = ['users', 'categories', 'master_items', 'shopping_lists', 'shopping_list_items', 'purchase_history'];
      for (const table of tables) {
        await addColumnIfNotExists(db, table, 'uuid', 'VARCHAR(36) UNIQUE');
        await addColumnIfNotExists(db, table, 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        await addColumnIfNotExists(db, table, 'is_deleted', 'BOOLEAN DEFAULT 0');
      }

      // Backfill UUIDs for any existing rows that don't have one
      for (const table of tables) {
        const rows = await db.all(`SELECT id FROM ${table} WHERE uuid IS NULL`);
        for (const row of rows as any[]) {
          await db.run(`UPDATE ${table} SET uuid = ? WHERE id = ?`, [uuidv4(), row.id]);
        }
      }

      // Seed default categories if empty
      const catCount = await db.get("SELECT COUNT(*) as count FROM categories WHERE is_deleted = 0");
      if (catCount.count === 0) {
        const defaultCats = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Household'];
        for (const name of defaultCats) {
          await db.run(
            "INSERT INTO categories (uuid, category_name) VALUES (?, ?)",
            [uuidv4(), name]
          );
        }
      }

      console.log("✅ MySQL Database connected and initialized (with sync support).");
    } else {
      console.warn("DB_HOST not provided. Skipping MySQL connection.");
    }
  } catch (err: any) {
    console.error("Failed to initialize MySQL:", err.message);
  }
}

/**
 * Safely adds a column to an existing table if it doesn't already exist.
 * MySQL doesn't have IF NOT EXISTS for ALTER TABLE ADD COLUMN,
 * so we check the information_schema first.
 */
async function addColumnIfNotExists(db: DBWrapper, table: string, column: string, definition: string) {
  const exists = await db.get(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, table, column]
  );
  if (exists.count === 0) {
    await db.pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  → Added column '${column}' to '${table}'`);
  }
}
