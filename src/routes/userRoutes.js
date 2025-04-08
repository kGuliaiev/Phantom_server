// Маршруты для работы с пользователями
// //src/routews/userRoutes.js

import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';

import { 
  checkIdentifier, 
  getPublicKeyByIdentifier, 
  getUserByIdentifierAndUsernameHash,
  deactivateUser 
} from '../controllers/userController.js';


const router = express.Router();


// Маршруты для идентификаторов
;

router.post('/check-identifier',   protect,    checkIdentifier);
router.post('/get-public-key',     protect,    getPublicKeyByIdentifier);
router.post('/validateTokenURL',   protect,    getUserByIdentifierAndUsernameHash);

router.put('/deactivate',          protect,    deactivateUser);


export default router;