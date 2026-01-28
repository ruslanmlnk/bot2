import 'dotenv/config';

export const BOT_API_KEY = process.env.BOT_API_KEY || '';
export const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
export const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN || '';
export const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || '';
export const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || '';
export const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

if (!BOT_API_KEY) {
    console.warn('Warning: BOT_API_KEY is not set in .env');
}
