import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    messageId: { type: String, required: true, unique: true },
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },

    // Список получателей с их статусами (доставлено, просмотрено, удалено)
    recipients: [
        {
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            status: {
                type: String,
                enum: ['sent', 'delivered', 'read', 'deleted'],
                default: 'sent',
            },
            _id: false
        }
    ],

    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Message', MessageSchema);
