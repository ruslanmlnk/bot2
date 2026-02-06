import type { Context } from "grammy";
import { getMainKeyboard, backKeyboard } from "../ui/keyboards.js";
import { getCourse } from "../services/course.service.js";
import { WAYFORPAY_MERCHANT_ACCOUNT } from "../config/env.js";
import { getWayForPayPaymentUrl } from "../services/wayforpay.service.js";
import { InlineKeyboard } from "grammy";
import { MESSAGES, BUTTONS } from "../data.js";
import { createOrder, hasPaidOrder } from "../db/queries/orders.js";
import { getOfferMessage } from "../db/queries/offerMessage.js";
import { upsertUser } from "../services/user.service.js";
import { ADMIN_IDS } from "../config/env.js";
import { sendProductDelivery } from "../services/admin/product.delivery.js";

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
            if (payload?.text) {
                await ctx.editMessageText(payload.text, { parse_mode: "Markdown", reply_markup: backKeyboard })
                    .catch(async () => {
                        await ctx.reply(payload.text, { parse_mode: "Markdown", reply_markup: backKeyboard });
                    });
            } else {
                await ctx.reply(MESSAGES.OFFER_NOT_SET, { reply_markup: backKeyboard });
            }
            return;
        }

        if (data === "back_to_main") {
            const userId = ctx.from?.id;
            const isPaid = userId ? await hasPaidOrder(userId) : false;
            await ctx.editMessageText(MESSAGES.CHOOSE_ACTION, {
                reply_markup: getMainKeyboard(ADMIN_IDS.includes(ctx.from?.id || 0), isPaid),
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

            if (await hasPaidOrder(userId)) {
                const kb = new InlineKeyboard()
                    .text(BUTTONS.BUY_RESEND, "course_resend")
                    .row()
                    .text(BUTTONS.BACK, "back_to_main");
                await ctx.editMessageText(MESSAGES.PAYMENT_ALREADY, {
                    parse_mode: "Markdown",
                    reply_markup: kb,
                }).catch(() => { });
                return;
            }

            if (!WAYFORPAY_MERCHANT_ACCOUNT) {
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

            const paymentLink = await getWayForPayPaymentUrl(
                course.price,
                `Оплата курсу - ${ctx.from?.first_name || 'Користувач'}`,
                orderId
            );

            const kb = new InlineKeyboard()
                .url(BUTTONS.WAYFORPAY_PAY, paymentLink)
                .row()
                .text(BUTTONS.BACK, "back_to_main");

            await ctx.editMessageText(MESSAGES.PAYMENT_DESC(course.price), {
                parse_mode: "Markdown",
                reply_markup: kb,
            }).catch(() => { });

        } else if (data === "course_resend") {
            const userId = ctx.from?.id;
            if (!userId) return;
            if (!(await hasPaidOrder(userId))) {
                await ctx.answerCallbackQuery({ text: "Оплата не знайдена." }).catch(() => { });
                return;
            }
            await sendProductDelivery(ctx.api, userId);
            await ctx.reply(MESSAGES.PRODUCT_DELIVERED, { reply_markup: backKeyboard }).catch(() => { });
        }
    }
    catch (e) {
        console.error("Callback handler error:", e);
        await ctx.reply(MESSAGES.ERROR_GENERAL, { reply_markup: backKeyboard }).catch(() => { });
    }
}

