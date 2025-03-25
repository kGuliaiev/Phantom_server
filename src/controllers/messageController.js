import Message from '../model/message.js';

export const receiveMessages = async (req, res) => {
  try {
    const { receiverId } = req.query;
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID обязателен' });
    }

    const messages = await Message.find({
      $or: [{ receiverId }, { senderId: receiverId }],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};