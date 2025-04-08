// contactController.js
import Contact from '../models/contact.js';
import User from '../models/users.js';

// ✅ Получить список контактов (с проверкой токена)
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
      .select('contactId nickname publicKey -_id');

    console.log("📒 Контакты найдены:", contacts.length);
    res.status(200).json(contacts);
  } catch (err) {
    console.error("❌ Ошибка на сервере:", err);
    res.status(500).json({ message: 'Ошибка получения контактов', error: err.message });
  }
};

// ✅ Добавить контакт
export const addContact = async (req, res) => {
  const { owner, contactId, nickname } = req.body;

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

    const newContact = new Contact({ owner, contactId, nickname, publicKey: user.publicKey });
    await newContact.save();

    const contacts = await Contact.find({ owner })
      .sort({ nickname: 1 })
      .select('contactId nickname publicKey -_id');

    res.status(201).json({ message: 'Контакт добавлен', contacts });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка добавления контакта', error: err.message });
  }
};

// ✅ Удалить контакт
export const deleteContact = async (req, res) => {
  const { owner, contactId } = req.params;
  try {
    await Contact.deleteOne({ owner, contactId });
    const updated = await Contact.find({ owner })
      .sort({ nickname: 1 })
      .select('contactId nickname publicKey -_id');
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении контакта' });
  }
};
