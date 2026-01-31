import type { Context } from "grammy";
import { mainKeyboard, backKeyboard } from "../ui/keyboards.js";
import { getCourse } from "../services/course.service.js";
import { LIQPAY_PUBLIC_KEY } from "../config/env.js";
import { generateLiqPayLink } from "../services/liqpay.service.js";
import { InlineKeyboard } from "grammy";
import { MESSAGES, BUTTONS } from "../data.js";
import { createOrder } from "../db/queries/orders.js";
import { getOfferMessage } from "../db/queries/offerMessage.js";
import { upsertUser } from "../services/user.service.js";

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

export async function callbackHandler(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    await ctx.answerCallbackQuery().catch(() => { });

    try {
        if (data === "offer_show") {
            const targetId = ctx.from?.id;
            if (!targetId) return;
            const offer = await getOfferMessage();
            const payload = normalizePayload(offer);
            if (payload?.chat_id && payload?.message_id) {
                await ctx.api.copyMessage(targetId, payload.chat_id, payload.message_id, { reply_markup: backKeyboard });
            } else if (payload?.text) {
                await ctx.reply(payload.text, { parse_mode: "Markdown", reply_markup: backKeyboard });
            } else {
                await ctx.reply(MESSAGES.OFFER_NOT_SET, { reply_markup: backKeyboard });
            }
            return;
        }

        if (data === "back_to_main") {
            await ctx.editMessageText(MESSAGES.CHOOSE_ACTION, {
                reply_markup: mainKeyboard,
            }).catch(() => { });
            return;
        }

        const course = await getCourse();

    if (data === "course_description") {
        await ctx.editMessageText(`📘 *Опис курсу*\n\n${course.description}`, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard,
        }).catch(() => { });
    } else if (data === "course_program") {
        await ctx.editMessageText(`🎯 *Програма курсу*\n\n${course.program}`, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard,
        }).catch(() => { });
    } else if (data === "course_reviews") {
        await ctx.editMessageText(`⭐ *Відгуки*\n\n${course.reviews}`, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard,
        }).catch(() => { });
    } else if (data === "course_buy") {
        const userId = ctx.from?.id;
        if (!userId) return;

        if (!LIQPAY_PUBLIC_KEY) {
            await ctx.editMessageText(
                `${BUTTONS.COURSE_BUY}\n\nЦіна: ${course.price} грн.\n\n${MESSAGES.PAYMENT_UNAVAILABLE}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: backKeyboard,
                }
            ).catch(() => { });
            return;
        }

        if (ctx.from) {
            await upsertUser({
                telegramId: ctx.from.id,
                username: ctx.from.username,
                firstName: ctx.from.first_name,
                lastName: ctx.from.last_name,
                languageCode: ctx.from.language_code,
            });
        }

        const orderId = `order_${userId}_${Date.now()}`;

        await createOrder(orderId, userId, course.price, "pending");

        const paymentLink = generateLiqPayLink(
            course.price,
            `Оплата курсу - ${ctx.from?.first_name || 'Користувач'}`,
            orderId
        );

        const kb = new InlineKeyboard()
            .url(BUTTONS.LIQPAY_PAY, paymentLink)
            .row()
            .text(BUTTONS.BACK, "back_to_main");

        await ctx.editMessageText(MESSAGES.PAYMENT_DESC(course.price), {
            parse_mode: "Markdown",
            reply_markup: kb,
        }).catch(() => { });

    }
    }
    catch (e) {
        console.error("Callback handler error:", e);
        await ctx.reply(MESSAGES.ERROR_GENERAL, { reply_markup: backKeyboard }).catch(() => { });
    }
}

