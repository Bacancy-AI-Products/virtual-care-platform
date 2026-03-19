'use client';

import React from 'react';
import { Bell, Check, CheckCheck, X, Calendar, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi, type AppNotification } from '@/services/api';
import { consultationSocket } from '@/services/socket';
import { useAuth } from '@/hooks/useAuth';

// ─── Icon per notification type ───────────────────────────────────────────────

function NoteIcon({ type }: { type: string }) {
    if (type === 'APPOINTMENT_CONFIRMED')
        return (
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
        );
    if (type === 'APPOINTMENT_DECLINED' || type === 'APPOINTMENT_CANCELLED')
        return (
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-red-500" />
            </div>
        );
    if (type === 'APPOINTMENT_REQUESTED')
        return (
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-amber-600" />
            </div>
        );
    if (type === 'PRESCRIPTION_CREATED')
        return (
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-brand-600" />
            </div>
        );
    return (
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-slate-500" />
        </div>
    );
}

// ─── Single notification row ──────────────────────────────────────────────────

function NoteRow({ note, onRead }: { note: AppNotification; onRead: (id: string) => void }) {
    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group ${!note.read ? 'bg-brand-50/40' : ''}`}
            onClick={() => !note.read && onRead(note.id)}
        >
            <NoteIcon type={note.type} />
            <div className="flex-1 min-w-0">
                <p
                    className={`text-sm ${note.read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}
                >
                    {note.title}
                </p>
                {note.body && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.body}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </p>
            </div>
            {!note.read && (
                <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
            )}
        </div>
    );
}

// ─── Bell component ───────────────────────────────────────────────────────────

export function NotificationBell() {
    const { token } = useAuth();
    const qClient = useQueryClient();
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    // Fetch list when dropdown opens
    const { data } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.list({ limit: 20 }),
        enabled: !!token && open,
    });

    // Always track unread count (for the badge)
    const { data: countData } = useQuery({
        queryKey: ['notifications-count'],
        queryFn: () => notificationsApi.getUnreadCount(),
        enabled: !!token,
        refetchInterval: 30_000, // poll every 30s as fallback
    });

    const unread = countData?.count ?? 0;
    const notes = data?.notifications ?? [];

    // Real-time: subscribe to socket notification events
    React.useEffect(() => {
        if (!token) return;
        const unsub = consultationSocket.subscribeToNotifications(() => {
            qClient.invalidateQueries({ queryKey: ['notifications'] });
            qClient.invalidateQueries({ queryKey: ['notifications-count'] });
        });
        return unsub;
    }, [token, qClient]);

    // Close on outside click
    React.useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const markReadMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markRead(id),
        onSuccess: () => {
            qClient.invalidateQueries({ queryKey: ['notifications'] });
            qClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => {
            qClient.invalidateQueries({ queryKey: ['notifications'] });
            qClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
    });

    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="p-2 text-slate-400 hover:text-brand-500 transition-colors relative"
            >
                <Bell className="w-6 h-6" />
                <AnimatePresence>
                    {unread > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white px-0.5"
                        >
                            {unread > 99 ? '99+' : unread}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-2rem))] sm:left-auto sm:right-0 sm:translate-x-0 sm:w-96 sm:max-w-lg z-50"
                    >
                        <div className="mx-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Notifications
                                    </h3>
                                    {unread > 0 && (
                                        <span className="text-xs font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
                                            {unread} new
                                        </span>
                                    )}
                                </div>
                                {unread > 0 && (
                                    <button
                                        onClick={() => markAllMutation.mutate()}
                                        className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 font-semibold transition-colors"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                {notes.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">
                                            No notifications yet
                                        </p>
                                    </div>
                                ) : (
                                    notes.map((n) => (
                                        <NoteRow
                                            key={n.id}
                                            note={n}
                                            onRead={(id) => markReadMutation.mutate(id)}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {notes.length > 0 && (
                                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                                    <p className="text-xs text-slate-400 text-center">
                                        Click a notification to mark it as read
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
