import { request } from './client';

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    appointmentId: string | null;
    content: string | null;
    createdAt: string;
    sender: { id: string; name: string; role: string };
}

export const messagesApi = {
    getByAppointment: (appointmentId: string) =>
        request<Message[]>(`/messages/appointment/${appointmentId}`),
};
