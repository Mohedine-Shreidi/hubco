import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import config from './config/index.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);

/* ── Socket.io setup ───────────────────────────────────────── */
const io = new SocketServer(httpServer, {
    cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
    },
});

/** Authenticate socket connections via JWT */
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
        const user = jwt.verify(token, config.jwtSecret);
        socket.user = user;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${user.name} (${user.id})`);

    socket.on('join_room', ({ roomId }) => {
        socket.join(`room:${roomId}`);
    });

    socket.on('leave_room', ({ roomId }) => {
        socket.leave(`room:${roomId}`);
    });

    socket.on('send_message', (message) => {
        // Broadcast to the room (excluding sender)
        socket.to(`room:${message.roomId}`).emit('receive_message', message);
    });

    socket.on('typing', ({ roomId }) => {
        socket.to(`room:${roomId}`).emit('user_typing', { userId: user.id, name: user.name });
    });

    socket.on('stop_typing', ({ roomId }) => {
        socket.to(`room:${roomId}`).emit('user_stop_typing', { userId: user.id });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${user.id}`);
    });
});

/* Expose io to route handlers via app.get('io') */
app.set('io', io);

/* ── Security ──────────────────────────────────────────────── */
app.use(helmet());

/* ── CORS ──────────────────────────────────────────────────── */
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Rate limiting ─────────────────────────────────────────── */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

/* ── Body parsing ──────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Health check ──────────────────────────────────────────── */
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── API routes (/api/...) ─────────────────────────────────── */
app.use('/api', routes);

/* ── Error handler (must be last) ─────────────────────────── */
app.use(errorHandler);

/* ── Start server ──────────────────────────────────────────── */
httpServer.listen(config.port, () => {
    console.log(`[HubConnect API] running on http://localhost:${config.port} — ${config.nodeEnv}`);
});

export { app, io };
export default app;
