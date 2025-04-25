// Контроллеры для аутентификации пользователей
// Путь: src/controllers/authController.js

import jwt      from 'jsonwebtoken';
import bcrypt   from 'bcrypt';
import crypto   from 'crypto';

import User     from '../models/users.js';


  // Генерация уникального идентификатора
  export const generateUniqueIdentifier = async (req, res) => {
      try {
        let identifier;
        let isUnique = false;
    
        while (!isUnique) {
          identifier = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-символьный HEX, e.g. 'A1C2D3E4'
          const existingUser = await User.findOne({ identifier });
          if (!existingUser) isUnique = true;
        }
    
        res.json({ identifier });
      } catch (error) {
        console.error('❌ Ошибка при генерации идентификатора:', error);
        res.status(500).json({ message: 'Ошибка генерации идентификатора' });
      }
    };


    // Регистрация нового пользователя с ключами
export const registerUser = async (req, res) => {
  try {
      const { username, password, identifier, nickname, publicKey, identityKey, signedPreKey, oneTimePreKeys } = req.body;
  
      console.log('📝 Попытка регистрации пользователя');
      console.log('Полученные данные:', {
        username,
        password,
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
      
      // Сразу выдаём токен после регистрации
      const token = jwt.sign(
        {
          userId: newUser._id,
          identifier: newUser.identifier
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({
        token,
        userId:     newUser._id,
        identifier: newUser.identifier,
        nickname:   newUser.nickname
      });
    } catch (error) {
      console.error('❗ Ошибка при регистрации:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };


  // Авторизация пользователя (login)
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  console.log('🔐 Попытка входа:');
  console.log('Username:', username);
  console.log('Password:', password);

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
      userId: user._id,
      identifier: user.identifier,
      nickname: user.nickname
    });
  } catch (err) {
    console.log('❗ Ошибка при входе:', err.message);
    res.status(500).json({ message: 'Ошибка входа', error: err.message });
  }
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


  // ✅ Проверка токена
export const validateToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Нет токена' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ message: 'Токен действителен', userId: decoded.userId });
  } catch (err) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
};

// Проверка существования пользователя по идентификатору
export const checkUserByIdentifier = async (req, res) => {
  const { identifier } = req.query;
  if (!identifier) return res.status(400).json({ message: 'Identifier обязателен' });

  const user = await User.findOne({ identifier });
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

  res.status(200).json({
    publicKey: user.identityKey,
    nickname: user.nickname || 'Без имени'
  });
};

// Функция кодирования в Base64
const toBase64 = (str) => Buffer.from(str, 'utf-8').toString('base64');


// 🔐 Утилита для проверки base64
const isBase64 = (str) => {
    return typeof str === 'string' && /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;
  };
 

