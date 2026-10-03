-- Element TD 3D: ผู้เล่น, session, รอบเล่น และผลเกม
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Google sub
  name TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- รอบเล่น: สร้างตอนเริ่มเกม (เฉพาะผู้ที่ล็อกอิน) ใช้ส่งผลได้รอบละหนึ่งแถว
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  map TEXT NOT NULL,
  diff TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  version TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, started_at);

-- ผลเกม: หนึ่งแถวต่อรอบเล่น (ถ้าส่งซ้ำเก็บคะแนนที่สูงกว่า เช่น เล่นต่อโหมดไม่รู้จบ)
CREATE TABLE IF NOT EXISTS games (
  run_id TEXT PRIMARY KEY REFERENCES runs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  map TEXT NOT NULL,
  diff TEXT NOT NULL,
  score INTEGER NOT NULL,
  cleared INTEGER NOT NULL,
  lives INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  won INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL,
  version TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_games_map_score ON games(map, score DESC);
CREATE INDEX IF NOT EXISTS idx_games_user_time ON games(user_id, created_at DESC);
