// Файл: src/models/Contact.js
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  owner: { type: String, required: true }, // username владельца записной книги
  contactId: { type: String, required: true }, // username добавленного пользователя
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
