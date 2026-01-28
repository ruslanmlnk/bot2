import express from 'express';
import crypto from 'crypto';
import db from './db/index.js';
import { LIQPAY_PRIVATE_KEY } from './config/env.js';
import { bot } from './bot.js';
import { getCourse } from './services/course.service.js';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/liqpay-callback', async (req, res) => {
    const { data, signature } = req.body;

    if (!data || !signature) {
        return res.status(400).send('Missing data or signature');
    }

    // Verify signature
    const sign = crypto
        .createHash('sha1')
        .update(LIQPAY_PRIVATE_KEY + data + LIQPAY_PRIVATE_KEY)
        .digest('base64');

    if (sign !== signature) {
        console.error('LiqPay signature mismatch');
        return res.status(400).send('Invalid signature');
    }

    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString());
    console.log('LiqPay Payment Data:', decodedData);

    const { order_id, status } = decodedData;

    // order_id is in format: order_USERID_TIMESTAMP
    const parts = order_id.split('_');
    const userId = parts[1];

    if (status === 'success' || status === 'wait_accept') {
        const orderRes = await db.query('SELECT status FROM orders WHERE id = $1', [order_id]);

        if (orderRes.rows[0] && orderRes.rows[0].status !== 'success') {
            await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['success', order_id]);

            const course = await getCourse();

            // Send final success message
            await bot.api.sendMessage(userId, course.success_message, { parse_mode: 'Markdown' });

            // Try to find the original message and update it to "Paid"
            // We don't store message_id in orders yet, but we can send a new confirmation
            await bot.api.sendMessage(userId, "✅ *Оплата підтверджена!*", { parse_mode: 'Markdown' });
        }
    }

    res.send('OK');
});

export function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on port ${port} for LiqPay callbacks`);
    });
}
