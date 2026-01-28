export interface User {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    ref_id?: string;
    is_blocked: boolean;
    created_at: Date;
}

export interface Course {
    description: string;
    program: string;
    reviews: string;
    price: number;
    success_message: string;
}

export interface Broadcast {
    id: number;
    name: string;
    status: 'draft' | 'sent';
    created_at: Date;
}

export interface BroadcastMessage {
    id: number;
    broadcast_id: number;
    message_payload: {
        chat_id: number;
        message_id: number;
    };
    sort_order: number;
}

export interface AdminState {
    action: string;
    data?: any;
}
