import crypto from 'crypto';
import { LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY, PUBLIC_APP_URL, BOT_USERNAME } from '../config/env.js';

export function generateLiqPayLink(amount: number, description: string, orderId: string) {
    const resultUrl = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=payment_${orderId}` : undefined;
    const json_string = {
        public_key: LIQPAY_PUBLIC_KEY,
        version: '3',
        action: 'pay',
        amount: amount,
        currency: 'UAH',
        description: description,
        order_id: orderId,
        server_url: `${PUBLIC_APP_URL}/liqpay-callback`,
        ...(resultUrl ? { result_url: resultUrl } : {})
    };

    const data = Buffer.from(JSON.stringify(json_string)).toString('base64');
    const signature = crypto
        .createHash('sha1')
        .update(LIQPAY_PRIVATE_KEY + data + LIQPAY_PRIVATE_KEY)
        .digest('base64');

    return `https://www.liqpay.ua/api/3/checkout?data=${data}&signature=${encodeURIComponent(signature)}`;
}
