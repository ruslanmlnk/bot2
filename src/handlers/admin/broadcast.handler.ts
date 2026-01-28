import type { Context } from "grammy";
import { BroadcastService } from "../../services/admin/broadcast.service.js";
import { getBroadcastsKeyboard, getSingleBroadcastKeyboard } from "../../ui/keyboards.js";
import db from "../../db/index.js";
import { MESSAGES } from "../../data.js";
import { ADMIN_IDS } from "../../config/env.js";
import { adminState } from "../admin.handler.js";
import { getCancelAdminKeyboard } from "../../ui/keyboards.js";

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

        await ctx.editMessageText(MESSAGES.BROADCAST_DETAILS(bc.name, msgs.length), {
            parse_mode: "Markdown",
            reply_markup: getSingleBroadcastKeyboard(id, bc.status, msgs.length)
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
    else if (data.startsWith("admin_bc_send_")) {
        const id = parseInt(data.replace("admin_bc_send_", ""));
        const bc = await BroadcastService.getById(id);
        const msgs = await BroadcastService.getMessages(id);
        if (!bc || msgs.length === 0) return ctx.reply(MESSAGES.ERROR_GENERAL);

        // Fetch all users except admins
        const usersRes = await db.query(
            'SELECT telegram_id FROM users WHERE is_blocked = FALSE AND NOT (telegram_id = ANY($1::BIGINT[]))',
            [ADMIN_IDS]
        );
        const users = usersRes.rows;

        if (users.length === 0) {
            return ctx.editMessageText("⚠️ Немає отримувачів для розсилки (окрім адмінів або заблокованих).", {
                reply_markup: { inline_keyboard: [[{ text: MESSAGES.BACK, callback_data: `admin_bc_view_${id}` }]] }
            });
        }

        await ctx.editMessageText(MESSAGES.BC_STARTING(bc.name, users.length));

        let successCount = 0;
        let blockCount = 0;

        for (const user of users) {
            try {
                const targetId = user.telegram_id.toString();
                for (const m of msgs) {
                    const payload = typeof m.message_payload === 'string' ? JSON.parse(m.message_payload) : m.message_payload;
                    await ctx.api.copyMessage(targetId, payload.chat_id.toString(), payload.message_id);
                }
                successCount++;
            } catch (e: any) {
                if (e.description?.includes("blocked") || e.description?.includes("forbidden")) {
                    blockCount++;
                    await db.query('UPDATE users SET is_blocked = TRUE WHERE telegram_id = $1', [user.telegram_id]);
                }
            }
            if (successCount % 20 === 0) {
                // Update progress in place
                await ctx.editMessageText(
                    `⏳ Розсилка "${bc.name}" у процесі...\n\n` +
                    `Надіслано: ${successCount} / ${users.length}`
                ).catch(() => { });
                await new Promise(r => setTimeout(r, 500));
            }
        }

        await ctx.editMessageText(MESSAGES.BC_FINISHED(bc.name, successCount, blockCount), {
            reply_markup: {
                inline_keyboard: [[{ text: MESSAGES.BACK, callback_data: `admin_bc_view_${id}` }]]
            }
        });
    }
}
