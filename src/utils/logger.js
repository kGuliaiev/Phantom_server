import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatController from './controllers/chatController.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { logEvent } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'logs', 'server.log');

// Создание папки logs, если ее нет
if (!fs.existsSync(path.dirname(logFilePath))) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

// Функция логирования
export const logEvent = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error('Ошибка при записи в лог:', err);
    });

    console.log(logMessage.trim());
};

// Подключение к MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Ограничение запросов (DDoS защита)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Подключение маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// WebSocket обработка
io.on('connection', (socket) => {
    logEvent(`Новое WebSocket-соединение: ${socket.id}`);
    chatController.handleConnection(socket);
});

// Обработка ошибок
app.use(notFound);
app.use(errorHandler);

// Запуск сервера
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    const message = `Сервер запущен на порту ${PORT}`;
    console.log(message);
    logEvent(message);
});