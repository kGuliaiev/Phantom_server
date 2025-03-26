import express from 'express';
import { deleteUserCompletely } from '../controllers/userController.js';
import {
    registerUser,
    loginUser,
    checkIdentifier,
} from '../controllers/authController.js';

const router = express.Router();
router.post('/register', registerUser); // Регистрация
router.post('/login', loginUser); // Вход

router.get('/check-user', checkIdentifier);

export default router;