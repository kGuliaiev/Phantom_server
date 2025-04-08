import express from 'express';
import { sendMessage, receiveMessages } from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', protect, sendMessage);
router.get('/receive', protect, receiveMessages);

export default router;