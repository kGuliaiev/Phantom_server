// Маршруты для работы с пользователями
// //src/routews/keyRoutes.js

import express      from 'express';
import { protect }  from '../middlewares/authMiddleware.js';

import { 
  uploadKeys, 
  checkKeyStatus, 
  requestKey, 
  deleteUsedKey
} from '../controllers/keyController.js';

const router = express.Router();

// Маршруты для работы с ключами
router.post('/upload-keys',         protect,    uploadKeys);
router.post('/check-key-status',    protect,    checkKeyStatus);
router.post('/request-key',         protect,    requestKey);
router.post('/delete-used-key',     protect,    deleteUsedKey);

export default router;