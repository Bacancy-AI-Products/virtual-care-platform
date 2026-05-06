import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';

const dailyApi: AxiosInstance = axios.create({
    baseURL: 'https://api.daily.co/v1',
    headers: {
        Authorization: `Bearer ${config.dailyApiKey}`,
        'Content-Type': 'application/json',
    },
});

interface DailyRoomResponse {
    id: string;
    name: string;
    url: string;
    created_at: string;
    config: Record<string, unknown>;
}

interface DailyTokenResponse {
    token: string;
}

export async function createDailyRoom(appointmentId: string): Promise<DailyRoomResponse> {
    const roomName = `consult-${appointmentId}`;
    const expiryTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours

    const response = await dailyApi.post<DailyRoomResponse>('/rooms', {
        name: roomName,
        properties: {
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            exp: expiryTime,
            eject_at_room_exp: true,
        },
    });

    return response.data;
}

export async function createMeetingToken(
    roomName: string,
    userId: string,
    userName: string,
    isOwner = false,
): Promise<string> {
    const expiryTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours

    const response = await dailyApi.post<DailyTokenResponse>('/meeting-tokens', {
        properties: {
            room_name: roomName,
            user_name: userName,
            user_id: userId,
            is_owner: isOwner,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            exp: expiryTime,
        },
    });

    return response.data.token;
}

export async function getDailyRoom(roomName: string): Promise<DailyRoomResponse | null> {
    try {
        const response = await dailyApi.get<DailyRoomResponse>(`/rooms/${roomName}`);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
    await dailyApi.delete(`/rooms/${roomName}`);
}
