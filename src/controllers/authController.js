// src/controllers/authController.js
import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Функция кодирования в Base64
const toBase64 = (str) => Buffer.from(str, 'utf-8').toString('base64');

// 🔐 Утилита для проверки base64
const isBase64 = (str) => {
    return typeof str === 'string' && /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;
  };
  
  // Регистрация нового пользователя с ключами
  export const registerUser = async (req, res) => {
    try {
      const { username, password, identifier, publicKey, identityKey, signedPreKey, oneTimePreKeys } = req.body;
  
      console.log('\n📝 Попытка регистрации пользователя');
      console.log('Полученные данные:', {
        username,
        identifier,
        publicKey,
        identityKey,
        signedPreKey,
        oneTimePreKeys: Array.isArray(oneTimePreKeys) ? oneTimePreKeys.length : 'не массив'
      });
  
      if (!username || !password || !identifier || !publicKey || !identityKey || !signedPreKey || !oneTimePreKeys) {
        console.log('❌ Не все поля переданы');
        return res.status(400).json({ message: 'Все поля обязательны для регистрации' });
      }
  
      if (!isBase64(identityKey)) {
        console.log('❌ Формат одного из ключей неверен (не Base64)');
        return res.status(400).json({ message: 'Некорректный формат identityKey (должен быть Base64)' });
      }
  
      if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length === 0) {
        console.log('❌ Формат одного из одноразовых ключей неверен');
        return res.status(400).json({ message: 'oneTimePreKeys должен быть массивом с ключами' });
      }
  
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        console.log('⚠️ Username уже существует:', username);
        return res.status(409).json({ message: 'Пользователь с таким именем уже существует' });
      }
  
      const existingIdentifier = await User.findOne({ identifier });
      if (existingIdentifier) {
        console.log('⚠️ Identifier уже используется:', identifier);
        return res.status(409).json({ message: 'Такой идентификатор уже зарегистрирован' });
      }
  
      console.log('🔐 Хеширование пароля для:', username);
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Хеш пароля получен');
  
      const newUser = new User({
        username,
        password: hashedPassword,
        identifier,
        publicKey,
        identityKey,
        signedPreKey,
        oneTimePreKeys,
        lastSeen: new Date(),
      });
  
      await newUser.save();
      console.log('✅ Пользователь успешно зарегистрирован');
  
      res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
      console.error('❗ Ошибка при регистрации:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };


// Вход пользователя (login)
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  console.log('🔐 Попытка входа:');
  console.log('Username:', username);
  console.log('Password (переданный):', password);

  try {
    const user = await User.findOne({ username });

    if (!user) {
      console.log('⚠️ Пользователь не найден!');
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    console.log('✅ Пользователь найден. Проверка пароля...');

    const isMatch = await bcrypt.compare(password, user.password);

    console.log('Сравнение bcrypt:', isMatch);

    if (!isMatch) {
      console.log('❌ Пароль не совпадает!');
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    console.log('✅ Успешный вход. Выдаётся токен.');

    res.json({
      token,
      userId: user._id,
      username: user.username
    });
  } catch (err) {
    console.log('❗ Ошибка при входе:', err.message);
    res.status(500).json({ message: 'Ошибка входа', error: err.message });
  }
};

// Запрос сброса пароля
export const resetPasswordRequest = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            console.error('Ошибка: Пользователь не найден');
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Генерируем код подтверждения (6 цифр)
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
        await User.updateOne(
            { username },
            {
                resetCode: resetCodeHash,
                resetCodeExpires: Date.now() + 15 * 60 * 1000,
            }
        );

        console.log(`Код для сброса пароля: ${resetCode}`);

        res.json({ message: 'Код сброса пароля отправлен' });
    } catch (error) {
        console.error('Ошибка при запросе сброса пароля:', error);
        res.status(500).json({ message: 'Ошибка при запросе сброса пароля' });
    }
};

// Подтверждение кода и смена пароля
export const resetPassword = async (req, res) => {
    try {
        const { username, resetCode, newPassword } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.resetCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Неверный или просроченный код' });
        }
        const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
        if (user.resetCode !== resetCodeHash) {
            return res.status(400).json({ message: 'Неверный код сброса' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        await user.save();

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при сбросе пароля' });
    }
};

// Включение 2FA (OTP-код)
export const enable2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Генерируем секретный ключ для Google Authenticator
        user.twoFactorSecret = crypto.randomBytes(10).toString('hex');
        user.twoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA включена', secret: user.twoFactorSecret });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при включении 2FA' });
    }
};

// Проверка 2FA при входе
export const verify2FA = async (req, res) => {
    try {
        const { username, otp } = req.body;
        const user = await User.findOne({ username });

        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA не активирована' });
        }

        if (otp !== user.twoFactorSecret) {
            return res.status(401).json({ message: 'Неверный код 2FA' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: '2FA подтверждена', token });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки 2FA' });
    }
};

export const generateUniqueIdentifier = (req, res) => {
    const uniqueId = 'id_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    res.json({ identifier: uniqueId });
  };


  // Удаление всех данных пользователя
export const deleteUserCompletely = async (req, res) => {
    const { username } = req.params;
    try {
      await Promise.all([
        User.deleteOne({ username }),
        Chat.deleteMany({ $or: [{ senderId: username }, { receiverId: username }] }),
        Message.deleteMany({ $or: [{ senderId: username }, { receiverId: username }] }),
        Status.deleteMany({ userId: username }),
      ]);
      res.status(200).json({ message: 'Все данные пользователя удалены' });
    } catch (err) {
      console.error('Ошибка при удалении всех данных:', err);
      res.status(500).json({ message: 'Ошибка удаления' });
    }
  };