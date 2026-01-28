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

    // Admin Broadcasts
    BROADCAST_MGMT_TITLE: "📢 *Керування розсилками*",
    BROADCAST_DETAILS: (name: string, count: number) =>
        `📦 *Розсилка:* ${name}\n✉️ *Повідомлень:* ${count}\n\nВи можете додавати повідомлення будь-якого типу та надсилати цю розсилку скільки завгодно разів.`,
    PROMPT_BC_NAME: "📝 Введіть назву для нової розсилки:",
    PROMPT_BC_MSG: "📥 Надішліть боту ПОВІДОМЛЕННЯ (будь-якого типу), яке хочете додати до цієї розсилки:",
    PROMPT_BC_RENAME: "📝 Введіть нову назву для розсилки:",
    BC_STARTING: (name: string, count: number) => `🚀 Починаю розсилку "${name}" на ${count} користувачів...`,
    BC_FINISHED: (name: string, ok: number, err: number) =>
        `✅ Розсилка "${name}" завершена!\n\nУспішно: ${ok}\nБлокувань/Помилок: ${err}`,

    // Admin Welcome
    WELCOME_MGMT_TITLE: "👋 *Вітальні повідомлення*",
    PROMPT_WELCOME_ADD: "💬 Введіть текст нового вітального СМС:",
    WELCOME_LIST_TITLE: "📜 *Список вітальних СМС:*",

    // Payments
    PAYMENT_TITLE: "💳 *Оплата курсу*",
    PAYMENT_DESC: (price: number) => `💰 Сума: *${price} грн*\n\nПісля успішної оплати ви отримаєте доступ автоматично.`,
    PAYMENT_UNAVAILABLE: "⚠️ Оплата тимчасово недоступна (не налаштовано LiqPay ключі).",
    PAYMENT_CONFIRMED: "✅ *Оплата підтверджена!*",

    // Admin Stats
    STATS_TITLE: "📊 *Статистика*",
    STATS_BODY: (users: number, orders: number, total: number) =>
        `📊 *Статистика*\n\nКористувачів: ${users}\nЗамовлень: ${orders}\nСума: ${total} грн.`
};

export const BUTTONS = {
    COURSE_DESC: "📘 Опис курсу",
    COURSE_PROG: "🎯 Програма",
    COURSE_REVIEWS: "⭐ Відгуки",
    COURSE_BUY: "🛒 Купити",

    ADMIN_CONTENT: "📝 Контент курсу",
    ADMIN_WELCOME: "👋 Вітальні СМС",
    ADMIN_BROADCASTS: "📢 Розсилки",
    ADMIN_STATS: "📊 Статистика",
    ADMIN_EXIT: "🚪 Вихід",

    EDIT_DESC: "📝 Опис",
    EDIT_PROG: "📋 Програма",
    EDIT_REVIEWS: "⭐ Відгуки",
    EDIT_PRICE: "💰 Ціна",
    EDIT_SUCCESS: "🎉 Смс успіху",

    BC_NEW: "➕ Створити нову розсилку",
    BC_VIEW_MSGS: "📝 Перегляд / видалення смс",
    BC_ADD_MSG: "➕ Додати повідомлення",
    BC_SEND_ALL: "🚀 ВІДПРАВИТИ ВСІМ",
    BC_RENAME: "📝 Перейменувати",
    BC_DELETE: "🗑 Видалити",

    WELCOME_ADD: "➕ Додати СМС",
    WELCOME_LIST: "📜 Список / Видалення",

    LIQPAY_PAY: "💳 Оплатити через LiqPay",
    BACK: "⬅️ Назад",
    CANCEL: "❌ Скасувати"
};
