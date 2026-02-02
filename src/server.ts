import express from 'express';
import crypto from 'crypto';
import { LIQPAY_PRIVATE_KEY } from './config/env.js';
import { bot } from './bot.js';
import { getCourse } from './services/course.service.js';
import { getOrderStatus, updateOrderStatus } from './db/queries/orders.js';
import { sendProductDelivery } from './services/admin/product.delivery.js';
import { getUser } from './services/user.service.js';
import { getReferralLinkByRefId } from './db/queries/referralLinks.js';

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
    const userId = Number(parts[1]);
    if (!Number.isFinite(userId)) {
        return res.status(400).send('Invalid user id');
    }

    if (status === 'success' || status === 'wait_accept') {
        const currentStatus = await getOrderStatus(order_id);

        if (currentStatus && currentStatus !== 'success') {
            await updateOrderStatus(order_id, 'success');

            const course = await getCourse();

            // Send final success message
            await bot.api.sendMessage(userId, course.success_message, { parse_mode: 'Markdown' });

            // Try to find the original message and update it to "Paid"
            // We don't store message_id in orders yet, but we can send a new confirmation
            await bot.api.sendMessage(userId, "✅ *Оплата підтверджена!*", { parse_mode: 'Markdown' });

            try {
                await sendProductDelivery(bot.api, userId);
            } catch (e) {
                console.error("Failed to send product delivery:", e);
            }

            try {
                const buyer = await getUser(userId);
                const refId = buyer?.ref_id;
                if (refId) {
                    let ownerId: number | null = null;
                    let refName = refId;

                    if (refId.startsWith("ref_")) {
                        ownerId = Number(refId.replace("ref_", ""));
                    } else {
                        // Check custom referral links
                        const customRef = await getReferralLinkByRefId(refId);
                        if (customRef) {
                            ownerId = Number(customRef.creator_id);
                            refName = `${customRef.name} (${customRef.ref_id})`;
                        }
                    }

                    if (ownerId && Number.isFinite(ownerId) && ownerId !== userId) {
                        const display = buyer?.username
                            ? `@${buyer.username}`
                            : [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ").trim() || `ID ${userId}`;

                        await bot.api.sendMessage(
                            ownerId,
                            `🔔 *Реферальна покупка!*\n\nПокупець: ${display}\nСума: ${decodedData.amount} грн\nРеферал: \`${refName}\``,
                            { parse_mode: "Markdown" }
                        );
                    }
                }
            } catch (e) {
                console.error("Failed to notify referral owner:", e);
            }
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
