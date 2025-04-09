import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
const router = express.Router();

import {
  getContacts,
  addContact,
  deleteContact,
 // respondContact
} from '../controllers/contactController.js';

router.post('/list', protect, getContacts);
router.post('/add', protect, addContact);
//router.post('/respond', protect, respondContact); // новый маршрут для ответа
router.delete('/:owner/:contactId', protect, deleteContact);

export default router;