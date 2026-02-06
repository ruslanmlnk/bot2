import crypto from 'crypto';
import { WAYFORPAY_MERCHANT_ACCOUNT, WAYFORPAY_SECRET_KEY, WAYFORPAY_MERCHANT_DOMAIN_NAME, PUBLIC_APP_URL } from '../config/env.js';

export function generateWayForPayLink(amount: number, description: string, orderId: string) {
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'UAH';
    const productName = [description];
    const productCount = [1];
    const productPrice = [amount];

    const stringToSign = [
        WAYFORPAY_MERCHANT_ACCOUNT,
        WAYFORPAY_MERCHANT_DOMAIN_NAME,
        orderId,
        orderDate,
        amount,
        currency,
        ...productName,
        ...productCount,
        ...productPrice
    ].join(';');

    const signature = crypto
        .createHmac('md5', WAYFORPAY_SECRET_KEY)
        .update(stringToSign)
        .digest('hex');

    // WayForPay doesn't strictly have a "GET" link like LiqPay (they prefer a form or a redirect from their SDK),
    // but we can use their "Purchase" API to get a URL if we use the "behavior=offline" or just build a form logic.
    // However, the common way for simple links is to use a form.
    // But wait, the docs said: 
    // "Сервер торговця... посилає пост запит на https://secure.wayforpay.com/pay?behavior=offline... У відповідь наш сервер в разі успіху віддає { \"url\": \"...\" }"

    // Actually, many Telegram bots just use a hosted payment page or a simple redirect.
    // Let's see if there is a simpler "link" way.
    // In many cases, you can just POST a form. But in Telegram, we need a URL for the button.

    // I will implement the 'behavior=offline' POST request to get the URL.
    // But since I'm in a function that returns a link, I might need to make it async.

    // Let's reconsider. If I can't return a direct link, I'll have to make it async.
    return {
        url: 'https://secure.wayforpay.com/pay',
        params: {
            merchantAccount: WAYFORPAY_MERCHANT_ACCOUNT,
            merchantDomainName: WAYFORPAY_MERCHANT_DOMAIN_NAME,
            merchantSignature: signature,
            orderReference: orderId,
            orderDate: orderDate,
            amount: amount,
            currency: currency,
            'productName[]': productName,
            'productCount[]': productCount,
            'productPrice[]': productPrice,
            serviceUrl: `${PUBLIC_APP_URL}/wayforpay-callback`,
            returnUrl: `https://t.me/${process.env.BOT_USERNAME}?start=payment_${orderId}`,
        }
    };
}

export async function getWayForPayPaymentUrl(amount: number, description: string, orderId: string): Promise<string> {
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'UAH';
    const productName = [description];
    const productCount = [1];
    const productPrice = [amount];

    const stringToSign = [
        WAYFORPAY_MERCHANT_ACCOUNT,
        WAYFORPAY_MERCHANT_DOMAIN_NAME,
        orderId,
        orderDate,
        amount,
        currency,
        ...productName,
        ...productCount,
        ...productPrice
    ].join(';');

    const signature = crypto
        .createHmac('md5', WAYFORPAY_SECRET_KEY)
        .update(stringToSign, 'utf8')
        .digest('hex');

    const body = {
        merchantAccount: WAYFORPAY_MERCHANT_ACCOUNT,
        merchantDomainName: WAYFORPAY_MERCHANT_DOMAIN_NAME,
        merchantSignature: signature,
        orderReference: orderId,
        orderDate: orderDate,
        amount: amount,
        currency: currency,
        productName: productName,
        productCount: productCount,
        productPrice: productPrice,
        serviceUrl: `${PUBLIC_APP_URL}/wayforpay-callback`,
        apiVersion: 1
    };

    try {
        const response = await fetch('https://secure.wayforpay.com/pay?behavior=offline', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json() as { url: string };
        return data.url;
    } catch (error) {
        console.error('Error getting WayForPay URL:', error);
        throw error;
    }
}
