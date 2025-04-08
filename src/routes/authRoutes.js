import express from 'express';
//import { deleteUserCompletely } from '../controllers/userController.js';
import {
    generateUniqueIdentifier, 
    registerUser,
    loginUser,
    checkUserByIdentifier,
    validateToken,
} from '../controllers/authController.js';

const router = express.Router();


router.get('/generateUniqueIdentifier',     generateUniqueIdentifier)// Генерация уникального идентификатора

router.post('/register',                    registerUser); // Регистрация
router.post('/login',                       loginUser); // Вход

router.get('/validate-token',               validateToken);// Проверка токена

router.get('/check-user',                   checkUserByIdentifier); // Проверка существования пользователя по идентификатору

export default router;
