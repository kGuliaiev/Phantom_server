// src/model/message.js

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';

const logFile = path.join('./logs', 'messages.log');

const messageSchema = new mongoose.Schema({
  messageId:      { type: String, required: true, unique: true },
  senderId:       { type: String, required: true },
  receiverId:     { type: String, required: true },
  chatId:         { type: String, required: true, default: 'default' },
  encryptedContent: { type: String, required: true },
  iv:             { type: String, required: true },
  timestamp:      { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
});

messageSchema.post('save', function(doc) {
  logMessageEvent(`Message saved: from ${doc.senderId} to ${doc.receiverId}`);
  console.log(`Message saved: from ${doc.senderId} to ${doc.receiverId}`);
  // После записи статуса delivered:
  // (!!! В этой схеме нет массива recipients, только status, так что условие для delivered применимо ко всему сообщению)
  if (doc.status === 'delivered') {
    // Удаляем через метод экземпляра документа
    doc.deleteOne().then(() => {
      console.log(`🗑️ Удалено сообщение ${doc.messageId} после доставки`);
    }).catch(err => {
      console.error(`❌ Ошибка при удалении сообщения (deleteOne) ${doc.messageId}:`, err);
    });
  }
}, function(error, doc, next) {
  logMessageEvent(`Failed to save message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  console.log(`Failed to save message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  next(error);
});

messageSchema.post('remove', function(doc) {
  logMessageEvent(`Message removed: from ${doc.senderId} to ${doc.receiverId}`);
  console.log(`Message removed: from ${doc.senderId} to ${doc.receiverId}`);
}, function(error, doc, next) {
  logMessageEvent(`Failed to remove message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  console.log(`Failed to remove message from ${doc?.senderId} to ${doc?.receiverId}`, error.message);
  next(error);
});

function logMessageEvent(event, error = null) {
  const logEntry = `[${new Date().toISOString()}] (${os.hostname()}) EVENT: ${event} ${error ? `| ERROR: ${error}` : ''}\n`;
  console.log(logEntry);
  fs.appendFileSync(logFile, logEntry);
}

const Message = mongoose.model('Message', messageSchema);

export default Message;