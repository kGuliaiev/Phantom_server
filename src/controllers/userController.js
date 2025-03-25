import User     from '../models/users.js';
import Message  from '../models/message.js';
import Contact  from '../models/contact.js';
import bcrypt   from 'bcrypt';
import crypto   from 'crypto';


// Проверка уникальности идентификатора
export const checkIdentifier = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) {
            return res.status(400).json({ message: 'Не указан идентификатор' });
        }

        // Хешируем входной идентификатор перед поиском
        const identifierHash = crypto.createHash('sha256').update(identifier).digest('hex');
        const existingUser = await User.findOne({ identifierEncrypted: identifierHash });
        res.json({ unique: !existingUser });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки идентификатора' });
    }
};

// Получение списка всех пользователей
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'username identifier');
        res.json(users);
    } catch (error) {
        console.error('❌ Ошибка при получении пользователей:', error);
        res.status(500).json({ message: 'Ошибка при загрузке пользователей' });
    }
};

// Генерация уникального идентификатора
export const generateUniqueIdentifier = async (req, res) => {
    try {
      let identifier;
      let isUnique = false;
  
      while (!isUnique) {
        identifier = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-символьный HEX, e.g. 'A1C2D3E4'
        const existingUser = await User.findOne({ identifier });
        if (!existingUser) isUnique = true;
      }
  
      res.json({ identifier });
    } catch (error) {
      console.error('❌ Ошибка при генерации идентификатора:', error);
      res.status(500).json({ message: 'Ошибка генерации идентификатора' });
    }
  };

// Деактивация пользователя
export const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        user.deactivated = true;
        await user.save();

        res.json({ message: 'Пользователь деактивирован' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при деактивации' });
    }
};

// Получение публичного ключа пользователя по идентификатору
export const getPublicKeyByIdentifier = async (req, res) => {
    try {
        const { identifier } = req.body;

        const user = await User.findOne({ identifier });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json({ publicKey: user.publicKey });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении ключа' });
    }
};

// Обновление времени последнего появления онлайн
export const updateLastSeen = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        user.lastSeen = Date.now();
        await user.save();
        res.status(200).json({ message: 'Последний онлайн обновлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка обновления статуса' });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        user.username = req.body.username || user.username;
        if (req.body.password) {
            user.password = await bcrypt.hash(req.body.password, 10);
        }

        await user.save();
        res.status(200).json({ message: 'Профиль обновлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Удаление пользователя, его чатов, сообщений и ключей
export const deleteUserCompletely = async (req, res) => {
    try {
      const { username } = req.params;
  
      if (!username) {
        return res.status(400).json({ message: 'Имя пользователя не указано' });
      }
  
      console.log(`🧨 Удаление всех данных пользователя: ${username}`);
  
      // Удаляем пользователя
      await User.deleteOne({ username });
  
      // Удаляем все сообщения, где он — отправитель или получатель
      await Message.deleteMany({ $or: [{ senderId: username }, { receiverId: username }] });
  
      // Удаляем контакты (из записных книжек)
      await Contact.deleteMany({ $or: [{ owner: username }, { contact: username }] });
  
      res.status(200).json({ message: 'Все данные пользователя удалены' });
    } catch (err) {
      console.error('❌ Ошибка при полном удалении пользователя:', err);
      res.status(500).json({ message: 'Ошибка сервера при удалении данных' });
    }
  };