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
    let data = req.body;

    // Check if WayForPay sent JSON as a key in urlencoded body (common issue)
    if (data && typeof data === 'object' && !data.orderReference) {
        const keys = Object.keys(data);
        if (keys.length === 1 && keys[0].startsWith('{')) {
            try {
                data = JSON.parse(keys[0]);
            } catch (e) {
                console.error('Failed to parse WayForPay JSON from key:', e);
            }
        }
    }

    console.log('--- WayForPay Callback Received ---');
    console.log('Data:', JSON.stringify(data, null, 2));

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
        console.warn('WayForPay: Missing data or signature');
        return res.status(400).send('Missing data or signature');
    }

    // Verify signature
    // Values must be joined as strings. WayForPay often sends them as strings anyway in urlencoded.
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
        console.error('WayForPay signature mismatch!');
        console.error('Calculated sign:', sign);
        console.error('Received sign:', merchantSignature);
        console.error('String to sign was:', stringToSign);
        return res.status(400).send('Invalid signature');
    }

    console.log(`WayForPay: Signature verified for order ${orderReference}. Status: ${transactionStatus}`);

    const orderId = orderReference;
    const parts = orderId.split('_');
    const userId = Number(parts[1]);

    if (!Number.isFinite(userId)) {
        console.error('WayForPay: Could not extract userId from orderReference', orderReference);
        return res.status(400).send('Invalid user id');
    }

    if (transactionStatus === 'Approved') {
        const currentStatus = await getOrderStatus(orderId);
        console.log(`Order ${orderId} current DB status: ${currentStatus}`);

        if (currentStatus && currentStatus !== 'success') {
            console.log(`Updating order ${orderId} to success and notifying user ${userId}`);
            await updateOrderStatus(orderId, 'success');

            const course = await getCourse();

            // Send final success message
            await bot.api.sendMessage(userId, course.success_message, { parse_mode: 'Markdown' }).catch(e => console.error("Error sending success message:", e));

            // Try to find the original message and update it to "Paid"
            await bot.api.sendMessage(userId, "✅ *Оплата підтверджена! Дякуємо!*", { parse_mode: 'Markdown' }).catch(e => console.error("Error sending confirmation:", e));

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
                        ).catch(e => console.error("Error notifying referrer:", e));
                    }
                }
            } catch (e) {
                console.error("Failed to notify referral owner:", e);
            }
        } else {
            console.log(`Order ${orderId} ignored (status is already success or order not found)`);
        }
    } else {
        console.log(`Transaction status for ${orderId} is ${transactionStatus}, not 'Approved'.`);
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
