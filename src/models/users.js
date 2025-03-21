import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    identifier: { type: String, unique: true, required: true },
    identifierEncrypted: { type: String, required: true },
    password: { type: String, required: true },
    publicKey: { type: String, required: true },
    // Новые поля для ключей:
    identityKey: { type: String, required: false },    // долговременный ключ пользователя
    signedPreKey: { type: String, required: false },     // временный подписанный ключ
    oneTimePreKeys: { type: [String], default: [] },       // массив одноразовых ключей
    deactivated: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Хеширование идентификатора перед валидацией
UserSchema.pre('validate', function (next) {
    if (!this.identifier) {
        return next(new Error("Identifier is required"));
    }
    this.identifierEncrypted = crypto
        .createHash('sha256')
        .update(this.identifier)
        .digest('hex');
    next();
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
    console.log("Хеширование пароля для:", this.username);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("Сохранённый хеш:", this.password);
    next();
});

// Проверка пароля
UserSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', UserSchema);