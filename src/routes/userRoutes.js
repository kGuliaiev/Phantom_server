// Маршруты для работы с пользователями
// //src/routews/userRoutes.js

import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

import { 
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


// Маршруты для идентификаторов
router.get('/generateUniqueIdentifier',        generateUniqueIdentifier);
router.post('/check-identifier',   protect,    checkIdentifier);
router.post('/get-public-key',     protect,    getPublicKeyByIdentifier);
router.put('/deactivate',          protect,    deactivateUser);

// Маршруты для работы с ключами
router.post('/upload-keys',         protect, uploadKeys);
router.post('/check-key-status',    protect, checkKeyStatus);
router.post('/request-key',         protect, requestKey);
router.post('/delete-used-key',     protect, deleteUsedKey);

export default router;