export const MESSAGES = {
    // UI General
    BACK: "⬅️ Назад",
    CANCEL: "❌ Скасувати",
    SUCCESS_SAVE: "✅ Успішно збережено!",
    ERROR_GENERAL: "❌ Помилка операції.",

    // Main UI
    CHOOSE_ACTION: "Оберіть дію 👇",
    ADMIN_PANEL_TITLE: "🛠 *Адмін-панель*",

    // Admin Content
    CONTENT_MGMT_TITLE: "📝 *Керування контентом курсу*",
    EDIT_TITLE: "📝 *Редагування*",
    PROMPT_DESCRIPTION: "Напишіть новий опис курсу:",
    PROMPT_PROGRAM: "Напишіть нову програму курсу:",
    PROMPT_REVIEWS: "Напишіть нові відгуки:",
    PROMPT_PRICE: "Введіть нову ціну (тільки число):",
    PROMPT_SUCCESS_MSG: "Напишіть повідомлення, яке користувач отримає ПІСЛЯ успішної оплати:",
    PROMPT_PRODUCT_MSG: "📦 Надішліть повідомлення продукту (будь-якого типу):",

    // Admin Broadcasts
    BROADCAST_MGMT_TITLE: "📢 *Керування розсилками*",
    BROADCAST_DETAILS: (name: string, count: number, scheduleText?: string | null) =>
        `📦 *Розсилка:* ${name}\n✉️ *Повідомлень:* ${count}${scheduleText ? `\n⏰ *Заплановано:* ${scheduleText}` : ""}\n\nВи можете додавати повідомлення будь-якого типу та надсилати цю розсилку скільки завгодно разів.`,
    PROMPT_BC_NAME: "📝 Введіть назву для нової розсилки:",
    PROMPT_BC_MSG: "📥 Надішліть боту ПОВІДОМЛЕННЯ (будь-якого типу), яке хочете додати до цієї розсилки:",
    PROMPT_BC_RENAME: "📝 Введіть нову назву для розсилки:",
    PROMPT_BC_SCHEDULE: "📅 Введіть дату та час відкладеної розсилки (YYYY-MM-DD HH:mm):",
    ERROR_BC_SCHEDULE_FORMAT: "❌ Невірний формат дати. Використайте YYYY-MM-DD HH:mm.",
    ERROR_BC_SCHEDULE_PAST: "❌ Цей час уже минув. Вкажіть майбутній час.",
    BC_STARTING: (name: string, count: number) => `🚀 Починаю розсилку "${name}" на ${count} користувачів...`,
    BC_FINISHED: (name: string, ok: number, err: number) =>
        `✅ Розсилка "${name}" завершена!\n\nУспішно: ${ok}\nБлокувань/Помилок: ${err}`,

    // Admin Welcome
    WELCOME_MGMT_TITLE: "👋 *Вітальні повідомлення*",
    PROMPT_WELCOME_ADD: "💬 Введіть текст нового вітального СМС:",
    WELCOME_LIST_TITLE: "📜 *Список вітальних СМС:*",

    // Offer
    PROMPT_OFFER_MSG: "📄 Надішліть повідомлення оферти (будь-якого типу):",
    OFFER_NOT_SET: "⚠️ Оферта поки не налаштована.",

    // Payments
    PAYMENT_TITLE: "💳 *Оплата курсу*",
    PAYMENT_DESC: (price: number) => `💰 Сума: *${price} грн*\n\nПісля успішної оплати ви отримаєте доступ автоматично.`,
    PAYMENT_UNAVAILABLE: "⚠️ Оплата тимчасово недоступна (не налаштовано LiqPay ключі).",
    PAYMENT_CONFIRMED: "✅ *Оплата підтверджена!*",
    PAYMENT_ALREADY: "✅ Ви вже оплатили. Можете перевідправити продукт.",
    PRODUCT_DELIVERED: "📦 Продукт відправлено.",

    // Admin Stats
    STATS_TITLE: "📊 *Статистика*",
    STATS_BODY: (users: number, pending: number, paid: number, total: number) =>
        `📊 *Статистика*

Користувачів: ${users}
Очікуєть оплату: ${pending}
Оплачено: ${paid}
Сума: ${total} грн.`
};

export const BUTTONS = {
    COURSE_DESC: "📘 Опис курсу",
    COURSE_PROG: "🎯 Програма",
    COURSE_REVIEWS: "⭐ Відгуки",
    COURSE_BUY: "🛒 Купити",
    OFFER: "📄 Оферта",

    ADMIN_PANEL: "🛠 Адмін",
    ADMIN_CONTENT: "📝 Контент курсу",
    ADMIN_WELCOME: "👋 Вітальні СМС",
    ADMIN_BROADCASTS: "📢 Розсилки",
    ADMIN_STATS: "📊 Статистика",
    ADMIN_EXIT: "🚪 Вихід",

    ADMIN_PRODUCT: "📦 Продукт",

    EDIT_DESC: "📝 Опис",
    EDIT_PROG: "📋 Програма",
    EDIT_REVIEWS: "⭐ Відгуки",
    EDIT_PRICE: "💰 Ціна",
    EDIT_SUCCESS: "🎉 Смс успіху",
    EDIT_OFFER: "📄 Оферта",

    PRODUCT_ADD: "➕ Додати продукт",
    PRODUCT_LIST: "📦 Список продукту",

    BUY_ALREADY: "✅ Вже куплено",
    BUY_RESEND: "🔁 Перевідправити",

    BC_NEW: "➕ Створити нову розсилку",
    BC_VIEW_MSGS: "📝 Перегляд / видалення смс",
    BC_ADD_MSG: "➕ Додати повідомлення",
    BC_SCHEDULE: "📅 Запланувати",
    BC_UNSCHEDULE: "❌ Скасувати відкладення",
    BC_SEND_ALL: "🚀 ВІДПРАВИТИ ВСІМ",
    BC_RENAME: "📝 Перейменувати",
    BC_DELETE: "🗑 Видалити",

    WELCOME_ADD: "➕ Додати СМС",
    WELCOME_LIST: "📜 Список / Видалення",

    LIQPAY_PAY: "💳 Оплатити через LiqPay",
    BACK: "⬅️ Назад",
    CANCEL: "❌ Скасувати"
};
