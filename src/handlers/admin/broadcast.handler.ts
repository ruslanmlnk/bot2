import type { Context } from "grammy";
import { BroadcastService } from "../../services/admin/broadcast.service.js";
import { sendBroadcastById } from "../../services/admin/broadcast.sender.js";
import { getBroadcastsKeyboard, getSingleBroadcastKeyboard } from "../../ui/keyboards.js";
import { MESSAGES } from "../../data.js";
import { adminState } from "../admin.handler.js";
import { getCancelAdminKeyboard } from "../../ui/keyboards.js";

function formatDateTime(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTimezoneOffset(date: Date) {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const minutes = String(abs % 60).padStart(2, "0");
    return `UTC${sign}${hours}:${minutes}`;
}

export async function handleBroadcastCallback(ctx: Context, data: string) {
    const userId = ctx.from!.id;
    if (data === "admin_broadcast_menu") {
        const broadcasts = await BroadcastService.getAll();
        await ctx.editMessageText(MESSAGES.BROADCAST_MGMT_TITLE, {
            parse_mode: "Markdown",
            reply_markup: getBroadcastsKeyboard(broadcasts)
        });
    }
    else if (data === "admin_bc_new") {
        adminState.set(userId, { action: "bc_new" });
        await ctx.editMessageText(MESSAGES.PROMPT_BC_NAME, { reply_markup: getCancelAdminKeyboard("bc_menu") });
    }
    else if (data.startsWith("admin_bc_add_msg_")) {
        const id = parseInt(data.replace("admin_bc_add_msg_", ""));
        adminState.set(userId, { action: `bc_add_msg_${id}` });
        await ctx.editMessageText(MESSAGES.PROMPT_BC_MSG, { reply_markup: getCancelAdminKeyboard(`bc_view_${id}`) });
    }
    else if (data.startsWith("admin_bc_rename_")) {
        const id = data.replace("admin_bc_rename_", "");
        adminState.set(userId, { action: `bc_rename_${id}` });
        await ctx.editMessageText(MESSAGES.PROMPT_BC_RENAME, { reply_markup: getCancelAdminKeyboard(`bc_view_${id}`) });
    }
    else if (data.startsWith("admin_bc_view_")) {
        const id = parseInt(data.replace("admin_bc_view_", ""));
        const bc = await BroadcastService.getById(id);
        const msgs = await BroadcastService.getMessages(id);
        if (!bc) return;
        const scheduleText = formatDateTime(bc.scheduled_at);

        await ctx.editMessageText(MESSAGES.BROADCAST_DETAILS(bc.name, msgs.length, scheduleText), {
            parse_mode: "Markdown",
            reply_markup: getSingleBroadcastKeyboard(id, bc.status, msgs.length, bc.scheduled_at)
        });
    }
    else if (data.startsWith("admin_bc_delete_")) {
        const id = parseInt(data.replace("admin_bc_delete_", ""));
        await BroadcastService.delete(id);
        const broadcasts = await BroadcastService.getAll();
        await ctx.editMessageText(MESSAGES.BROADCAST_MGMT_TITLE, {
            parse_mode: "Markdown",
            reply_markup: getBroadcastsKeyboard(broadcasts)
        });
    }
    else if (data.startsWith("admin_bc_msgs_list_")) {
        const id = parseInt(data.replace("admin_bc_msgs_list_", ""));
        const msgs = await BroadcastService.getMessages(id);

        await ctx.editMessageText(`📝 *Повідомлення в розсилці #${id}:*\n\nТут ви можете видалити окремі повідомлення з ланцюжка.`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    ...msgs.map((m, i) => [{ text: `🗑 Видалити #${i + 1}`, callback_data: `admin_bc_msg_del_${id}_${m.id}` }]),
                    [{ text: MESSAGES.BACK, callback_data: `admin_bc_view_${id}` }]
                ]
            }
        });
    }
    else if (data.startsWith("admin_bc_msg_del_")) {
        const parts = data.replace("admin_bc_msg_del_", "").split("_");
        const bcId = parseInt(parts[0]);
        const msgId = parseInt(parts[1]);
        await BroadcastService.deleteMessage(msgId);
        await handleBroadcastCallback(ctx, `admin_bc_msgs_list_${bcId}`);
    }
    else if (data.startsWith("admin_bc_schedule_")) {
        const id = parseInt(data.replace("admin_bc_schedule_", ""));
        adminState.set(userId, { action: `bc_schedule_${id}` });
        const now = new Date();
        const nowText = formatDateTime(now);
        const tzText = formatTimezoneOffset(now);
        await ctx.editMessageText(`${MESSAGES.PROMPT_BC_SCHEDULE}\n\nПоточний час: ${nowText} (${tzText})`, {
            reply_markup: getCancelAdminKeyboard(`bc_view_${id}`)
        });
    }
    else if (data.startsWith("admin_bc_unschedule_")) {
        const id = parseInt(data.replace("admin_bc_unschedule_", ""));
        await BroadcastService.unschedule(id);
        const bc = await BroadcastService.getById(id);
        const msgs = await BroadcastService.getMessages(id);
        if (!bc) return;
        const scheduleText = formatDateTime(bc.scheduled_at);
        await ctx.editMessageText(MESSAGES.BROADCAST_DETAILS(bc.name, msgs.length, scheduleText), {
            parse_mode: "Markdown",
            reply_markup: getSingleBroadcastKeyboard(id, bc.status, msgs.length, bc.scheduled_at)
        });
    }
    else if (data.startsWith("admin_bc_send_")) {
        const id = parseInt(data.replace("admin_bc_send_", ""));
        const bc = await BroadcastService.getById(id);
        const msgs = await BroadcastService.getMessages(id);
        if (!bc || msgs.length === 0) return ctx.reply(MESSAGES.ERROR_GENERAL);

        const result = await sendBroadcastById({
            broadcastId: id,
            api: ctx.api,
            onProgress: async (sent, total) => {
                if (sent % 20 === 0) {
                    await ctx.editMessageText(
                        `⏳ Розсилка "${bc.name}" у процесі...

` +
                        `Надіслано: ${sent} / ${total}`
                    ).catch(() => { });
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        });

        if (!result.ok) {
            if (result.reason === "no_users") {
                return ctx.editMessageText("⚠️ Немає отримувачів для розсилки (окрім адмінів або заблокованих).", {
                    reply_markup: { inline_keyboard: [[{ text: MESSAGES.BACK, callback_data: `admin_bc_view_${id}` }]] }
                });
            }
            return ctx.reply(MESSAGES.ERROR_GENERAL);
        }

        await ctx.editMessageText(MESSAGES.BC_FINISHED(bc.name, result.success, result.blocked), {
            reply_markup: {
                inline_keyboard: [[{ text: MESSAGES.BACK, callback_data: `admin_bc_view_${id}` }]]
            }
        });
    }
}
