const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// יצירת דאטהבייס
const dbPath = path.join(__dirname, 'quotes.db');
const db = new sqlite3.Database(dbPath);

// יצירת טבלאות
db.serialize(() => {
  // טבלת פריטים (מחירון)
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // טבלת כינויים
  db.run(`CREATE TABLE IF NOT EXISTS aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price_override REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // טבלת לקוחות
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    company_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // טבלת הצעות מחיר
  db.run(`CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    event_name TEXT,
    event_date TEXT,
    event_hours TEXT,
    special_notes TEXT,
    discount_percent REAL DEFAULT 0,
    total_before_discount REAL,
    discount_amount REAL,
    total_after_discount REAL,
    vat_amount REAL,
    final_total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id)
  )`);

  // טבלת פריטי הצעה
  db.run(`CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    item_name TEXT NOT NULL,
    item_description TEXT,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes (id)
  )`);
});

// פונקציות עזר
const dbFunctions = {
  // הוספת פריט למחירון
  addItem: (name, description, price) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO items (name, description, price) VALUES (?, ?, ?)",
        [name, description, price],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  // קבלת כל הפריטים
  getAllItems: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM items ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // הוספת כינוי
  addAlias: (alias, itemName, priceOverride = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO aliases (alias, item_name, price_override) VALUES (?, ?, ?)",
        [alias, itemName, priceOverride],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  // קבלת כל הכינויים
  getAllAliases: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM aliases ORDER BY alias", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // הוספת לקוח
  addClient: (name, phone, company, companyId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO clients (name, phone, company, company_id) VALUES (?, ?, ?, ?)",
        [name, phone, company, companyId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  // קבלת כל הלקוחות
  getAllClients: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM clients ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // שמירת הצעת מחיר
  saveQuote: (quoteData) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO quotes (client_id, event_name, event_date, event_hours, special_notes, 
         discount_percent, total_before_discount, discount_amount, total_after_discount, 
         vat_amount, final_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quoteData.client_id, quoteData.event_name, quoteData.event_date,
          quoteData.event_hours, quoteData.special_notes, quoteData.discount_percent,
          quoteData.total_before_discount, quoteData.discount_amount,
          quoteData.total_after_discount, quoteData.vat_amount, quoteData.final_total
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  },

  // שמירת פריטי הצעה
  saveQuoteItems: (quoteId, items) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        "INSERT INTO quote_items (quote_id, item_name, item_description, unit_price, quantity, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      
      items.forEach(item => {
        stmt.run([quoteId, item.name, item.description, item.unit_price, item.quantity, item.discount, item.total]);
      });
      
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve(quoteId);
      });
    });
  },

  // קבלת כל הצעות המחיר
  getAllQuotes: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT q.*, c.name as client_name, c.company as client_company
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        ORDER BY q.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // קבלת הצעת מחיר לפי ID
  getQuoteById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT q.*, c.name as client_name, c.phone as client_phone, 
               c.company as client_company, c.company_id as client_company_id
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // קבלת פריטי הצעת מחיר
  getQuoteItems: (quoteId) => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM quote_items WHERE quote_id = ?",
        [quoteId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
};

module.exports = { db, dbFunctions };

