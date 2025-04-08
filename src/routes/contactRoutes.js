// contactRoutes.js

import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
const router = express.Router();

import {
  getContacts,
  addContact,
  deleteContact
} from '../controllers/contactController.js';

router.post('/list',                protect,        getContacts);

router.post('/add',                 protect,        addContact);

router.delete('/:owner/:contactId', protect,        deleteContact);


export default router;