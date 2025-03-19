import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Запрос сброса пароля
export const resetPasswordRequest = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Генерируем код подтверждения (6 цифр)
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 15 * 60 * 1000; // Код действителен 15 минут
        await user.save();

        console.log(`Код для сброса пароля: ${resetCode}`);

        res.json({ message: 'Код сброса пароля отправлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при запросе сброса пароля' });
    }
};

// Подтверждение кода и смена пароля
export const resetPassword = async (req, res) => {
    try {
        const { username, resetCode, newPassword } = req.body;
        const user = await User.findOne({ username, resetCode });

        if (!user || user.resetCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Неверный или просроченный код' });
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

        if (otp !== user.twoFactorSecret) {  // В реальном проекте сравнивать с OTP-кодом из Google Authenticator
            return res.status(401).json({ message: 'Неверный код 2FA' });
        }

        res.json({ message: '2FA подтверждена' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки 2FA' });
    }
};