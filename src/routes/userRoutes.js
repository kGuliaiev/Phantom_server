import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getAllUsers } from '../controllers/userController.js';
import { 
  getUserProfile, 
  updateUserProfile, 
  generateUniqueIdentifier, 
  checkIdentifier, 
  getPublicKeyByIdentifier, 
  deactivateUser 
} from '../controllers/userController.js';


import { 
  uploadKeys, 
  checkKeyStatus, 
  requestKey, 
  deleteUsedKey 
} from '../controllers/keyController.js';

const router = express.Router();

// Маршруты для профиля
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Маршруты для идентификаторов
router.get('/generateUniqueIdentifier', generateUniqueIdentifier);
router.post('/check-identifier', checkIdentifier);
router.post('/get-public-key', getPublicKeyByIdentifier);
router.put('/deactivate', protect, deactivateUser);

// Маршруты для работы с ключами
router.post('/upload-keys', protect, uploadKeys);
router.post('/check-key-status', protect, checkKeyStatus);
router.post('/request-key', protect, requestKey);
router.post('/delete-used-key', protect, deleteUsedKey);

// Получение всех пользователей
router.get('/', getAllUsers);

export default router;