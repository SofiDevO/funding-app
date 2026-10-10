
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  product_url TEXT,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  rewards TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('active', 'draft', 'completed', 'paused')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);


CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  amount REAL NOT NULL,
  message TEXT,
  payment_method TEXT DEFAULT 'lemonsqueezy',
  payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES goals(id)
);



CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_picture TEXT,
  has_donated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);


CREATE TABLE admin (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);


CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_donations_goal_id ON donations(goal_id);
CREATE INDEX idx_donations_message ON donations(id) WHERE message IS NOT NULL;
