import db from "../../db/index.js";
import { Broadcast, BroadcastMessage } from "../../types/index.js";

export const BroadcastService = {
    async getAll(): Promise<Broadcast[]> {
        const res = await db.query('SELECT * FROM broadcasts ORDER BY created_at DESC');
        return res.rows;
    },

    async getById(id: number): Promise<Broadcast | null> {
        const res = await db.query('SELECT * FROM broadcasts WHERE id = $1', [id]);
        return res.rows[0] || null;
    },

    async create(name: string): Promise<Broadcast> {
        const res = await db.query('INSERT INTO broadcasts (name) VALUES ($1) RETURNING *', [name]);
        return res.rows[0];
    },

    async rename(id: number, name: string) {
        return db.query('UPDATE broadcasts SET name = $1 WHERE id = $2', [name, id]);
    },

    async delete(id: number) {
        return db.query('DELETE FROM broadcasts WHERE id = $1', [id]);
    },

    async getMessages(broadcastId: number): Promise<BroadcastMessage[]> {
        const res = await db.query('SELECT * FROM broadcast_messages WHERE broadcast_id = $1 ORDER BY sort_order ASC', [broadcastId]);
        return res.rows;
    },

    async addMessage(broadcastId: number, payload: any) {
        return db.query(
            'INSERT INTO broadcast_messages (broadcast_id, message_payload, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM broadcast_messages WHERE broadcast_id = $1))',
            [broadcastId, JSON.stringify(payload)]
        );
    },

    async deleteMessage(messageId: number) {
        return db.query('DELETE FROM broadcast_messages WHERE id = $1', [messageId]);
    }
};
