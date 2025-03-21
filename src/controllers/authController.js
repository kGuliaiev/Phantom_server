import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Регистрация пользователя
export const registerUser = async (req, res) => {
    try {
        const { username, password, publicKey, identifier } = req.body;
        if (!username || !password || !publicKey || !identifier) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        // Передаем пароль без хеширования — pre‑hook выполнит хеширование
        const user = new User({ username, password, publicKey, identifier });
        await user.save();

        res.status(201).json({ message: 'Пользователь зарегистрирован' });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Вход пользователя (login)
export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        if (user.twoFactorEnabled) {
            return res.status(200).json({ message: 'Требуется 2FA' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
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
                resetCodeExpires: Date.now() + 15 * 60 * 1000, // Код действителен 15 минут
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

        if (otp !== user.twoFactorSecret) {  // В реальном проекте сравнивать с OTP-кодом из Google Authenticator
            return res.status(401).json({ message: 'Неверный код 2FA' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: '2FA подтверждена', token });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки 2FA' });
    }
};