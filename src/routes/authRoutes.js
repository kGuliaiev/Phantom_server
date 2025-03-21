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
router.post('/register', registerUser); // Регистрация
router.post('/login', loginUser); // Вход

router.post('/reset-password-request', resetPasswordRequest); // Сброс пароля
router.post('/reset-password', resetPassword);

router.post('/enable-2fa', enable2FA); // 2FA
router.post('/verify-2fa', verify2FA);

export default router;