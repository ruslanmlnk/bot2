import { bot } from "../../bot.js";
import {
    claimScheduledBroadcast,
    listDueScheduledBroadcasts
} from "../../db/queries/broadcasts.js";
import { sendBroadcastById } from "./broadcast.sender.js";

const POLL_INTERVAL_MS = 30_000;
let isRunning = false;
let started = false;

async function tick() {
    if (isRunning) return;
    isRunning = true;
    try {
        const due = await listDueScheduledBroadcasts(5);
        for (const bc of due) {
            const claimed = await claimScheduledBroadcast(bc.id);
            if (!claimed) continue;
            await sendBroadcastById({
                broadcastId: bc.id,
                api: bot.api,
                skipStatusUpdate: true
            });
        }
    } catch (e) {
        console.error("Broadcast scheduler error:", e);
    } finally {
        isRunning = false;
    }
}

export function startBroadcastScheduler() {
    if (started) return;
    started = true;
    console.log("Broadcast scheduler started.");
    tick().catch(() => { });
    setInterval(() => {
        tick().catch(() => { });
    }, POLL_INTERVAL_MS);
}
