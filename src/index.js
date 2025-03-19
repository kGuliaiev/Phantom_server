import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import authRoutes from './routes/authRoutes.js'; // Импорт маршрутов аутентификации
import userRoutes from './routes/userRoutes.js'; // Импорт маршрутов пользователей
import chatRoutes from './routes/chatRoutes.js'; // Импорт маршрутов чатов
import { registerUser, loginUser } from './controllers/authController.js'; // Импорт контроллеров аутентификации
import { getUserProfile, updateUserProfile } from './controllers/userController.js'; // Импорт контроллеров пользователей
import { errorHandler, notFound } from './middlewares/errorMiddleware.js'; // Импорт middleware обработки ошибок
import { handleConnection } from './controllers/chatController.js'; // Импорт контроллера чатов

// Подключение к MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Сохранение `io` в `app` для использования в маршрутах
app.set('io', io);

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
app.use('/api', routes);
app.use('/api/auth', authRoutes); // Подключение маршрутов аутентификации
app.use('/api/users', userRoutes); // Подключение маршрутов пользователей
app.use('/api/chat', chatRoutes); // Подключение маршрутов чатов

// Подключение middleware обработки ошибок
app.use(notFound);
app.use(errorHandler);

// WebSocket обработка
io.on('connection', handleConnection); // Обновлено для использования контроллера чатов

// Запуск сервера
const PORT = process.env.PORT || 5001;

app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(`Маршрут: ${r.route.path} - Методы: ${Object.keys(r.route.methods)}`);
    }
});


server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));