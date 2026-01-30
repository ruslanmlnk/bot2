import db from "../index.js";

export async function getOfferMessage() {
    const res = await db.query("SELECT content FROM offer_message WHERE id = 1");
    return res.rows[0]?.content || null;
}

export function setOfferMessage(payload: unknown) {
    return db.query(
        "INSERT INTO offer_message (id, content) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content",
        [JSON.stringify(payload)]
    );
}