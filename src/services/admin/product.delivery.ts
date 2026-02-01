import type { Api } from "grammy";
import { listProductMessageContents } from "../../db/queries/productMessages.js";

function normalizePayload(value: any) {
    if (!value) return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return { text: value };
        }
    }
    return value;
}

export async function sendProductDelivery(api: Api, targetId: number) {
    const messages = await listProductMessageContents();
    for (let i = 0; i < messages.length; i++) {
        const payload = normalizePayload(messages[i].content);
        if (!payload) continue;
        if (payload.chat_id && payload.message_id) {
            await api.copyMessage(targetId, payload.chat_id, payload.message_id);
        } else if (payload.text) {
            await api.sendMessage(targetId, payload.text, { parse_mode: "Markdown" });
        }
    }
}