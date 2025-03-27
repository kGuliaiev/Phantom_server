// contactRoutes.js

import express from 'express';
const router = express.Router();

import {
  addContact,
  getContacts,
  deleteContact
} from '../controllers/contactController.js';

router.post('/add',                 addContact);
router.get('/:owner',               getContacts);
router.delete('/:owner/:contactId', deleteContact);


export default router;