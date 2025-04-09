import dotenv from 'dotenv';
dotenv.config();

import express                    from 'express';
import cors                       from 'cors';
import helmet                     from 'helmet';
import rateLimit                  from 'express-rate-limit';
import http                       from 'http';
import { Server }                 from 'socket.io';

import authRoutes                 from './routes/authRoutes.js';
import connectDB                  from './config/db.js';
import routes                     from './routes/index.js';
import contactRoutes              from './routes/contactRoutes.js';
import messageRoutes              from './routes/messageRoutes.js';
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { requestLogger }          from './middlewares/requestLogger.js';
import { handleConnection }       from './controllers/chatController.js';
import { v4 as uuidv4 }           from 'uuid'; // Добавь в начало файла
import { onlineUsers }            from './utils/onlineUsers.js';

// Подключение к базе данных MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});



// Сохранение экземпляра WebSocket в приложении (при необходимости)
app.set('io', io); // Устанавливаем экземпляр io в приложение, чтобы можно было использовать его в других частях (например, в контроллерах)

import jwt from 'jsonwebtoken';
import { getUserByIdentifierAndUsernameHash } from './controllers/userController.js';
// позже динамически импортируется: const Contact = (await import('./models/Contact.js')).default;

io.on('connection', (socket) => {
  socket.on('identify', async ({ identifier, usernameHash, token }) => {
    try {
      if (!token) return socket.disconnect(true);

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      if (!decoded?.userId) return socket.disconnect(true);

      const user = await getUserByIdentifierAndUsernameHash(identifier, usernameHash);
      if (!user || user._id.toString() !== decoded.userId) return socket.disconnect(true);

      console.log(`🟢 ${identifier} (${user.nickname}) — авторизован по WebSocket (${socket.id})`);
      onlineUsers.set(identifier, {
        socketId: socket.id,
        nickname: user.nickname,
      });
      socket.user = { identifier };

      // Получить список владельцев, у которых этот пользователь в контактах
      const Contact = (await import('./models/contact.js')).default;
      const owners = await Contact.find({ contactId: identifier }).select('owner').lean();
      const uniqueOwners = [...new Set(owners.map(o => o.owner.toString()))];
      console.log(`📣 [Online Update] Пользователь ${identifier} связан с:`, uniqueOwners);
 
      for (const owner of uniqueOwners) {
        console.log(`📡 Отправка статуса ${identifier} онлайн -> ${owner}`);
        const target = onlineUsers.get(owner);
        if (target?.socketId) {
          io.to(target.socketId).emit('userOnline', { identifier, isOnline: true });
        }
      }
 
      const myContacts = await Contact.find({ owner: identifier }).select('contactId').lean();
      const connectedContacts = myContacts.map(c => c.contactId.toString());
      console.log(`🔗 Контакты ${identifier}:`, connectedContacts);
 
      const result = new Set();
      result.add(identifier); // всегда включаем самого пользователя
      connectedContacts.forEach(cid => {
        if (onlineUsers.has(cid)) {
          result.add(cid);
        }
      });
      const finalResult = Array.from(result);
      console.log(`🟢 Онлайн-контакты ${identifier}:`, finalResult);
      io.to(socket.id).emit('onlineUsers', finalResult);
 
      // ⏱️ Периодическая отправка подтверждения онлайн-статуса (опционально)
      const intervalId = setInterval(() => {
        if (onlineUsers.has(identifier)) {
          for (const owner of uniqueOwners) {
            const target = onlineUsers.get(owner);
            if (target?.socketId) {
              io.to(target.socketId).emit('userOnline', { identifier, isOnline: true });
            }
          }
        }
      }, 10000);
      socket.data.intervalId = intervalId;

    } catch (err) {
      return socket.disconnect(true);
    }
  });

  socket.on('disconnect', async () => {
    if (!socket.user?.identifier) return;

    const identifier = socket.user.identifier;
    const userEntry = onlineUsers.get(identifier);
    if (!userEntry) return;

    if (socket.data.intervalId) {
      clearInterval(socket.data.intervalId);
    }

    onlineUsers.delete(identifier);

    const Contact = (await import('./models/contact.js')).default;
    const owners = await Contact.find({ contactId: identifier }).select('owner').lean();
    const uniqueOwners = [...new Set(owners.map(o => o.owner.toString()))];
   // console.log(`📣 [Offline Update] Пользователь ${identifier} был связан с:`, uniqueOwners);
 
    for (const owner of uniqueOwners) {
      if (onlineUsers.has(owner)) {
        console.log(`📡 Отправка статуса ${identifier} оффлайн -> ${owner}`);
        const target = onlineUsers.get(owner);
        if (target?.socketId) {
          io.to(target.socketId).emit('userOnline', { identifier, isOnline: false });
        }
      }
    }

    console.log(`🔴 ${identifier} (${userEntry.nickname}) — Пользователь offline (${socket.id})`);
  });

  socket.on('chatClearedAck', ({ contactId, clearedBy, from }) => {
    console.log(`📨 chatClearedAck получен от ${from} (очищено для contactId=${contactId})`);
    // Найти socketId того, кто иницировал удаление (clearedBy), чтобы отправить ему уведомление
    const target = onlineUsers.get(clearedBy);
    if (target?.socketId) {
      io.to(target.socketId).emit('chatClearedAck', { contactId, from });
    }
  });
  
});

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
app.use('/api',           routes);

app.use('/api/auth',      authRoutes);
app.use('/api/contacts',  contactRoutes);
app.use('/api/message',   messageRoutes);
//app.use('/api/key',       keyRoutes);
//app.use('/api/user',      userRoutes);
//app.use('/api/chat',      chatRoutes);


// Middleware для обработки ошибок
app.use(notFound);
app.use(errorHandler);

// WebSocket обработка

// Вывод загруженных маршрутов для отладки
// app._router.stack.forEach((r) => {
//   if (r.route && r.route.path) {
//     console.log(`Маршрут: ${r.route.path} - Методы: ${Object.keys(r.route.methods)}`);
//   }
// });

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
