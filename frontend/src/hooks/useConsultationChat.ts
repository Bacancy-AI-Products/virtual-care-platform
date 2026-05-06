import { useState, useRef, useCallback, useEffect } from 'react';
import { filesApi, messagesApi, FileRecord, Message } from '@/services/api';
import { consultationSocket } from '@/services/socket';

export function useConsultationChat(appointmentId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [sharedFiles, setSharedFiles] = useState<FileRecord[]>([]);
    const [historicalMessages, setHistoricalMessages] = useState<Message[]>([]);
    const [historicalFiles, setHistoricalFiles] = useState<FileRecord[]>([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [remoteTyping, setRemoteTyping] = useState(false);
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Socket setup
    useEffect(() => {
        if (!appointmentId) return;

        setMessages([]);
        setSharedFiles([]);
        setHistoricalMessages([]);
        setHistoricalFiles([]);
        setHistoryLoaded(false);

        consultationSocket.connect();
        consultationSocket.setListeners({
            onJoined: () => {
                // Fresh slate — history available on demand
            },
            onMessage: (msg) => setMessages((prev) => [...prev, msg]),
            onUserTyping: (data) => setRemoteTyping(data.isTyping),
            onParticipantJoined: () => {},
            onParticipantLeft: () => {},
            onFileUploaded: (data) => {
                const file = data.file as FileRecord;
                setSharedFiles((prev) =>
                    prev.some((f) => f.id === file.id) ? prev : [file, ...prev],
                );
            },
            onError: (err) => console.error('Socket error:', err),
        });
        consultationSocket.joinConsultation(appointmentId);

        return () => {
            consultationSocket.disconnect();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [appointmentId]);

    const loadHistory = useCallback(async () => {
        if (historyLoaded || isLoadingHistory) return;
        setIsLoadingHistory(true);
        try {
            const [msgs, files] = await Promise.all([
                messagesApi.getByAppointment(appointmentId),
                filesApi.getByAppointment(appointmentId),
            ]);
            setHistoricalMessages(msgs);
            setHistoricalFiles(files);
            setHistoryLoaded(true);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [appointmentId, historyLoaded, isLoadingHistory]);

    const handleSendMessage = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!message.trim()) return;
            consultationSocket.sendMessage(message.trim());
            setMessage('');
            consultationSocket.setTyping(false);
            setIsTyping(false);
        },
        [message],
    );

    const handleTyping = useCallback(
        (value: string) => {
            setMessage(value);
            if (!isTyping && value.length > 0) {
                setIsTyping(true);
                consultationSocket.setTyping(true);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                consultationSocket.setTyping(false);
            }, 2000);
        },
        [isTyping],
    );

    const addSharedFile = useCallback((file: FileRecord) => {
        setSharedFiles((prev) => (prev.some((f) => f.id === file.id) ? prev : [file, ...prev]));
    }, []);

    return {
        messages,
        sharedFiles,
        historicalMessages,
        historicalFiles,
        historyLoaded,
        isLoadingHistory,
        remoteTyping,
        message,
        previewFile,
        setPreviewFile,
        messagesEndRef,
        loadHistory,
        handleSendMessage,
        handleTyping,
        addSharedFile,
    };
}
