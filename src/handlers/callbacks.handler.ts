import type { Context } from "grammy";
import { mainKeyboard, backKeyboard } from "../ui/keyboards.js";
import { getCourse } from "../services/course.service.js";
import { LIQPAY_PUBLIC_KEY } from "../config/env.js";
import { generateLiqPayLink } from "../services/liqpay.service.js";
import { InlineKeyboard } from "grammy";
import { MESSAGES, BUTTONS } from "../data.js";
import { createOrder } from "../db/queries/orders.js";

export async function callbackHandler(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    await ctx.answerCallbackQuery().catch(() => { });

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

    } else if (data === "back_to_main") {
        await ctx.editMessageText(MESSAGES.CHOOSE_ACTION, {
            reply_markup: mainKeyboard,
        }).catch(() => { });
    }
}
