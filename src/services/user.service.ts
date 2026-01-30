import { getUserByTelegramId, upsertUserRecord } from '../db/queries/users.js';

export async function upsertUser(input: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
    refId?: string;
}) {
    return upsertUserRecord(input);
}

export async function getUser(telegramId: number) {
    return getUserByTelegramId(telegramId);
}
