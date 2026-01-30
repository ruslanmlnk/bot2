import type { Broadcast, BroadcastMessage } from "../../types/index.js";
import {
    addBroadcastMessage,
    createBroadcast,
    deleteBroadcast,
    deleteBroadcastMessage,
    getBroadcastById,
    listBroadcastMessages,
    listBroadcasts,
    renameBroadcast
} from "../../db/queries/broadcasts.js";

export const BroadcastService = {
    async getAll(): Promise<Broadcast[]> {
        return listBroadcasts();
    },

    async getById(id: number): Promise<Broadcast | null> {
        return getBroadcastById(id);
    },

    async create(name: string): Promise<Broadcast> {
        return createBroadcast(name);
    },

    async rename(id: number, name: string) {
        return renameBroadcast(id, name);
    },

    async delete(id: number) {
        return deleteBroadcast(id);
    },

    async getMessages(broadcastId: number): Promise<BroadcastMessage[]> {
        return listBroadcastMessages(broadcastId);
    },

    async addMessage(broadcastId: number, payload: any) {
        return addBroadcastMessage(broadcastId, payload);
    },

    async deleteMessage(messageId: number) {
        return deleteBroadcastMessage(messageId);
    }
};
