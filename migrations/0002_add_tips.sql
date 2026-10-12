CREATE TABLE tips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT NOT NULL,
  price REAL NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE tip_orders (
  id TEXT PRIMARY KEY,
  tip_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity >= 1),
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tip_id) REFERENCES tips(id)
);

CREATE INDEX idx_tips_status ON tips(status);
CREATE INDEX idx_tip_orders_tip_id ON tip_orders(tip_id);
