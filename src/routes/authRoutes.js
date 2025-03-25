import express from 'express';
import { deleteUserCompletely } from '../controllers/userController.js';
import { 
    registerUser, 
    loginUser, 
    resetPasswordRequest, 
    resetPassword, 
    enable2FA, 
    verify2FA 
} from '../controllers/authController.js';

import { generateUniqueIdentifier } from '../controllers/authController.js';

const router = express.Router();
router.post('/register', registerUser); // Регистрация
router.post('/login', loginUser); // Вход

// 🔹 Список пользователей
router.get('/users', async (req, res) => {
    try {
      const users = await User.find({}, 'username identifier');
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка загрузки пользователей' });
    }
  });
  
router.post('/reset-password-request', resetPasswordRequest); // Сброс пароля
router.post('/reset-password', resetPassword);

router.post('/enable-2fa', enable2FA); // 2FA
router.post('/verify-2fa', verify2FA);

router.get('/generate-identifier', generateUniqueIdentifier);

router.delete('/users/:username/full-delete', deleteUserCompletely);

export default router;