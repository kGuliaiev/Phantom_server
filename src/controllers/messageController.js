import Message from '../models/message.js';
import { v4 as uuidv4 } from 'uuid';
import onlineUsers from '../utils/onlineUsers.js';


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
    
    await Promise.all(
      messages.map(async (msg) => {
        if (!msg.recipients || !Array.isArray(msg.recipients)) return;
        
        let updated = false;
        msg.recipients = msg.recipients.map(r => {
          if (r.userId.toString() === receiverId && r.status === 'sent') {
            r.status = 'sent';
            updated = true;
          }
          return r;
        });
        
        if (updated) {
          await msg.save();
          
          const shortId = msg.messageId.slice(0, 4);
          const now = new Date().toISOString();
          console.log(`✅ ${shortId} ${msg.senderId} → ${msg.receiverId} | статус: sent | ${now}`);
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
    const { messageId, senderId, receiverId, chatId, encryptedContent, iv, timestamp } = req.body;
    if (!messageId || !senderId || !receiverId || !chatId || !encryptedContent || !iv || !timestamp) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    //console.log('🧪 uuidv4 =', uuidv4)
    //const messageId = uuidv4();
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
      // Подтверждаем отправителю, что сервер принял сообщение
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket?.socketId) {
        io.to(senderSocket.socketId).emit('messageAttributeChanged', {
          messageId: newMessage.messageId,
          attribute: 'status',
          value: 'sent',
          sender: senderId
        });
        console.log(`☑️ Подтверждение sent для сообщения ${newMessage.messageId} отправителю ${senderId}`);
      }

      // Проверяем наличие получателя в onlineUsers
      const target = onlineUsers.get(receiverId);
      if (target?.socketId) {
        console.log('📨 WebSocket emit для получателя:', target.socketId);
        io.to(target.socketId).emit('message', {
          sender: senderId,
          receiver: receiverId,
          encrypted: encryptedContent,
          iv,
          timestamp: newMessage.timestamp,
          messageId: newMessage.messageId
        });
        console.log('📤 Отправлено сообщение от', senderId, '->', receiverId, ':', encryptedContent);
      } else {
        // Если получатель не онлайн – сохраняем сообщение в буфере
        if (!global.messageBuffer) {
          global.messageBuffer = new Map();
        }
        let buffer = global.messageBuffer.get(receiverId) || [];
        buffer.push(newMessage);
        global.messageBuffer.set(receiverId, buffer);
        console.log(`📥 Сообщение ${newMessage.messageId} сохранено в буфере для получателя ${receiverId}`);
      }
    
      
      // const shortId = messageId.slice(0, 4);
      // const now = new Date().toISOString();
      
     // res.status(201).json({ message: 'Сообщение отправлено', newMessage: { _id: newMessage._id, messageId: newMessage.messageId, status: 'sent' } });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};


// Добавляем новую функцию clearConversation для удаления переписки
export const clearConversation = async (req, res) => {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      return res.status(400).json({ message: 'contactId обязателен для удаления переписки' });
    }

    const currentId = req.user.identifier; // получаем идентификатор текущего пользователя из защищённого middleware

    // Удаляем сообщения, где текущий пользователь и собеседник участвуют в обмене
    await Message.deleteMany({
      $or: [
        { senderId: currentId, receiverId: contactId },
        { senderId: contactId, receiverId: currentId }
      ]
    });
    console.log(`🗑 Переписка между ${currentId} и ${contactId} удалена из базы`);
    
const io = req.app.get('io');
// Формируем объект с данными обоих участников
const payload = { initiator: currentId, recipient: contactId };

// Уведомляем об удалении на сервере обоих пользователей
const initiatorSocket = onlineUsers.get(currentId);
if (initiatorSocket?.socketId) {
  io.to(initiatorSocket.socketId).emit('clearServerSuccess', payload);
}
const recipientSocket = onlineUsers.get(contactId);
if (recipientSocket?.socketId) {
  io.to(recipientSocket.socketId).emit('clearServerSuccess', payload);
  // Отправляем команду на локальное удаление для абонента B
  io.to(recipientSocket.socketId).emit('chatClearRemote', { contactId: currentId });
  console.log(`Отправлено событие chatClearRemote для пользователя ${contactId} с идентификатором инициатора: ${currentId}`);
} else {
  let pendingEvents;
  try {
    pendingEvents = require('../utils/pendingEvents.js').default;
  } catch (e) {
    pendingEvents = {};
  }
  pendingEvents[contactId] = { contactId: currentId };
  console.log(`Сохранено в ожидании: удаление переписки для пользователя ${contactId}`);
}

    return res.status(200).json({ message: 'Переписка удалена' });
  } catch (error) {
    console.error('Ошибка при удалении переписки:', error);
    return res.status(500).json({ message: 'Ошибка сервера при удалении переписки' });
  }
};