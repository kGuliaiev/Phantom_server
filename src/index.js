// Файл: src/index.js или server.js (обновлён с подключением contactsRoutes)

import dotenv from 'dotenv';
dotenv.config();

import express                    from 'express';
import cors                       from 'cors';
import helmet                     from 'helmet';
import rateLimit                  from 'express-rate-limit';
import authRoutes                 from './routes/authRoutes.js';
import http                       from 'http';
import { Server }                 from 'socket.io';
import connectDB                  from './config/db.js';
import routes                     from './routes/index.js';
import contactRoutes              from './routes/contactRoutes.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { requestLogger }          from './middlewares/requestLogger.js';
import { handleConnection }       from './controllers/chatController.js';


// Подключение к базе данных MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Сохранение экземпляра WebSocket в приложении (при необходимости)
app.set('io', io);

// Middleware для парсинга JSON и логирования запросов
app.use(express.json());
app.use(requestLogger);
app.use(cors());
app.use(helmet());

// Ограничение количества запросов (DDoS защита)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Подключение маршрутов
app.use('/api', routes);
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);

// Middleware для обработки ошибок
app.use(notFound);
app.use(errorHandler);

// WebSocket обработка
io.on('connection', handleConnection);

// Вывод загруженных маршрутов для отладки
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`Маршрут: ${r.route.path} - Методы: ${Object.keys(r.route.methods)}`);
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
