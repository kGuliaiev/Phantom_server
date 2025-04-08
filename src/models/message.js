// src/model/message.js

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';

const logFile = path.join('./logs', 'messages.log');

function logMessageEvent(event, error = null) {
  const logEntry = `[${new Date().toISOString()}] (${os.hostname()}) EVENT: ${event} ${error ? `| ERROR: ${error}` : ''}\n`;
  fs.appendFileSync(logFile, logEntry);
}

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  chatId: { type: String, required: true, default: 'default' },
  encryptedContent: { type: String, required: true },
  iv: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
});

messageSchema.post('save', function(doc) {
  logMessageEvent(`Message saved: from ${doc.senderId} to ${doc.receiverId}`);
}, function(error, doc, next) {
  logMessageEvent(`Failed to save message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  next(error);
});

messageSchema.post('remove', function(doc) {
  logMessageEvent(`Message removed: from ${doc.senderId} to ${doc.receiverId}`);
}, function(error, doc, next) {
  logMessageEvent(`Failed to remove message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  next(error);
});

const Message = mongoose.model('Message', messageSchema);

export default Message;