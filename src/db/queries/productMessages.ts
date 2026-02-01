import db from "../index.js";

export async function listProductMessageIds() {
    const res = await db.query("SELECT id FROM product_messages ORDER BY sort_order ASC");
    return res.rows as Array<{ id: number }>;
}

export async function listProductMessageContents() {
    const res = await db.query("SELECT content FROM product_messages ORDER BY sort_order ASC");
    return res.rows as Array<{ content: any }>;
}

export function addProductMessage(payload: unknown) {
    return db.query(
        "INSERT INTO product_messages (content, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM product_messages))",
        [JSON.stringify(payload)]
    );
}

export function deleteProductMessage(id: number | string) {
    return db.query("DELETE FROM product_messages WHERE id = $1", [id]);
}