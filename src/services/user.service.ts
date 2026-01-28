import db from '../db/index.js';

export async function upsertUser(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    refId?: string;
}) {
    const query = `
        INSERT INTO users (telegram_id, username, first_name, last_name, language_code, ref_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(telegram_id) DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            language_code = EXCLUDED.language_code,
            ref_id = COALESCE(users.ref_id, EXCLUDED.ref_id)
    `;

    return db.query(query, [
        input.telegramId,
        input.username || null,
        input.firstName || null,
        input.lastName || null,
        input.languageCode || null,
        input.refId || null
    ]);
}

export async function getUser(telegramId: number) {
    const res = await db.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    return res.rows[0];
}
