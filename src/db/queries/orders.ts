import db from "../index.js";

export function createOrder(orderId: string, userId: number, amount: number, status: string = "pending") {
    return db.query(
        "INSERT INTO orders (id, user_id, amount, status) VALUES ($1, $2, $3, $4)",
        [orderId, userId, amount, status]
    );
}

export async function getOrderStatus(orderId: string): Promise<string | null> {
    const res = await db.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    return res.rows[0]?.status || null;
}

export function updateOrderStatus(orderId: string, status: string) {
    return db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, orderId]);
}

export async function countOrders(): Promise<number> {
    const res = await db.query("SELECT COUNT(*) as count FROM orders");
    return Number(res.rows[0]?.count || 0);
}

export async function countPendingOrders(): Promise<number> {
    const res = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    return Number(res.rows[0]?.count || 0);
}

export async function countPaidOrders(): Promise<number> {
    const res = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'success'");
    return Number(res.rows[0]?.count || 0);
}

export async function sumSuccessOrders(): Promise<number> {
    const res = await db.query("SELECT SUM(amount) as sum FROM orders WHERE status = 'success'");
    return Number(res.rows[0]?.sum || 0);
}

export async function listPaidBuyers(limit: number = 50) {
    const res = await db.query(
        `SELECT o.user_id, u.username, u.first_name, u.last_name, u.ref_id, o.amount, o.created_at
         FROM orders o
         LEFT JOIN users u ON u.telegram_id = o.user_id
         WHERE o.status = 'success'
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [limit]
    );
    return res.rows as Array<{
        user_id: number;
        username?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        ref_id?: string | null;
        amount?: number | null;
        created_at?: Date;
    }>;
}

export async function hasPaidOrder(userId: number): Promise<boolean> {
    const res = await db.query(
        "SELECT 1 FROM orders WHERE user_id = $1 AND status = 'success' LIMIT 1",
        [userId]
    );
    return (res.rowCount || 0) > 0;
}

export function deletePaidOrdersByUser(userId: number) {
    return db.query("DELETE FROM orders WHERE user_id = $1 AND status = 'success'", [userId]);
}

export async function listPaidBuyersByRefId(refId: string, limit: number = 50) {
    const res = await db.query(
        `SELECT o.user_id, u.username, u.first_name, u.last_name, u.ref_id, o.amount, o.created_at
         FROM orders o
         LEFT JOIN users u ON u.telegram_id = o.user_id
         WHERE o.status = 'success' AND u.ref_id = $2
         ORDER BY o.created_at DESC
         LIMIT $1`,
        [limit, refId]
    );
    return res.rows as Array<{
        user_id: number;
        username?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        ref_id?: string | null;
        amount?: number | null;
        created_at?: Date;
    }>;
}
