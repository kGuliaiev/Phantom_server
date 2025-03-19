import express from 'express';
import { 
    registerUser, 
    loginUser, 
    resetPasswordRequest, 
    resetPassword, 
    enable2FA, 
    verify2FA 
} from '../controllers/authController.js';

const router = express.Router();

// Регистрация
router.post('/register', registerUser);

// Вход
router.post('/login', loginUser);

// Сброс пароля
router.post('/reset-password-request', resetPasswordRequest);
router.post('/reset-password', resetPassword);

// 2FA
router.post('/enable-2fa', enable2FA);
router.post('/verify-2fa', verify2FA);

export default router;