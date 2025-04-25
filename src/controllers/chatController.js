import express from 'express';
import Message from '../models/message.js';
import onlineUsers from '../utils/onlineUsers.js';

export const handleConnection = (socket) => {
    
    // Обработчик приема сообщений
    socket.on('sendMessage', async (data) => {
        console.log(`sendMessage -> Сообщение от ${socket.id}:`, data);

        try {
            // Создание нового сообщения
            const newMessage = new Message({
                messageId:          data.messageId,
                chatId:             data.chatId,
                senderId:           data.senderId,
                encryptedContent:   data.encryptedContent,
                iv:                 data.iv,
                recipients: data.recipients.map(userId => ({
                    userId,
                    status: 'sent'
                }))
            });

            await newMessage.save();
            // Immediately dispatch 'messagesUpdated' event in browser
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('messagesUpdated'));
            }
            // Подтверждение отправителю через messageAttributeChanged
            socket.emit('messageAttributeChanged', {
              messageId: newMessage.messageId,
              attribute: 'status',
              value: 'sent',
              sender: data.senderId
            });

            
            console.log(`📤 Отправлено подтверждение 'sent' для сообщения ${newMessage.messageId} отправителю ${data.senderId}`);
            console.log(`📨 Отправка WebSocket-сообщения ${newMessage.messageId} получателю:`, data.recipients);
            const io = socket.server;
            for (const userId of data.recipients) {
              const recipientEntry = onlineUsers.get(userId);
              if (recipientEntry?.socketId) {
                io.to(recipientEntry.socketId).emit('receiveMessage', data);
                console.log(`📤 Отправлено сообщение ${newMessage.messageId} получателю ${userId}`);
              } else {
                console.log(`⚠️ Получатель ${userId} не в сети, сообщение ${newMessage.messageId} буферизуется`);
              }
            }
        } catch (error) {
            console.error('Ошибка при сохранении сообщения:', error);
        }
    });

    // Обработчик обновления статуса сообщения
    socket.on('updateMessageStatus', async (data) => {
      console.log(`⚙️ Получено обновление статуса для сообщения ${data.messageId} от пользователя ${data.userId}: ${data.status}`);
      try {
        const result = await Message.updateOne(
          { messageId: data.messageId, "recipients.userId": data.userId },
          { $set: { "recipients.$.status": data.status } }
        );
        console.log(`✅ Статус сообщения ${data.messageId} обновлен в базе на "${data.status}"`);
        if (data.status === 'delivered') {
          // отправляем уведомление отправителю
          const msg = await Message.findOne({ messageId: data.messageId });
          const io = socket.server;
          const senderEntry = onlineUsers.get(msg.senderId);
          if (senderEntry?.socketId) {
            io.to(senderEntry.socketId).emit('messageAttributeChanged', {
              messageId: data.messageId,
              attribute: 'status',
              value: 'delivered',
              sender: msg.senderId
            });
            console.log(`📤 Отправлено подтверждение 'delivered' для сообщения ${data.messageId} отправителю ${msg.senderId}`);
          } else {
            console.log(`⚠️ Отправитель ${msg.senderId} не найден или не в сети`);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка при обновлении статуса сообщения:', error);
      }
    });

    // Обработчик отключения пользователя
    socket.on('disconnect', () => {
        console.log(`Пользователь отключился: ${socket.id}`);
    });

    // Новый обработчик для события 'chatClearedAck'
    socket.on('chatClearedAck', ({ contactId, from }) => {
      console.log(`Получено подтверждение от пользователя ${from} об удалении переписки для инициатора ${contactId}`);
    });
};

// Маршрут для обновления статуса сообщения
export const updateMessageStatusRoute = async (req, res) => {
    const { messageId, userId, status } = req.body;

    try {
        const message = await Message.findOneAndUpdate(
            { messageId, "recipients.userId": userId },
            { $set: { "recipients.$.status": status } },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Сообщение не найдено' });
        }

        res.status(200).json({ message: 'Статус сообщения обновлен', updatedMessage: message });
    } catch (error) {
        console.error('Ошибка при обновлении статуса сообщения:', error);
        res.status(500).json({ message: 'Ошибка при обновлении статуса' });
    }
};

export default { handleConnection, updateMessageStatusRoute };
