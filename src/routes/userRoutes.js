import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { 
    getUserProfile, 
    updateUserProfile, 
    generateUniqueIdentifier, 
    checkIdentifier, 
    getPublicKeyByIdentifier, 
    deactivateUser 
} from '../controllers/userController.js';

const router = express.Router();

// Получение профиля пользователя (только для авторизованных пользователей)
router.get('/profile', protect, getUserProfile);

// Обновление профиля пользователя
router.put('/profile', protect, updateUserProfile);

// Генерация уникального идентификатора
router.get('/generate-identifier', generateUniqueIdentifier);

// Проверка уникальности идентификатора
router.post('/check-identifier', checkIdentifier);

// Получение публичного ключа по идентификатору
router.post('/get-public-key', getPublicKeyByIdentifier);

// Деактивация пользователя
router.put('/deactivate', protect, deactivateUser);

export default router;