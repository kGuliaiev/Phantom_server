import dotenv from 'dotenv';
dotenv.config();

import express                    from 'express';
import cors                       from 'cors';
import helmet                     from 'helmet';
import rateLimit                  from 'express-rate-limit';
import http                       from 'http';
import jwt                        from 'jsonwebtoken';
import fs                         from 'fs';
import path                       from 'path';
import { Server }                 from 'socket.io';


import connectDB                  from './config/db.js';
import authRoutes                 from './routes/authRoutes.js';
import routes                     from './routes/index.js';
import contactRoutes              from './routes/contactRoutes.js';
import messageRoutes              from './routes/messageRoutes.js';

import { errorHandler, notFound } from './middlewares/errorMiddleware.js';
import { requestLogger }          from './middlewares/requestLogger.js';

import { getUserByIdentifierAndUsernameHash } from './controllers/userController.js';
import { handleConnection }       from './controllers/chatController.js';
import { v4 as uuidv4 }           from 'uuid';
import onlineUsers            from './utils/onlineUsers.js';

// Подключение к базе данных MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Сохранение экземпляра WebSocket в приложении (при необходимости)
app.set('io', io); // Устанавливаем экземпляр io в приложение, чтобы можно было использовать его в других частях (например, в контроллерах)



function logWebSocketEvent(event, details) {
  const now = new Date().toISOString();
  const ip = details.ip || 'unknown';
  const logEntry = `[${now}][IP: ${ip}][File: index.js] EVENT: ${event} - ${JSON.stringify(details)}\n`;
  const logFilePath = path.join(process.cwd(), 'logs', 'websocket.log');
  fs.appendFileSync(logFilePath, logEntry);
}


// позже динамически импортируется: const Contact = (await import('./models/Contact.js')).default;

io.on('connection', (socket) => {

  
  socket.on('identify', async ({ identifier, usernameHash, token }) => {
    try {
      if (!token) return socket.disconnect(true);
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      if (!decoded?.userId) return socket.disconnect(true);
  
      const user = await getUserByIdentifierAndUsernameHash(identifier, usernameHash);
      if (!user || user._id.toString() !== decoded.userId) return socket.disconnect(true);
  
      //console.log(`🟢 ${identifier} (${user.nickname}) — авторизован по WebSocket (${socket.id})`);
      onlineUsers.set(identifier, {
        socketId: socket.id,
        nickname: user.nickname,
      });
      socket.user = { identifier };
  
      // Получить список владельцев, у которых этот пользователь в контактах...
      const Contact = (await import('./models/contact.js')).default;
      const owners = await Contact.find({ contactId: identifier }).select('owner').lean();
      const uniqueOwners = [...new Set(owners.map(o => o.owner.toString()))];
      //console.log(`📣 [Online Update] Пользователь ${identifier} связан с:`, uniqueOwners);
   
      for (const owner of uniqueOwners) {
        //console.log(`📡 Отправка статуса ${identifier} онлайн -> ${owner}`);
        const target = onlineUsers.get(owner);
        if (target?.socketId) {
          io.to(target.socketId).emit('userOnline', { identifier, isOnline: true });
        }
      }
   
      const myContacts = await Contact.find({ owner: identifier }).select('contactId').lean();
      const connectedContacts = myContacts.map(c => c.contactId.toString());
      //console.log(`🔗 Контакты ${identifier}:`, connectedContacts);
   
      const result = new Set();
      result.add(identifier); // всегда включаем самого пользователя
      connectedContacts.forEach(cid => {
        if (onlineUsers.has(cid)) {
          result.add(cid);
        }
      });
      const finalResult = Array.from(result);
      //console.log(`🟢 Онлайн-контакты ${identifier}:`, finalResult);
      io.to(socket.id).emit('onlineUsers', finalResult);
   
      // Отправляем буферизированные сообщения, если таковые есть для данного пользователя
      if (global.messageBuffer && global.messageBuffer.has(identifier)) {
        const bufferedMessages = global.messageBuffer.get(identifier);
        bufferedMessages.forEach((message) => {
          io.to(socket.id).emit('message', {
            sender: message.senderId,
            encrypted: message.encryptedContent || message.encrypted,
            iv: message.iv,
            timestamp: message.timestamp,
            messageId: message.messageId
          });
          console.log(`📤 Отправляем буферизованное сообщение ${message.messageId} для ${identifier}`);
        });
        global.messageBuffer.delete(identifier);
      }
      // Отправляем буферизированные обновления статусов сообщений, если таковые есть для данного пользователя
      if (global.statusBuffer && global.statusBuffer.has(identifier)) {
        const bufferedStatuses = global.statusBuffer.get(identifier);
        bufferedStatuses.forEach((bufferedData) => {
          io.to(socket.id).emit('messageAttributeChanged', bufferedData);
          console.log(`📤 Отправляем буферизованный статус сообщения для ${identifier}:`, bufferedData);
        });
        global.statusBuffer.delete(identifier);
      }
      // После отправки onlineUsers и onlineUsers событие, прежде чем завершить идентификацию:
      // Отправка всех сообщений, по которым нет ACK 'delivered'
      const Message = (await import('./models/message.js')).default;
      const undelivered = await Message.find({
        'recipients.userId': identifier,
        'recipients.status': 'sent'
      });
      for (const msg of undelivered) {
        io.to(socket.id).emit('message', {
          sender: msg.senderId,
          encrypted: msg.encryptedContent,
          iv: msg.iv,
          timestamp: msg.timestamp,
          messageId: msg.messageId
        });
        console.log(`🔄 Повторная доставка сообщения ${msg.messageId} для ${identifier}`);
      }
   
      // Периодическая отправка статуса "онлайн"
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
        //console.log(`📡 Отправка статуса ${identifier} оффлайн -> ${owner}`);
        const target = onlineUsers.get(owner);
        if (target?.socketId) {
          io.to(target.socketId).emit('userOnline', { identifier, isOnline: false });
        }
      }
    }

    console.log(`🔴 ${identifier} (${userEntry.nickname}) — Пользователь offline (${socket.id})`);
  });


  socket.on('messageAttributeChanged', async (data) => {
    // data: { messageId, attribute, value, sender, receiver }
    const { messageId, attribute, value, sender, receiver } = data;
    // После загрузки сообщения из базы, проверяем оригинального отправителя
    try {
      const Message = (await import('./models/message.js')).default;
      const msg = await Message.findOne({ messageId });
      let originalSender = msg?.senderId;
      if (!originalSender && receiver) {
        originalSender = receiver;
      }
      if (!msg) {
        console.log(`Fallback to receiver for originalSender: ${originalSender}`);
      }
      if ((value === 'delivered' || value === 'seen') && socket.user?.identifier === originalSender) {
        console.log(`⚠️ Ignoring self-ACK of ${value} for message ${messageId}`);
        return;
      }
      console.log('Получено обновление статуса сообщения на сервере:', data);
      const now = new Date().toLocaleString();
      const shortId = messageId?.slice(0, 4) || '----';
      console.log(`📩 msg=${shortId} ${sender} ➡ status=${value} @ ${now}`);
      if (msg) {
        msg.status = value;
        await msg.save();
       // console.log(`Статус сообщения ${messageId} обновлен в базе на "${value}"`);
      } else {
       // console.log(`Сообщение с ID ${messageId} не найдено в базе.`);
      }
      // Теперь пересылаем обновление отправителю (используем originalSender)
      const senderEntry = onlineUsers.get(originalSender);
      if (senderEntry && senderEntry.socketId) {
        io.to(senderEntry.socketId).emit('messageAttributeChanged', { messageId, attribute, value, sender });
        console.log(`Отправлено обновление статуса сообщения ${messageId} отправителю ${originalSender}`);
      } else {
        console.log(`Отправитель ${originalSender} не в сети или не найден.`);
        if (!global.statusBuffer) {
          global.statusBuffer = new Map();
        }
        const pendingStatuses = global.statusBuffer.get(originalSender) || [];
        pendingStatuses.push({ messageId, attribute, value, sender, receiver });
        global.statusBuffer.set(originalSender, pendingStatuses);
        console.log(`🗄️ Буферизация статуса для ${originalSender}:`, { messageId, attribute, value });
      }
    } catch (error) {
      console.error('Ошибка обновления статуса сообщения в базе:', error);
    }
  });


  socket.on('chatClearedAck', ({ contactId, clearedBy, from }) => {
    //logWebSocketEvent('chatClearedAck_received', { from, contactId, ip: socket.handshake && socket.handshake.address });
    console.log(`📨 chatClearedAck получен от ${from} (очищено для contactId=${contactId})`);
    // Найти socketId того, кто иницировал удаление (clearedBy), чтобы отправить ему уведомление
    const target = onlineUsers.get(clearedBy);
    if (target?.socketId) {
      io.to(target.socketId).emit('chatClearedAck', { contactId, from });
    }
  });
  
});



// Ограничение количества запросов (DDoS защита)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});


// WebSocket обработка

// Вывод загруженных маршрутов для отладки
// app._router.stack.forEach((r) => {
//   if (r.route && r.route.path) {
//     console.log(`Маршрут: ${r.route.path} - Методы: ${Object.keys(r.route.methods)}`);
//   }
// });

// Middleware для парсинга JSON и логирования запросов
app.use(express.json());
app.use(requestLogger);
app.use(cors());
app.use(helmet());

app.use('/api',           apiLimiter);
app.use('/api',           routes);

app.use('/api/auth',      authRoutes);
app.use('/api/contacts',  contactRoutes);
app.use('/api/message',   messageRoutes);

// Middleware для обработки ошибок
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));