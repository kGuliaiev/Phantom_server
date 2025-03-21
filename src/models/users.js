import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  identifier: { type: String, unique: true, required: true },
  identifierEncrypted: { type: String, required: true },
  password: { type: String, required: true },
  publicKey: { type: String, required: true },
  // Поля для обмена ключами:
  identityKey: { type: String, required: false },
  signedPreKey: { type: String, required: false },
  oneTimePreKeys: { type: [String], default: [] },
  deactivated: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Хеширование идентификатора перед сохранением
UserSchema.pre('save', async function (next) {
  if (!this.isModified('identifier')) return next();
  this.identifierEncrypted = crypto.createHash('sha256').update(this.identifier).digest('hex');
  next();
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Проверка пароля
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', UserSchema);