import Message from '../models/message.js';
import { v4 as uuidv4 } from 'uuid';
import { onlineUsers } from '../utils/onlineUsers.js';


export const receiveMessages = async (req, res) => {
  try {
    const { receiverId } = req.query;
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID обязателен' });
    }

    const messages = await Message.find({
      $or: [{ receiverId }, { senderId: receiverId }],
    }).sort({ createdAt: 1 });

    console.log('📥 Получение сообщений для:', receiverId);
    console.log('📦 Сообщений найдено:', messages.length);
    await Promise.all(
      messages.map(async (msg) => {
        if (!msg.recipients || !Array.isArray(msg.recipients)) return;
        
        let updated = false;
        msg.recipients = msg.recipients.map(r => {
          if (r.userId.toString() === receiverId && r.status === 'sent') {
            r.status = 'delivered';
            updated = true;
          }
          return r;
        });
        
        if (updated) {
          await msg.save();
          console.log('✏️ Статус сообщения', msg.messageId, 'обновлён на delivered');
        }
      })
    );

    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    console.log('📨 Получен запрос на отправку сообщения:', req.body);
    const { senderId, receiverId, chatId, encryptedContent, iv } = req.body;
    if (!senderId || !receiverId || !chatId || !encryptedContent || !iv) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    console.log('🧪 uuidv4 =', uuidv4)
    const messageId = uuidv4();
    const newMessage = new Message({
      messageId,
      chatId,
      senderId,
      receiverId,
      encryptedContent,
      iv,
      recipients: [
        {
          userId: receiverId,
          status: 'sent',
        },
      ],
    });

    await newMessage.save();
    const io = req.app.get('io');
    const target = onlineUsers.get(receiverId);
    if (target?.socketId) {
      console.log('📨 WebSocket emit для получателя:', target.socketId);
      io.to(target.socketId).emit('message', {
        sender: senderId,
        encrypted: encryptedContent,
        iv,
        timestamp: newMessage.timestamp,
        messageId: newMessage.messageId
      });
    }
    console.log('✅ Сообщение сохранено и отправлено:', newMessage);
    console.log('📤 Отправлено сообщение от', senderId, '->', receiverId, ':', encryptedContent);
    res.status(201).json({ message: 'Сообщение отправлено', newMessage: { _id: newMessage._id, messageId: newMessage.messageId, status: 'sent' } });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};