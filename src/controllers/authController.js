// src/controllers/authController.js
import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Регистрация пользователя
export const registerUser = async (req, res) => {
    console.log('📝 Попытка регистрации пользователя');
    try {
        const { username, password, publicKey, identifier, identityKey, signedPreKey, oneTimePreKeys } = req.body;

        console.log('Полученные данные:', {
            username,
            password,
            publicKey,
            identifier,
            identityKey,
            signedPreKey,
            oneTimePreKeys
        });

        if (!username || !password || !publicKey || !identifier || !identityKey || !signedPreKey || !Array.isArray(oneTimePreKeys)) {
            console.log('❌ Отсутствуют обязательные поля');
            return res.status(400).json({ message: 'Все поля обязательны для регистрации' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('⚠️ Пользователь уже существует');
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            publicKey,
            identifier,
            identityKey,
            signedPreKey,
            oneTimePreKeys,
            lastSeen: new Date()
        });

        await user.save();

        console.log('✅ Пользователь успешно зарегистрирован');
        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
        console.error('❗ Ошибка регистрации:', error);
        res.status(500).json({ message: 'Ошибка регистрации на сервере' });
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