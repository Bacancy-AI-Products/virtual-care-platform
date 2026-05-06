/**
 * Optional emitter for real-time notifications. Set once at server startup (after Socket.io
 * is initialized) so that modules like appointments/prescriptions can push to users without
 * depending on the Socket.io server instance.
 */
type EmitFn = (userId: string, payload: object) => void;

let emitFn: EmitFn | null = null;

/**
 * Called from server.ts after initializeSocket(server). Pass a function that sends the
 * payload to the user's Socket.io room (e.g. io.to('user:' + userId).emit('notification', payload)).
 */
export function setNotificationEmitter(fn: EmitFn): void {
    emitFn = fn;
}

/**
 * Emit a notification payload to a user in real time. No-op if setNotificationEmitter
 * has not been called (e.g. in tests). Used after creating a notification in the DB
 * so the client receives it immediately without polling.
 */
export function emitToUser(userId: string, payload: object): void {
    emitFn?.(userId, payload);
}
