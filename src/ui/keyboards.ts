import { InlineKeyboard } from "grammy";
import { BUTTONS, MESSAGES } from "../data.js";

export function getMainKeyboard(isAdmin: boolean, isPaid: boolean = false) {
    const kb = new InlineKeyboard()
        .text(BUTTONS.COURSE_DESC, "course_description")
        .row()
        .text(BUTTONS.COURSE_PROG, "course_program")
        .text(BUTTONS.COURSE_REVIEWS, "course_reviews")
        .row();

    if (isPaid) {
        kb.text(BUTTONS.BUY_ALREADY, "course_buy").row().text(BUTTONS.BUY_RESEND, "course_resend");
    } else {
        kb.text(BUTTONS.COURSE_BUY, "course_buy");
    }

    kb.row().text(BUTTONS.OFFER, "offer_show");

    if (isAdmin) {
        kb.row().text(BUTTONS.ADMIN_PANEL, "admin_main");
    }

    return kb;
}

export const backKeyboard = new InlineKeyboard()
    .text(BUTTONS.BACK, "back_to_main");

export const adminKeyboard = new InlineKeyboard()
    .text(BUTTONS.ADMIN_CONTENT, "admin_content_menu")
    .text(BUTTONS.ADMIN_WELCOME, "admin_welcome_menu")
    .row()
    .text(BUTTONS.ADMIN_BROADCASTS, "admin_broadcast_menu")
    .text(BUTTONS.ADMIN_STATS, "admin_stats")
    .row()
    .text(BUTTONS.ADMIN_REFERRAL, "admin_ref_link")
    .row()
    .text(BUTTONS.ADMIN_CLEAR_USERS, "admin_clear_users")
    .row()
    .text(BUTTONS.ADMIN_EXIT, "back_to_main");

export const adminContentKeyboard = new InlineKeyboard()
    .text(BUTTONS.EDIT_DESC, "admin_edit_description")
    .text(BUTTONS.EDIT_PROG, "admin_edit_program")
    .row()
    .text(BUTTONS.EDIT_REVIEWS, "admin_edit_reviews")
    .text(BUTTONS.EDIT_PRICE, "admin_edit_price")
    .row()
    .text(BUTTONS.EDIT_SUCCESS, "admin_edit_success_message")
    .text(BUTTONS.EDIT_OFFER, "admin_edit_offer")
    .row()
    .text(BUTTONS.ADMIN_PRODUCT, "admin_product_menu")
    .row()
    .text(BUTTONS.BACK, "admin_main");

export const adminWelcomeKeyboard = new InlineKeyboard()
    .text(BUTTONS.WELCOME_ADD, "admin_welcome_add")
    .row()
    .text(BUTTONS.WELCOME_LIST, "admin_welcome_list")
    .row()
    .text(BUTTONS.BACK, "admin_main");

export const adminProductKeyboard = new InlineKeyboard()
    .text(BUTTONS.PRODUCT_ADD, "admin_product_add")
    .row()
    .text(BUTTONS.PRODUCT_LIST, "admin_product_list")
    .row()
    .text(BUTTONS.BACK, "admin_content_menu");

export function getBroadcastsKeyboard(broadcasts: any[]) {
    const kb = new InlineKeyboard();
    kb.text(BUTTONS.BC_NEW, "admin_bc_new").row();
    broadcasts.forEach(bc => {
        kb.text(`📢 ${bc.name}`, `admin_bc_view_${bc.id}`).row();
    });
    kb.text(BUTTONS.BACK, "admin_main");
    return kb;
}

export function getSingleBroadcastKeyboard(id: number, status: string, messagesCount: number, scheduledAt?: Date | string | null) {
    const kb = new InlineKeyboard();
    kb.text(BUTTONS.BC_VIEW_MSGS, `admin_bc_msgs_list_${id}`).row();
    kb.text(BUTTONS.BC_ADD_MSG, `admin_bc_add_msg_${id}`).row();
    if (scheduledAt) {
        kb.text(BUTTONS.BC_UNSCHEDULE, `admin_bc_unschedule_${id}`).row();
    } else {
        kb.text(BUTTONS.BC_SCHEDULE, `admin_bc_schedule_${id}`).row();
    }
    if (messagesCount > 0) {
        kb.text(BUTTONS.BC_SEND_ALL, `admin_bc_send_${id}`).row();
    }
    kb.text(BUTTONS.BC_RENAME, `admin_bc_rename_${id}`);
    kb.text(BUTTONS.BC_DELETE, `admin_bc_delete_${id}`).row();
    kb.text(MESSAGES.BACK, "admin_broadcast_menu");
    return kb;
}

export function getCancelAdminKeyboard(action: string) {
    return new InlineKeyboard().text(BUTTONS.CANCEL || MESSAGES.CANCEL, `admin_cancel_${action}`);
}
