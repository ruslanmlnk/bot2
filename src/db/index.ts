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
  console.log('Initializing database...');
  try {
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_id TEXT;

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

      CREATE TABLE IF NOT EXISTS product_messages (
        id SERIAL PRIMARY KEY,
        content JSONB NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offer_message (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        content JSONB
      );

      -- New Broadcast Tables
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
      ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
      ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

      CREATE TABLE IF NOT EXISTS broadcast_messages (
        id SERIAL PRIMARY KEY,
        broadcast_id INTEGER REFERENCES broadcasts(id) ON DELETE CASCADE,
        message_payload JSONB NOT NULL,
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

      CREATE TABLE IF NOT EXISTS referral_links (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        ref_id TEXT UNIQUE NOT NULL,
        creator_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO course_data (id, description, program, reviews, price)
      VALUES (1, 'Опис курсу...', 'Програма курсу...', 'Відгуки...', 1000)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

export default db;
