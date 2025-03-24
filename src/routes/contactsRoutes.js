// Файл: src/routes/contactsRoutes.js
import express from 'express';
import Contact from '../models/Contact.js';

const router = express.Router();

// 🔹 Добавить пользователя в записную книгу
router.post('/add', async (req, res) => {
  const { owner, contactId } = req.body;

  if (!owner || !contactId) {
    return res.status(400).json({ message: 'owner и contactId обязательны' });
  }

  try {
    const existing = await Contact.findOne({ owner, contactId });
    if (existing) {
      return res.status(409).json({ message: 'Контакт уже добавлен' });
    }

    const newContact = new Contact({ owner, contactId });
    await newContact.save();
    res.status(201).json({ message: 'Контакт добавлен' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка добавления контакта', error: err.message });
  }
});

// 🔹 Получить список контактов пользователя
router.get('/:owner', async (req, res) => {
  const { owner } = req.params;
  try {
    const contacts = await Contact.find({ owner });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка загрузки контактов' });
  }
});

export default router;
