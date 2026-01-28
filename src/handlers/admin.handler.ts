import type { Context } from "grammy";
import {
    adminKeyboard,
    adminContentKeyboard,
    adminWelcomeKeyboard,
    getBroadcastsKeyboard,
    getSingleBroadcastKeyboard,
    getCancelAdminKeyboard
} from "../ui/keyboards.js";
import { ADMIN_IDS } from "../config/env.js";
import { getCourse, updateCourse } from "../services/course.service.js";
import db from "../db/index.js";
import { InlineKeyboard } from "grammy";
import { handleBroadcastCallback } from "./admin/broadcast.handler.js";
import { BroadcastService } from "../services/admin/broadcast.service.js";
import { MESSAGES } from "../data.js";

export const adminState = new Map<number, { action: string, data?: any }>();

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
        await ctx.editMessageText(MESSAGES.ADMIN_PANEL_TITLE, { parse_mode: "Markdown", reply_markup: adminKeyboard });
    } else if (data === "admin_content_menu") {
        await ctx.editMessageText(MESSAGES.CONTENT_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: adminContentKeyboard });
    } else if (data === "admin_welcome_menu") {
        await ctx.editMessageText(MESSAGES.WELCOME_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: adminWelcomeKeyboard });
    } else if (data === "admin_broadcast_menu") {
        const broadcasts = await BroadcastService.getAll();
        await ctx.editMessageText(MESSAGES.BROADCAST_MGMT_TITLE, { parse_mode: "Markdown", reply_markup: getBroadcastsKeyboard(broadcasts) });
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
        await ctx.editMessageText(`${MESSAGES.EDIT_TITLE}\n\n${prompt}`, { parse_mode: "Markdown", reply_markup: getCancelAdminKeyboard("menu") });
    }

    else if (data === "admin_welcome_add") {
        adminState.set(userId, { action: "welcome_add" });
        await ctx.editMessageText(MESSAGES.PROMPT_BC_MSG, { reply_markup: getCancelAdminKeyboard("welcome") });
    } else if (data === "admin_welcome_list") {
        const list = await db.query('SELECT id FROM welcome_messages ORDER BY sort_order ASC');
        const kb = new InlineKeyboard();
        list.rows.forEach((row, index) => {
            kb.text(`📝 #${index + 1}`, `admin_welcome_edit_${row.id}`);
            kb.text(`🗑`, `admin_welcome_del_${row.id}`);
            kb.row();
        });
        kb.text(MESSAGES.BACK, "admin_welcome_menu");
        await ctx.editMessageText(MESSAGES.WELCOME_LIST_TITLE + "\n\nВиберіть повідомлення для редагування або видалення.", { parse_mode: "Markdown", reply_markup: kb });
    } else if (data.startsWith("admin_welcome_edit_")) {
        const id = data.replace("admin_welcome_edit_", "");
        adminState.set(userId, { action: `welcome_edit_${id}` });
        await ctx.editMessageText(MESSAGES.PROMPT_BC_MSG, { reply_markup: getCancelAdminKeyboard("welcome_list") });
    } else if (data.startsWith("admin_welcome_del_")) {
        const id = data.replace("admin_welcome_del_", "");
        await db.query('DELETE FROM welcome_messages WHERE id = $1', [id]);
        return adminCallback(Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
            callbackQuery: { ...ctx.callbackQuery, data: "admin_welcome_list" }
        }));
    }

    else if (data === "admin_stats") {
        const u = await db.query('SELECT COUNT(*) as count FROM users');
        const o = await db.query('SELECT COUNT(*) as count FROM orders');
        const s = await db.query("SELECT SUM(amount) as sum FROM orders WHERE status = 'success'");
        await ctx.editMessageText(MESSAGES.STATS_BODY(parseInt(u.rows[0].count), parseInt(o.rows[0].count), parseInt(s.rows[0].sum || 0)), { parse_mode: "Markdown", reply_markup: adminKeyboard });
    }

    else if (data.startsWith("admin_cancel_")) {
        const target = data.replace("admin_cancel_", "");
        adminState.delete(userId);

        const fakeCtx = (targetData: string) => Object.assign(Object.create(Object.getPrototypeOf(ctx)), ctx, {
            callbackQuery: { ...ctx.callbackQuery, data: targetData }
        });

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

        await ctx.editMessageText(MESSAGES.ADMIN_PANEL_TITLE, { reply_markup: adminKeyboard });
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
            await ctx.reply(MESSAGES.BROADCAST_DETAILS(bc!.name, msgs.length), {
                parse_mode: "Markdown", reply_markup: getSingleBroadcastKeyboard(id, bc!.status, msgs.length)
            });
        }
        else if (state.action.startsWith("bc_add_msg_")) {
            const id = parseInt(state.action.replace("bc_add_msg_", ""));
            if (ctx.message) {
                await BroadcastService.addMessage(id, { chat_id: ctx.chat!.id, message_id: ctx.message.message_id });
                adminState.delete(userId);
                const bc = await BroadcastService.getById(id);
                const msgs = await BroadcastService.getMessages(id);
                await ctx.reply(MESSAGES.SUCCESS_SAVE + "\n\n" + MESSAGES.BROADCAST_DETAILS(bc!.name, msgs.length), {
                    parse_mode: "Markdown", reply_markup: getSingleBroadcastKeyboard(id, bc!.status, msgs.length)
                });
            }
        }
        else if (state.action.startsWith("edit_")) {
            const field = state.action.replace("edit_", "");
            const val = field === "price" ? parseInt(ctx.message?.text || "0") : ctx.message?.text;
            await updateCourse(field as any, val as any);
            adminState.delete(userId);
            await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminContentKeyboard });
        } else if (state.action === "welcome_add") {
            if (ctx.message) {
                const payload = { chat_id: ctx.chat!.id, message_id: ctx.message.message_id };
                await db.query('INSERT INTO welcome_messages (content, sort_order) VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM welcome_messages))', [JSON.stringify(payload)]);
                adminState.delete(userId);
                await ctx.reply(MESSAGES.SUCCESS_SAVE, { reply_markup: adminWelcomeKeyboard });
            }
        } else if (state.action.startsWith("welcome_edit_")) {
            if (ctx.message) {
                const id = state.action.replace("welcome_edit_", "");
                const payload = { chat_id: ctx.chat!.id, message_id: ctx.message.message_id };
                await db.query('UPDATE welcome_messages SET content = $1 WHERE id = $2', [JSON.stringify(payload), id]);
                adminState.delete(userId);

                // Fetch updated list to show immediately
                const list = await db.query('SELECT id FROM welcome_messages ORDER BY sort_order ASC');
                const kb = new InlineKeyboard();
                list.rows.forEach((row, index) => {
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
