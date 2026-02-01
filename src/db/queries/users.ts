import db from "../index.js";
import type { User } from "../../types/index.js";

export async function upsertUserRecord(input: {
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

export async function getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    const res = await db.query("SELECT * FROM users WHERE telegram_id = $1", [telegramId]);
    return res.rows[0];
}

export async function listActiveNonAdminUsers(adminIds: number[]) {
    const res = await db.query(
        "SELECT telegram_id FROM users WHERE is_blocked = FALSE AND NOT (telegram_id = ANY($1::BIGINT[]))",
        [adminIds]
    );
    return res.rows as Array<{ telegram_id: number }>;
}

export function markUserBlocked(telegramId: number) {
    return db.query("UPDATE users SET is_blocked = TRUE WHERE telegram_id = $1", [telegramId]);
}

export async function countUsers(): Promise<number> {
    const res = await db.query("SELECT COUNT(*) as count FROM users");
    return Number(res.rows[0]?.count || 0);
}

export async function deleteAllUsers() {
    await db.query("DELETE FROM orders");
    await db.query("DELETE FROM users");
}
