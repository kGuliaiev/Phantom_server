// models/users.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const SignedPreKeySchema = new Schema({
  keyId: Number,
  publicKey: String,
  privateKey: String,
  signature: String,
  createdAt: Number
}, { _id: false });

const OneTimePreKeySchema = new Schema({
  keyId: Number,
  publicKey: String,
  privateKey: String,
  createdAt: Number
}, { _id: false });

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  identifier: { type: String, required: true, unique: true },

  publicKey: { type: String },         // Для совместимости
  identityKey: { type: String, required: true },

  signedPreKey: { type: SignedPreKeySchema, required: true },
  oneTimePreKeys: { type: [OneTimePreKeySchema], required: true },

  lastSeen: { type: Date, default: Date.now }
});

export default model('User', UserSchema);