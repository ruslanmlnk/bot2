import type { Api } from "grammy";
import { ADMIN_IDS } from "../../config/env.js";
import {
    clearBroadcastSchedule,
    getBroadcastById,
    listBroadcastMessages,
    markBroadcastSent,
    updateBroadcastStatus
} from "../../db/queries/broadcasts.js";
import { listActiveNonAdminUsers, markUserBlocked } from "../../db/queries/users.js";

export type BroadcastSendResult = {
    ok: boolean;
    reason?: "not_found" | "no_messages" | "no_users" | "error";
    success: number;
    blocked: number;
    total: number;
};

function normalizePayload(value: any) {
    if (!value) return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    return value;
}

export async function sendBroadcastById(options: {
    broadcastId: number;
    api: Api;
    onProgress?: (sent: number, total: number) => Promise<void> | void;
    skipStatusUpdate?: boolean;
}): Promise<BroadcastSendResult> {
    const { broadcastId, api, onProgress, skipStatusUpdate } = options;

    const bc = await getBroadcastById(broadcastId);
    if (!bc) {
        return { ok: false, reason: "not_found", success: 0, blocked: 0, total: 0 };
    }

    const msgs = await listBroadcastMessages(broadcastId);
    if (msgs.length === 0) {
        await clearBroadcastSchedule(broadcastId);
        return { ok: false, reason: "no_messages", success: 0, blocked: 0, total: 0 };
    }

    if (!skipStatusUpdate) {
        await updateBroadcastStatus(broadcastId, "sending");
    }

    const users = await listActiveNonAdminUsers(ADMIN_IDS);
    if (users.length === 0) {
        await clearBroadcastSchedule(broadcastId);
        return { ok: false, reason: "no_users", success: 0, blocked: 0, total: 0 };
    }

    let successCount = 0;
    let blockCount = 0;

    try {
        if (onProgress) {
            await onProgress(0, users.length);
        }
        for (const user of users) {
            try {
                const targetId = user.telegram_id.toString();
                for (const m of msgs) {
                    const payload = normalizePayload(m.message_payload);
                    if (!payload?.chat_id || !payload?.message_id) continue;
                    await api.copyMessage(targetId, payload.chat_id.toString(), payload.message_id);
                }
                successCount++;
            } catch (e: any) {
                const desc = e?.description || e?.message || "";
                if (desc.includes("blocked") || desc.includes("forbidden")) {
                    blockCount++;
                    await markUserBlocked(user.telegram_id);
                }
            }
            if (onProgress && successCount % 20 === 0) {
                await onProgress(successCount, users.length);
            }
        }

        await markBroadcastSent(broadcastId);

        return {
            ok: true,
            success: successCount,
            blocked: blockCount,
            total: users.length
        };
    } catch (e) {
        console.error("Broadcast send error:", e);
        await clearBroadcastSchedule(broadcastId);
        return { ok: false, reason: "error", success: successCount, blocked: blockCount, total: users.length };
    }
}
