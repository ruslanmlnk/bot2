import { bot } from "./bot.js";
import { initDb } from "./db/index.js";
import { startServer } from "./server.js";
import { startBroadcastScheduler } from "./services/admin/broadcast.scheduler.js";

async function main() {
    await initDb();
    startServer();
    startBroadcastScheduler();
    const me = await bot.api.getMe();
    console.log(`Bot @${me.username} is running...`);
    bot.start();
}

main().catch(err => {
    console.error("Failed to start bot:", err);
});
