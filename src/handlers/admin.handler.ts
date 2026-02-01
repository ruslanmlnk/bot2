import type { Context } from "grammy";
import {
    adminKeyboard,
    adminContentKeyboard,
    adminWelcomeKeyboard,
    adminProductKeyboard,
    getBroadcastsKeyboard,
    getSingleBroadcastKeyboard,
    getCancelAdminKeyboard
} from "../ui/keyboards.js";
import { ADMIN_IDS, BOT_USERNAME } from "../config/env.js";
import { getCourse, updateCourse } from "../services/course.service.js";
import { InlineKeyboard } from "grammy";
import { handleBroadcastCallback } from "./admin/broadcast.handler.js";
import { BroadcastService } from "../services/admin/broadcast.service.js";
import { MESSAGES } from "../data.js";
import {
    addWelcomeMessage,
    deleteWelcomeMessage,
    listWelcomeMessageIds,
    updateWelcomeMessage
} from "../db/queries/welcomeMessages.js";
import { countUsers } from "../db/queries/users.js";
import { countOrders, countPaidOrders, countPendingOrders, deletePaidOrdersByUser, listPaidBuyers, sumSuccessOrders } from "../db/queries/orders.js";
import { setOfferMessage } from "../db/queries/offerMessage.js";
import { addProductMessage, deleteProductMessage, listProductMessageIds } from "../db/queries/productMessages.js";

export const adminState = new Map<number, { action: string, data?: any }>();

async function safeEditText(ctx: Context, text: string, opts?: Parameters<Context["editMessageText"]>[1]) {
    try {
        await ctx.editMessageText(text, opts as any);
    } catch {
        await ctx.reply(text, opts as any).catch(() => { });
    }
}

function formatDateTime(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseScheduleInput(input: string): Date | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime()) && (trimmed.includes("T") || trimmed.endsWith("Z"))) {
        return iso;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!match) return null;
    const [, y, m, d, hh, mm, ss] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

export async function adminHandler(ctx: Context) {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) return;
    await ctx.reply(MESSAGES.ADMIN_PANEL_TITLE, { parse_mode: "Markdown", reply_markup: adminKeyboard });
}

export async function adminCallback(ctx: Context) {
    const data = ctx.callbackQuery?.data;
    if (!data || !ctx.from || !ADMIN_IDS.includes(ctx.from.id)) return;
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery().catch(() => { });

    if (data.startsWith("admin_bc_")) return handleBroadcastCallback(ctx, data);

    if (data === "admin_main") {
        await safeEditText(ctx, MESSAGES.ADMIN_PANEL_TITLE, { parse_mode: "Markdown", reply_markup: adminKeyboard });
    } else if (data === "admin_content_menu") {
        await safeEditText(ctx, MESSAGES.CONTENT_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: adminContentKeyboard });
    } else if (data === "admin_welcome_menu") {
        await safeEditText(ctx, MESSAGES.WELCOME_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: adminWelcomeKeyboard });
    } else if (data === "admin_broadcast_menu") {
        const broadcasts = await BroadcastService.getAll();
        await safeEditText(ctx, MESSAGES.BROADCAST_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: getBroadcastsKeyboard(broadcasts) });
    }
    else if (data === "admin_ref_link") {
        if (!BOT_USERNAME) {
            await safeEditText(ctx, MESSAGES.REFERRAL_LINK_EMPTY, { reply_markup: adminKeyboard });
            return;
        }
        const link = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        const html = `<b>Реферальне посилання</b>\n\n<a href="${link}">Відкрити</a>\n${link}`;
        await safeEditText(ctx, html, { parse_mode: "HTML", reply_markup: adminKeyboard });
    }

    else if (data === "admin_product_menu") {
        await safeEditText(ctx, "📦 *Продукт*", { parse_mode: "Markdown", reply_markup: adminProductKeyboard });
    }

    else if (data === "admin_edit_offer") {
        adminState.set(userId, { action: "offer_set" });
        await safeEditText(ctx, MESSAGES.PROMPT_OFFER_MSG, { reply_markup: getCancelAdminKeyboard("offer") });
    }

    else if (data.startsWith("admin_edit_")) {
        const field = data.replace("admin_edit_", "");
        adminState.set(userId, { action: `edit_${field}` });
        let prompt = "";
        if (field === "description") prompt = MESSAGES.PROMPT_DESCRIPTION;
        if (field === "program") prompt = MESSAGES.PROMPT_PROGRAM;
        if (field === "reviews") prompt = MESSAGES.PROMPT_REVIEWS;
        if (field === "price") prompt = MESSAGES.PROMPT_PRICE;
        if (field === "success_message") prompt = MESSAGES.PROMPT_SUCCESS_MSG;
        await safeEditText(ctx, `${MESSAGES.EDIT_TITLE}\n\n${prompt}`, { parse_mode: "Markdown", reply_markup: getCancelAdminKeyboard("menu") });
    }

    else if (data === "admin_welcome_add") {
        adminState.set(userId, { action: "welcome_add" });
        await safeEditText(ctx, MESSAGES.PROMPT_BC_MSG, { reply_markup: getCancelAdminKeyboard("welcome") });
    } else if (data === "admin_welcome_list") {
        const list = await listWelcomeMessageIds();
        const kb = new InlineKeyboard();
        list.forEach((row, index) => {
            kb.text(`📝 #${index + 1}`, `admin_welcome_edit_${row.id}`);
            kb.text(`🗑`, `admin_welcome_del_${row.id}`);
            kb.row();
        });
        kb.text(MESSAGES.BACK, "admin_welcome_menu");
        await safeEditText(ctx, MESSAGES.WELCOME_LIST_TITLE + "\n\nВиберіть повідомлення для редагування або видалення.", { parse_mode: "Markdown", reply_markup: kb });
    } else if (data.startsWith("admin_welcome_edit_")) {
        const id = data.replace("admin_welcome_edit_", "");
        adminState.set(userId, { action: `welcome_edit_${id}` });
        await safeEditText(ctx, MESSAGES.PROMPT_BC_MSG, { reply_markup: getCancelAdminKeyboard("welcome_list") });
    } else if (data.startsWith("admin_welcome_del_")) {
        const id = data.replace("admin_welcome_del_", "");
        await deleteWelcomeMessage(id);
        const baseCallback = ctx.callbackQuery
            ? { ...ctx.callbackQuery, data: "admin_welcome_list" }
            : ({ data: "admin_welcome_list" } as any);
        return adminCallback(Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
            callbackQuery: baseCallback
        }));
    }

    else if (data === "admin_product_add") {
        adminState.set(userId, { action: "product_add" });
        await safeEditText(ctx, MESSAGES.PROMPT_PRODUCT_MSG, { reply_markup: getCancelAdminKeyboard("product") });
    } else if (data === "admin_product_list") {
        const list = await listProductMessageIds();
        const kb = new InlineKeyboard();
        list.forEach((row, index) => {
            kb.text(`🗑 #${index + 1}`, `admin_product_del_${row.id}`);
            kb.row();
        });
        kb.text(MESSAGES.BACK, "admin_product_menu");
        await safeEditText(ctx, "📦 *Список продукту:*", { parse_mode: "Markdown", reply_markup: kb });
    } else if (data.startsWith("admin_product_del_")) {
        const id = data.replace("admin_product_del_", "");
        await deleteProductMessage(id);
        const baseCallback = ctx.callbackQuery
            ? { ...ctx.callbackQuery, data: "admin_product_list" }
            : ({ data: "admin_product_list" } as any);
        return adminCallback(Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
            callbackQuery: baseCallback
        }));
    }
    else if (data === "admin_stats") {
        const u = await countUsers();
        const pending = await countPendingOrders();
        const paid = await countPaidOrders();
        const s = await sumSuccessOrders();
        const kb = new InlineKeyboard()
            .text("🧾 Покупці", "admin_stats_buyers")
            .row()
            .text(MESSAGES.BACK, "admin_main");
        await safeEditText(ctx, MESSAGES.STATS_BODY(u, pending, paid, s), { parse_mode: "Markdown", reply_markup: kb });
    }
else if (data === "admin_stats_buyers") {
        const buyers = await listPaidBuyers(50);
        if (buyers.length === 0) {
            return safeEditText(ctx, "Покупців ще немає.", { reply_markup: adminKeyboard });
        }
        const lines = buyers.map((b, idx) => {
            const name = [b.first_name, b.last_name].filter(Boolean).join(" ").trim();
            const handle = b.username ? `@${b.username}` : "";
            const title = name || handle || `ID ${b.user_id}`;
            const amount = b.amount ? `${b.amount} грн` : "";
            return `${idx + 1}. ${title}${amount ? ` — ${amount}` : ""}`;
        });
        const text = `🧾 *Покупці (останні 50):*\n\n${lines.join("\n")}`;
        const kb = new InlineKeyboard();
        buyers.forEach(b => {
            kb.text(`🗑 ${b.user_id}`, `admin_stats_buyer_del_${b.user_id}`).row();
        });
        kb.text(MESSAGES.BACK, "admin_stats");
        await safeEditText(ctx, text, { parse_mode: "Markdown", reply_markup: kb });
    }
    else if (data.startsWith("admin_stats_buyer_del_")) {
        const targetId = parseInt(data.replace("admin_stats_buyer_del_", ""), 10);
        if (!Number.isNaN(targetId)) {
            await deletePaidOrdersByUser(targetId);
        }
        const baseCallback = ctx.callbackQuery
            ? { ...ctx.callbackQuery, data: "admin_stats_buyers" }
            : ({ data: "admin_stats_buyers" } as any);
        return adminCallback(Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
            callbackQuery: baseCallback
        }));
    }

    else if (data.startsWith("admin_cancel_")) {
        const target = data.replace("admin_cancel_", "");
        adminState.delete(userId);

        const fakeCtx = (targetData: string) => {
            const baseCallback = ctx.callbackQuery
                ? { ...ctx.callbackQuery, data: targetData }
                : ({ data: targetData } as any);
            return Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
                callbackQuery: baseCallback
            });
        };

        if (target === "bc_menu") {
            return adminCallback(fakeCtx("admin_broadcast_menu"));
        }
        if (target.startsWith("bc_view_")) {
            return adminCallback(fakeCtx(`admin_${target}`));
        }
        if (target === "welcome_list") {
            return adminCallback(fakeCtx("admin_welcome_list"));
        }
        if (target === "welcome") {
            return adminCallback(fakeCtx("admin_welcome_menu"));
        }
        if (target === "menu") {
            return adminCallback(fakeCtx("admin_content_menu"));
        }
        if (target === "offer") {
            return adminCallback(fakeCtx("admin_content_menu"));
        }
        if (target === "product") {
            return adminCallback(fakeCtx("admin_product_menu"));
        }

        await safeEditText(ctx, MESSAGES.ADMIN_PANEL_TITLE, { reply_markup: adminKeyboard });
    }
}

export async function adminMessageHandler(ctx: Context) {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) return;
    const userId = ctx.from.id;
    const state = adminState.get(userId);
    if (!state) return;

    try {
        if (state.action === "bc_new") {
            const name = ctx.message?.text || "Без назви";
            await BroadcastService.create(name);
            adminState.delete(userId);
            const broadcasts = await BroadcastService.getAll();
            await ctx.reply(MESSAGES.BROADCAST_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: getBroadcastsKeyboard(broadcasts) });
        }
        else if (state.action.startsWith("bc_rename_")) {
            const id = parseInt(state.action.replace("bc_rename_", ""));
            const name = ctx.message?.text || "Без назви";
            await BroadcastService.rename(id, name);
            adminState.delete(userId);
            const bc = await BroadcastService.getById(id);
            const msgs = await BroadcastService.getMessages(id);
            const scheduleText = formatDateTime(bc?.scheduled_at);
            await ctx.reply(MESSAGES.BROADCAST_DETAILS(bc!.name, msgs.length, scheduleText), {
                parse_mode: "Markdown", reply_markup: getSingleBroadcastKeyboard(id, bc!.status, msgs.length, bc?.scheduled_at)
            });
        }
        else if (state.action.startsWith("bc_add_msg_")) {
            const id = parseInt(state.action.replace("bc_add_msg_", ""));
            if (ctx.message) {
                await BroadcastService.addMessage(id, { chat_id: ctx.chat!.id, message_id: ctx.message.message_id });
                adminState.delete(userId);
                const bc = await BroadcastService.getById(id);
                const msgs = await BroadcastService.getMessages(id);
                const scheduleText = formatDateTime(bc?.scheduled_at);
                await ctx.reply(MESSAGES.SUCCESS_SAVE + "\n\n" + MESSAGES.BROADCAST_DETAILS(bc!.name, msgs.length, scheduleText), {
                    parse_mode: "Markdown", reply_markup: getSingleBroadcastKeyboard(id, bc!.status, msgs.length, bc?.scheduled_at)
                });
            }
        }
        else if (state.action.startsWith("bc_schedule_")) {
            const id = parseInt(state.action.replace("bc_schedule_", ""));
            const input = ctx.message?.text || "";
            const date = parseScheduleInput(input);
            if (!date) {
                await ctx.reply(MESSAGES.ERROR_BC_SCHEDULE_FORMAT, { reply_markup: getCancelAdminKeyboard(`bc_view_${id}`) });
                return;
            }
            if (date.getTime() <= Date.now()) {
                await ctx.reply(MESSAGES.ERROR_BC_SCHEDULE_PAST, { reply_markup: getCancelAdminKeyboard(`bc_view_${id}`) });
                return;
            }
            await BroadcastService.schedule(id, date);
            adminState.delete(userId);
            const bc = await BroadcastService.getById(id);
            const msgs = await BroadcastService.getMessages(id);
            const scheduleText = formatDateTime(bc?.scheduled_at);
            await ctx.reply(MESSAGES.BROADCAST_DETAILS(bc!.name, msgs.length, scheduleText), {
                parse_mode: "Markdown", reply_markup: getSingleBroadcastKeyboard(id, bc!.status, msgs.length, bc?.scheduled_at)
            });
        }
        else if (state.action.startsWith("edit_")) {
            const field = state.action.replace("edit_", "");
            const val = field === "price" ? parseInt(ctx.message?.text || "0") : ctx.message?.text;
            await updateCourse(field as any, val as any);
            adminState.delete(userId);
            await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminContentKeyboard });
        } else if (state.action === "offer_set") {
            if (ctx.message) {
                const text = ctx.message.text || ctx.message.caption;
                if (!text) {
                    await ctx.reply("Оферта має бути текстом. Надішліть текстове повідомлення.", {
                        reply_markup: getCancelAdminKeyboard("offer")
                    });
                    return;
                }
                await setOfferMessage({ text });
                adminState.delete(userId);
                await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminContentKeyboard });
            }
        } else if (state.action === "welcome_add") {
            if (ctx.message) {
                const payload = { chat_id: ctx.chat!.id, message_id: ctx.message.message_id };
                await addWelcomeMessage(payload);
                adminState.delete(userId);
                await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminWelcomeKeyboard });
            }
        } else if (state.action === "product_add") {
            if (ctx.message) {
                const payload = { chat_id: ctx.chat!.id, message_id: ctx.message.message_id };
                await addProductMessage(payload);
                adminState.delete(userId);
                await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminProductKeyboard });
            }
        } else if (state.action.startsWith("welcome_edit_")) {
            if (ctx.message) {
                const id = state.action.replace("welcome_edit_", "");
                const payload = { chat_id: ctx.chat!.id, message_id: ctx.message.message_id };
                await updateWelcomeMessage(id, payload);
                adminState.delete(userId);

                // Fetch updated list to show immediately
                const list = await listWelcomeMessageIds();
                const kb = new InlineKeyboard();
                list.forEach((row, index) => {
                    kb.text(`📝 #${index + 1}`, `admin_welcome_edit_${row.id}`);
                    kb.text(`🗑`, `admin_welcome_del_${row.id}`);
                    kb.row();
                });
                kb.text(MESSAGES.BACK, "admin_welcome_menu");
                await ctx.reply(MESSAGES.SUCCESS_SAVE + "\n\n" + MESSAGES.WELCOME_LIST_TITLE, { reply_markup: kb });
            }
        }
    } catch (e) {
        console.error(e);
        await ctx.reply(MESSAGES.ERROR_GENERAL);
    }
}
