import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';

const router = express.Router();

// Получение профиля пользователя (только для авторизованных пользователей)
router.get('/profile', protect, getUserProfile);

// Обновление профиля пользователя
router.put('/profile', protect, updateUserProfile);

export default router;
