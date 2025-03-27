// Файл: src/models/contact.js

import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  owner: { type: String, required: true },       // username владельца записной книги
  contactId: { type: String, required: true },   // username добавленного пользователя
  nickname: { type: String, required: true },    // имя, которое ввёл владелец
  publicKey: { type: String, required: true },   // публичный ключ контакта
}, {
  timestamps: true // ✅ добавит createdAt и updatedAt автоматически
});

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;