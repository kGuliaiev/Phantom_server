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
    
    // Получаем экземпляр WebSocket и ретранслируем событие clearChat для обоих участников
    const io = req.app.get('io');
    io.emit('chatCleared', { contactId, clearedBy: currentId });

    return res.status(200).json({ message: 'Переписка удалена' });
  } catch (error) {
    console.error('Ошибка при удалении переписки:', error);
    return res.status(500).json({ message: 'Ошибка сервера при удалении переписки' });
  }
};