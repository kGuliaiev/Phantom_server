// Контроллеры для аутентификации пользователей
// Путь: src/controllers/authController.js

import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Функция кодирования в Base64
const toBase64 = (str) => Buffer.from(str, 'utf-8').toString('base64');



// 🔐 Утилита для проверки base64
const isBase64 = (str) => {
    return typeof str === 'string' && /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;
  };
 


  // Проверка уникального идентификатора
  export const checkIdentifier = async (req, res) => {
    try {
      const { identifier } = req.query;
      if (!identifier) return res.status(400).json({ message: 'Identifier обязателен' });
  
      const user = await User.findOne({ identifier });
  
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
  
      return res.status(200).json({
        message: 'Пользователь найден',
        publicKey: user.publicKey,
      });
    } catch (err) {
      console.error('Ошибка при проверке идентификатора:', err);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };


// Регистрация нового пользователя с ключами
  export const registerUser = async (req, res) => {
    try {
      const { username, password, identifier, nickname, publicKey, identityKey, signedPreKey, oneTimePreKeys } = req.body;
  
      console.log('\n📝 Попытка регистрации пользователя');
      console.log('Полученные данные:', {
        username,
        identifier,
        nickname,
        publicKey,
        identityKey,
        signedPreKey,
        oneTimePreKeys: Array.isArray(oneTimePreKeys) ? oneTimePreKeys.length : 'не массив'
      });
  
      if (!username || !password || !identifier || !publicKey || !identityKey || !signedPreKey || !oneTimePreKeys) {
        console.log('❌ Не все поля переданы');
        return res.status(400).json({ message: 'Все поля обязательны для регистрации' });
      }
  
      if (!isBase64(identityKey)) {
        console.log('❌ Формат одного из ключей неверен (не Base64)');
        return res.status(400).json({ message: 'Некорректный формат identityKey (должен быть Base64)' });
      }
  
      if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length === 0) {
        console.log('❌ Формат одного из одноразовых ключей неверен');
        return res.status(400).json({ message: 'oneTimePreKeys должен быть массивом с ключами' });
      }
  
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        console.log('⚠️ Username уже существует:', username);
        return res.status(409).json({ message: 'Пользователь с таким именем уже существует' });
      }
  
      const existingIdentifier = await User.findOne({ identifier });
      if (existingIdentifier) {
        console.log('⚠️ Identifier уже используется:', identifier);
        return res.status(409).json({ message: 'Такой идентификатор уже зарегистрирован' });
      }
  
      console.log('🔐 Хеширование пароля для:', username);
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Хеш пароля получен');
  
      const newUser = new User({
        username,
        password: hashedPassword,
        identifier,
        nickname,
        publicKey,
        identityKey,
        signedPreKey,
        oneTimePreKeys,
        lastSeen: new Date(),
      });
  
      await newUser.save();
      console.log('✅ Пользователь успешно зарегистрирован');
  
      res.status(201).json({ message: 'Пользователь зарегистрирован:', identifier, nickname });
    } catch (error) {
      console.error('❗ Ошибка при регистрации:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };




// Вход пользователя (login)
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  console.log('🔐 Попытка входа:');
  console.log('Username:', username);
  console.log('Password (переданный):', password);

  try {
    const user = await User.findOne({ username });

    if (!user) {
      console.log('⚠️ Пользователь не найден!');
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    console.log('✅ Пользователь найден. Проверка пароля...');

    const isMatch = await bcrypt.compare(password, user.password);

    console.log('Сравнение bcrypt:', isMatch);

    if (!isMatch) {
      console.log('❌ Пароль не совпадает!');
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    console.log('✅ Успешный вход. Выдаётся токен.');

    res.json({
      token,
      userId: user._id
    });
  } catch (err) {
    console.log('❗ Ошибка при входе:', err.message);
    res.status(500).json({ message: 'Ошибка входа', error: err.message });
  }
};




  