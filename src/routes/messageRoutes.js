import express from 'express';
import { receiveMessages } from '../controllers/messageController.js';

const router = express.Router();

router.get('/receive', receiveMessages);

export default router;