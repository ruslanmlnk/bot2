import { Bot } from "grammy";
import { BOT_API_KEY } from "./config/env.js";
import { startHandler } from "./handlers/start.handler.js";
import { callbackHandler } from "./handlers/callbacks.handler.js"; // Wait, I'll use .js in imports because of NodeNext
import { adminHandler, adminCallback, adminMessageHandler } from "./handlers/admin.handler.js";

// Note: Using .js extensions for imports as required by NodeNext module resolution
// although the files are .ts. The compiler will handle this.

export const bot = new Bot(BOT_API_KEY);

bot.catch((err) => {
    console.error("Bot error:", err.error);
});

bot.command("start", startHandler);
bot.command("admin", adminHandler);

bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith("admin_") || data.startsWith("admin_cancel_")) {
        await adminCallback(ctx);
    } else {
        await callbackHandler(ctx);
    }
});

bot.on("message", adminMessageHandler);

// Handle successful payments
bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    console.log("Payment successful:", payment);

    // Here you would record the order in DB
    // db.prepare(...).run(...)

    await ctx.reply("✅ Дякуємо! Оплата пройшла успішно. Тепер вам доступний курс.");
});
