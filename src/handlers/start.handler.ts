import type { Context } from "grammy";
import { getMainKeyboard } from "../ui/keyboards.js";
import { upsertUser } from "../services/user.service.js";
import { ADMIN_IDS } from "../config/env.js";
import { listWelcomeMessageContents } from "../db/queries/welcomeMessages.js";
import { MESSAGES } from "../data.js";

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

export async function startHandler(ctx: Context) {
    try {
        const user = ctx.from;
        const ref_id = typeof ctx.match === "string" ? ctx.match : ctx.match?.[0];
        const isPaymentReturn = typeof ref_id === "string" && ref_id.startsWith("payment_");

        if (isPaymentReturn) {
            if (ctx.message?.message_id) {
                await ctx.deleteMessage().catch(() => { });
            }
            return;
        }
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
    const messages = await listWelcomeMessageContents();

    for (let i = 0; i < messages.length; i++) {
        const isLast = i === messages.length - 1;
        const targetId = ctx.from?.id;
        if (!targetId) break;
        const payload = normalizePayload(messages[i].content);

        try {
            if (payload?.chat_id && payload?.message_id) {
                // Use copyMessage for true cloning of any message type
                await ctx.api.copyMessage(targetId, payload.chat_id, payload.message_id, {
                    reply_markup: isLast ? getMainKeyboard(ADMIN_IDS.includes(targetId)) : undefined
                });
            } else if (payload?.text) {
                // Legacy support for text-only messages
                await ctx.reply(payload.text, {
                    parse_mode: "Markdown",
                    reply_markup: isLast ? getMainKeyboard(ADMIN_IDS.includes(targetId)) : undefined
                });
            }
        } catch (e) {
            console.error("Failed to send welcome message:", e);
        }

        if (isLast && user && ADMIN_IDS.includes(user.id)) {
            await ctx.reply(`🛠 *Адмін доступ активовано.* /admin`, { parse_mode: "Markdown" });
        }
    }
    } catch (e) {
        console.error("Start handler error:", e);
        await ctx.reply(MESSAGES.ERROR_GENERAL).catch(() => { });
    }
}

