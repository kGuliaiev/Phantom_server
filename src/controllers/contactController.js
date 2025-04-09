import Contact from '../models/contact.js';
import User from '../models/users.js';

// Получить список контактов (с проверкой токена)
export const getContacts = async (req, res) => {
  const { tokenUser, identifier } = req.body;
  console.log("🔍 Получен запрос на список контактов:", identifier);

  if (!identifier) {
    return res.status(400).json({ message: 'Отсутствует идентификатор в теле запроса' });
  }

  if (!req.user || req.user.identifier !== identifier) {
    console.warn("⚠️ Несовпадение идентификаторов или отсутствует пользователь:", {
      tokenUser: req.user,
      requestIdentifier: identifier
    });
    return res.status(403).json({
      message: 'Невалидный токен или несоответствие идентификатора',
      tokenUser: req.user,
      requestIdentifier: identifier
    });
  }

  try {
    const contacts = await Contact.find({ owner: identifier })
      .sort({ nickname: 1 })
      .select('contactId nickname publicKey status introduction -_id');

    console.log("📒 Контакты найдены:", contacts.length);
    res.status(200).json(contacts);
  } catch (err) {
    console.error("❌ Ошибка на сервере:", err);
    res.status(500).json({ message: 'Ошибка получения контактов', error: err.message });
  }
};

// Добавить контакт с текстом приветствия (знакомство)
// При добавлении статус устанавливается как 'pending'
export const addContact = async (req, res) => {
  const { owner, contactId, nickname, introduction } = req.body;

  if (!owner || !contactId) {
    return res.status(400).json({ message: 'owner и contactId обязательны' });
  }
  
  if (owner === contactId) {
    return res.status(400).json({ message: 'Нельзя добавить самого себя в контакты' });
  }

  try {
    const existing = await Contact.findOne({ owner, contactId });
    if (existing) {
      return res.status(409).json({ message: 'Контакт уже добавлен' });
    }

    const user = await User.findOne({ identifier: contactId });
    if (!user || !user.publicKey) {
      return res.status(404).json({ message: 'Пользователь не найден или без публичного ключа' });
    }

    // Создаём новый контакт, статус будет 'pending', добавляем также введённое сообщение знакомства
    const newContact = new Contact({ 
      owner, 
      contactId, 
      nickname, 
      publicKey: user.publicKey,
      status: 'pending',
      introduction: introduction || ''
    });
    await newContact.save();

    const contacts = await Contact.find({ owner })
      .sort({ nickname: 1 })
      .select('contactId nickname publicKey status introduction -_id');

    res.status(201).json({ message: 'Контакт добавлен', contacts });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка добавления контакта', error: err.message });
  }
};

// Удалить контакт
export const deleteContact = async (req, res) => {
  const { owner, contactId } = req.params;
  try {
    await Contact.deleteOne({ owner, contactId });
    const updated = await Contact.find({ owner })
      .sort({ nickname: 1 })
      .select('contactId nickname publicKey status introduction -_id');
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении контакта' });
  }
};

// Новый метод для ответа на запрос дружбы
export const respondContact = async (req, res) => {
  const { owner, contactId, action } = req.body; // owner = пользователь, получивший запрос (Z), contactId = пользователь, отправивший запрос (A)
  if (!owner || !contactId || !action) {
    return res.status(400).json({ message: 'owner, contactId и action обязательны' });
  }
  if (!['accept', 'decline', 'block'].includes(action)) {
    return res.status(400).json({ message: 'Недопустимое значение action' });
  }
  
  try {
    const contactEntry = await Contact.findOne({ owner, contactId });
    if (!contactEntry) {
      return res.status(404).json({ message: 'Запрос дружбы не найден' });
    }
  
    if (action === 'accept') {
      // Обновляем статус на accepted для пользователя Z
      contactEntry.status = 'accepted';
      await contactEntry.save();
      
      // Добавляем обратную запись, если её еще нет, у пользователя A
      let reverseEntry = await Contact.findOne({ owner: contactId, contactId: owner });
      if (!reverseEntry) {
        reverseEntry = new Contact({
          owner: contactId,
          contactId: owner,
          nickname: '',  // здесь можно добавить логику для nickname
          publicKey: '', // если публичный ключ известен, можно установить его
          status: 'accepted'
        });
      } else {
        reverseEntry.status = 'accepted';
      }
      await reverseEntry.save();
      return res.json({ message: 'Запрос принят, пользователи теперь друзья' });
    } else if (action === 'decline') {
      // При отказе – удаляем запись запроса
      await Contact.deleteOne({ owner, contactId });
      return res.json({ message: 'Запрос отклонён' });
    } else if (action === 'block') {
      // При блокировке обновляем статус на blocked
      contactEntry.status = 'blocked';
      await contactEntry.save();
      return res.json({ message: 'Пользователь заблокирован' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка обработки запроса', error: error.message });
  }
};