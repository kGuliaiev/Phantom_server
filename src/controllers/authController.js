import User from '../models/users.js';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    try {
        const { username, password, publicKey } = req.body;
        if (!username || !password || !publicKey) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        const user = new User({ username, password, publicKey });
        await user.save();

        res.status(201).json({ message: 'Пользователь зарегистрирован' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Неверные учетные данные' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};