import jwt from 'jsonwebtoken';
import User from '../models/users.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select('identifier');
      if (!user) {
        return res.status(401).json({ message: 'Пользователь не найден' });
      }

      req.user = {
        ...decoded,
        identifier: user.identifier
      };

      next();
    } catch (error) {
      console.error('❌ Ошибка при проверке токена:', error);
      return res.status(401).json({ message: 'Неверный токен' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Нет токена' });
  }
};

// async decryptMessage(encryptedBase64) {
//   try {
//     const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
//     const iv = encryptedData.slice(0, 12);
//     const encrypted = encryptedData.slice(12);

//     const receiverPublicKey = localStorage.getItem('lastPublicKey');
//     if (!receiverPublicKey) {
//       throw new Error('Публичный ключ получателя не найден');
//     }

//     const importedKey = await this.importReceiverKey(receiverPublicKey);
//     const aesKey = await this.deriveAESKey(importedKey);

//     const decrypted = await crypto.subtle.decrypt(
//       { name: "AES-GCM", iv },
//       aesKey,
//       encrypted
//     );

//     return new TextDecoder().decode(decrypted);
//   } catch (error) {
//     this._log(`❌ Ошибка decryptMessage: ${error.message}`);
//     throw error;
//   }
// }