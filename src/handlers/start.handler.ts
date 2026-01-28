import type { Context } from "grammy";
import { mainKeyboard } from "../ui/keyboards.js";
import { upsertUser } from "../services/user.service.js";
import { ADMIN_IDS } from "../config/env.js";
import db from "../db/index.js";

export async function startHandler(ctx: Context) {
    const ref_id = typeof ctx.match === "string" ? ctx.match : ctx.match?.[0];
    const user = ctx.from;

    if (user) {
        await upsertUser({
            telegramId: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            languageCode: user.language_code,
            refId: ref_id,
        });
    }

    // Fetch all welcome messages
    const messages = await db.query('SELECT content FROM welcome_messages ORDER BY sort_order ASC');

    for (let i = 0; i < messages.rows.length; i++) {
        const isLast = i === messages.rows.length - 1;
        const targetId = ctx.from!.id;
        const payload = messages.rows[i].content;

        try {
            if (payload.chat_id && payload.message_id) {
                // Use copyMessage for true cloning of any message type
                await ctx.api.copyMessage(targetId, payload.chat_id, payload.message_id, {
                    reply_markup: isLast ? mainKeyboard : undefined
                });
            } else if (payload.text) {
                // Legacy support for text-only messages
                await ctx.reply(payload.text, {
                    parse_mode: "Markdown",
                    reply_markup: isLast ? mainKeyboard : undefined
                });
            }
        } catch (e) {
            console.error("Failed to send welcome message:", e);
        }

        if (isLast && user && ADMIN_IDS.includes(user.id)) {
            await ctx.reply(`🛠 *Адмін доступ активовано.* /admin`, { parse_mode: "Markdown" });
        }
    }
}
