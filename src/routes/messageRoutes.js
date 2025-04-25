import express from 'express';

import { sendMessage, receiveMessages }     from '../controllers/messageController.js';
import { clearConversation }                from '../controllers/messageController.js';
import { protect }                          from '../middlewares/authMiddleware.js';


const router = express.Router();

router.post('/send',        sendMessage);
router.get('/receive',       receiveMessages);
router.delete('/clear', protect,     clearConversation);

export default router;