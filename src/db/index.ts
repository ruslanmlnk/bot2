import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
};

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      language_code TEXT,
      ref_id TEXT,
      is_blocked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS course_data (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      description TEXT,
      program TEXT,
      reviews TEXT,
      price INTEGER DEFAULT 0,
      success_message TEXT DEFAULT 'Дякуємо за покупку! 🎉'
    );

    ALTER TABLE course_data ADD COLUMN IF NOT EXISTS success_message TEXT DEFAULT 'Дякуємо за покупку! 🎉';

    CREATE TABLE IF NOT EXISTS welcome_messages (
      id SERIAL PRIMARY KEY,
      content JSONB NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Robust migration for welcome_messages
    DO $$ 
    BEGIN 
      -- If content is TEXT, convert to JSONB by wrapping it
      IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'welcome_messages' AND column_name = 'content') = 'text' THEN
        ALTER TABLE welcome_messages ALTER COLUMN content TYPE JSONB USING jsonb_build_object('text', content);
      END IF;
    END $$;
    
    -- Safety check: ensure all JSONB content is at least an object or string
    -- If somehow invalid data got in (unlikely but safe to check)
    UPDATE welcome_messages SET content = jsonb_build_object('text', content::text) 
    WHERE jsonb_typeof(content) != 'object' AND jsonb_typeof(content) != 'string';

    -- New Broadcast Tables
    CREATE TABLE IF NOT EXISTS broadcasts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- 'draft', 'sent'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS broadcast_messages (
      id SERIAL PRIMARY KEY,
      broadcast_id INTEGER REFERENCES broadcasts(id) ON DELETE CASCADE,
      message_payload JSONB NOT NULL, -- Full context/message object for copying
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id BIGINT,
      amount INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(telegram_id)
    );

    INSERT INTO course_data (id, description, program, reviews, price)
    VALUES (1, 'Опис курсу...', 'Програма курсу...', 'Відгуки...', 1000)
    ON CONFLICT (id) DO NOTHING;
  `);
}

export default db;
