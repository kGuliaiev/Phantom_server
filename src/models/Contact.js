// Файл: src/models/contact.js

import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  owner:      { type: String, required: true },
  contactId:  { type: String, required: true },
  nickname:   { type: String, required: true },
  publicKey:  { type: String, required: true },
  status:     { 
                type: String, 
                enum: ['pending', 'accepted', 'blocked'], 
                default: 'pending' 
              },
  introduction: { type: String, default: '' }
}, {
  timestamps: true
});

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;