import express from 'express';
import Message from '../models/message.js';

export const handleConnection = (socket) => {
    
    // Обработчик приема сообщений
    socket.on('sendMessage', async (data) => {
        console.log(`Сообщение от ${socket.id}:`, data);

        try {
            // Создание нового сообщения
            const newMessage = new Message({
                messageId: data.messageId,
                chatId: data.chatId,
                senderId: data.senderId,
                encryptedContent: data.encryptedContent,
                iv: data.iv,
                recipients: data.recipients.map(userId => ({
                    userId,
                    status: 'sent'
                }))
            });

            await newMessage.save();
            socket.broadcast.emit('receiveMessage', data);
        } catch (error) {
            console.error('Ошибка при сохранении сообщения:', error);
        }
    });

    // Обработчик обновления статуса сообщения
    socket.on('updateMessageStatus', async (data) => {
        console.log(`Обновление статуса сообщения ${data.messageId} для ${data.userId} на ${data.status}`);

        try {
            await Message.updateOne(
                { messageId: data.messageId, "recipients.userId": data.userId },
                { $set: { "recipients.$.status": data.status } }
            );
        } catch (error) {
            console.error('Ошибка при обновлении статуса сообщения:', error);
        }
    });

    // Обработчик отключения пользователя
    socket.on('disconnect', () => {
        console.log(`Пользователь отключился: ${socket.id}`);
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
