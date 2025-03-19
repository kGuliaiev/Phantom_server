import User from '../models/User.js';
import bcrypt from 'bcryptjs';

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