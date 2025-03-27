import express from 'express';
import { deleteUserCompletely } from '../controllers/userController.js';
import {
    registerUser,
    loginUser,
    checkUserByIdentifier,
    validateToken,
} from '../controllers/authController.js';

const router = express.Router();
router.post('/register', registerUser); // Регистрация
router.post('/login', loginUser); // Вход

router.get('/validate-token', validateToken);

//router.get('/check-user', checkIdentifier);
router.get('/check-user', checkUserByIdentifier); // 👈 Добавь это

export default router;
