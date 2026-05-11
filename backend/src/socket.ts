import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './config';
import { assertTokenNotRevoked } from './modules/auth/auth.service';
import { verifyToken, JwtPayload } from './utils';
import { prisma } from './db';

interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        role: string;
    };
}

interface SendMessagePayload {
    appointmentId: string;
    content: string;
}

interface FileSharedPayload {
    appointmentId: string;
    fileId: string;
}

interface TypingPayload {
    appointmentId: string;
    isTyping: boolean;
}

export function initializeSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: config.frontendUrl,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token as string | undefined;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        void (async () => {
            try {
                const decoded: JwtPayload = verifyToken(token);
                await assertTokenNotRevoked(decoded.sub, decoded.tv);
                socket.data.userId = decoded.sub;
                socket.data.role = decoded.role;
                next();
            } catch {
                next(new Error('Invalid or expired token'));
            }
        })();
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.data.userId;

        // Join user's personal room for direct notifications
        socket.join(`user:${userId}`);

        // Join consultation room
        socket.on('join-consultation', async (appointmentId: string) => {
            try {
                const appointment = await prisma.appointment.findUnique({
                    where: { id: appointmentId },
                    include: { patient: true, doctor: true },
                });

                if (!appointment) {
                    socket.emit('error', { message: 'Appointment not found' });
                    return;
                }

                const isDoctor = appointment.doctor.userId === userId;
                const isPatient = appointment.patient.userId === userId;

                if (!isDoctor && !isPatient) {
                    socket.emit('error', { message: 'Not authorized for this consultation' });
                    return;
                }

                const roomName = `consultation:${appointmentId}`;
                socket.join(roomName);

                // Fetch existing messages for this appointment
                const messages = await prisma.message.findMany({
                    where: { appointmentId },
                    include: {
                        sender: { select: { id: true, name: true, role: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                });

                socket.emit('joined', {
                    appointmentId,
                    messages,
                    role: isDoctor ? 'doctor' : 'patient',
                });

                // Notify others in the room
                socket.to(roomName).emit('participant-joined', {
                    userId,
                    role: isDoctor ? 'doctor' : 'patient',
                });
            } catch (error) {
                console.error('[Socket] Error joining consultation:', error);
                socket.emit('error', { message: 'Failed to join consultation' });
            }
        });

        // Leave consultation room
        socket.on('leave-consultation', (appointmentId: string) => {
            const roomName = `consultation:${appointmentId}`;
            socket.leave(roomName);
            socket.to(roomName).emit('participant-left', { userId });
        });

        // Handle chat messages
        socket.on('send-message', async (data: SendMessagePayload) => {
            try {
                const { appointmentId, content } = data;

                if (!content?.trim()) {
                    socket.emit('error', { message: 'Message content is required' });
                    return;
                }

                const appointment = await prisma.appointment.findUnique({
                    where: { id: appointmentId },
                    include: { patient: true, doctor: true },
                });

                if (!appointment) {
                    socket.emit('error', { message: 'Appointment not found' });
                    return;
                }

                const isDoctor = appointment.doctor.userId === userId;
                const isPatient = appointment.patient.userId === userId;

                if (!isDoctor && !isPatient) {
                    socket.emit('error', { message: 'Not authorized' });
                    return;
                }

                const receiverId = isDoctor
                    ? appointment.patient.userId
                    : appointment.doctor.userId;

                const message = await prisma.message.create({
                    data: {
                        senderId: userId,
                        receiverId,
                        appointmentId,
                        content: content.trim(),
                    },
                    include: {
                        sender: { select: { id: true, name: true, role: true } },
                    },
                });

                const roomName = `consultation:${appointmentId}`;
                io.to(roomName).emit('new-message', message);
            } catch (error) {
                console.error('[Socket] Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle file shared notification
        socket.on('file-shared', async (data: FileSharedPayload) => {
            try {
                const { appointmentId, fileId } = data;

                const file = await prisma.file.findUnique({
                    where: { id: fileId },
                    include: {
                        uploadedBy: { select: { id: true, name: true, role: true } },
                    },
                });

                if (!file) {
                    socket.emit('error', { message: 'File not found' });
                    return;
                }

                const roomName = `consultation:${appointmentId}`;
                io.to(roomName).emit('file-uploaded', {
                    file: {
                        id: file.id,
                        originalName: file.originalName,
                        mimeType: file.mimeType,
                        type: file.type,
                        uploadedBy: file.uploadedBy,
                        createdAt: file.createdAt,
                    },
                });
            } catch (error) {
                console.error('[Socket] Error sharing file:', error);
                socket.emit('error', { message: 'Failed to share file' });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data: TypingPayload) => {
            const { appointmentId, isTyping } = data;
            const roomName = `consultation:${appointmentId}`;
            socket.to(roomName).emit('user-typing', {
                userId,
                isTyping,
            });
        });

        // Handle video call events
        socket.on('call-started', (appointmentId: string) => {
            const roomName = `consultation:${appointmentId}`;
            socket.to(roomName).emit('call-started', { userId });
        });

        socket.on('call-ended', (appointmentId: string) => {
            const roomName = `consultation:${appointmentId}`;
            socket.to(roomName).emit('call-ended', { userId });
        });
    });

    return io;
}
