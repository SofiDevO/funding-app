CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    product_url TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    rewards TEXT,
    status TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'draft', 'completed','paused')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
