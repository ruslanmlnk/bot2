import db from "../index.js";

export async function listWelcomeMessageIds() {
    const res = await db.query("SELECT id FROM welcome_messages ORDER BY sort_order ASC");
    return res.rows as Array<{ id: number }>;
}

export async function listWelcomeMessageContents() {
    const res = await db.query("SELECT content FROM welcome_messages ORDER BY sort_order ASC");
    return res.rows as Array<{ content: any }>;
}

export function addWelcomeMessage(payload: unknown) {
    return db.query(
        "INSERT INTO welcome_messages (content, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM welcome_messages))",
        [JSON.stringify(payload)]
    );
}

export function updateWelcomeMessage(id: number | string, payload: unknown) {
    return db.query("UPDATE welcome_messages SET content = $1 WHERE id = $2", [JSON.stringify(payload), id]);
}

export function deleteWelcomeMessage(id: number | string) {
    return db.query("DELETE FROM welcome_messages WHERE id = $1", [id]);
}