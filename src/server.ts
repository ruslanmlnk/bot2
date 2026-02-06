import express from 'express';
import crypto from 'crypto';
import { WAYFORPAY_SECRET_KEY } from './config/env.js';
import { bot } from './bot.js';
import { getCourse } from './services/course.service.js';
import { getOrderStatus, updateOrderStatus } from './db/queries/orders.js';
import { sendProductDelivery } from './services/admin/product.delivery.js';
import { getUser } from './services/user.service.js';
import { getReferralLinkByRefId } from './db/queries/referralLinks.js';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/wayforpay-callback', async (req, res) => {
    const data = req.body;
    console.log('WayForPay Payment Data:', data);

    const {
        merchantAccount,
        orderReference,
        amount,
        currency,
        authCode,
        cardPan,
        transactionStatus,
        reasonCode,
        merchantSignature
    } = data;

    if (!orderReference || !merchantSignature) {
        return res.status(400).send('Missing data or signature');
    }

    // Verify signature
    const stringToSign = [
        merchantAccount,
        orderReference,
        amount,
        currency,
        authCode,
        cardPan,
        transactionStatus,
        reasonCode
    ].join(';');

    const sign = crypto
        .createHmac('md5', WAYFORPAY_SECRET_KEY)
        .update(stringToSign, 'utf8')
        .digest('hex');

    if (sign !== merchantSignature) {
        console.error('WayForPay signature mismatch');
        return res.status(400).send('Invalid signature');
    }

    const orderId = orderReference;
    const parts = orderId.split('_');
    const userId = Number(parts[1]);

    if (!Number.isFinite(userId)) {
        return res.status(400).send('Invalid user id');
    }

    if (transactionStatus === 'Approved') {
        const currentStatus = await getOrderStatus(orderId);

        if (currentStatus && currentStatus !== 'success') {
            await updateOrderStatus(orderId, 'success');

            const course = await getCourse();

            // Send final success message
            await bot.api.sendMessage(userId, course.success_message, { parse_mode: 'Markdown' });

            // Try to find the original message and update it to "Paid"
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
                            `🔔 *Реферальна покупка!*\n\nПокупець: ${display}\nСума: ${amount} грн\nРеферал: \`${refName}\``,
                            { parse_mode: "Markdown" }
                        );
                    }
                }
            } catch (e) {
                console.error("Failed to notify referral owner:", e);
            }
        }
    }

    // WayForPay response requirement
    const time = Math.floor(Date.now() / 1000);
    const responseSignature = crypto
        .createHmac('md5', WAYFORPAY_SECRET_KEY)
        .update(`${orderId};accept;${time}`, 'utf8')
        .digest('hex');

    res.json({
        orderReference: orderId,
        status: 'accept',
        time,
        signature: responseSignature
    });
});

export function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on port ${port} for WayForPay callbacks`);
    });
}
