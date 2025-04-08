import User from '../models/users.js';






// Проверка количества оставшихся одноразовых ключей
export const checkKeyStatus = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.json({ remainingKeys: user.oneTimePreKeys.length });
  } catch (error) {
    console.error('Ошибка при проверке ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Загрузка (или дозагрузка) одноразовых ключей
export const uploadKeys = async (req, res) => {
  try {
    const { username, identityKey, signedPreKey, oneTimePreKeys } = req.body;
    if (!username || !identityKey || !signedPreKey || !oneTimePreKeys) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    user.identityKey = identityKey;
    user.signedPreKey = signedPreKey;
    // Добавляем новые ключи в массив
    user.oneTimePreKeys.push(...oneTimePreKeys);
    await user.save();
    res.status(200).json({ message: 'Ключи обновлены' });
  } catch (error) {
    console.error('Ошибка загрузки ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получение набора ключей для установления соединения
export const requestKey = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user || !user.identityKey || !user.signedPreKey || user.oneTimePreKeys.length === 0) {
      return res.status(404).json({ message: 'Нет доступных ключей' });
    }
    const oneTimePreKey = user.oneTimePreKeys.shift(); // Удаляем первый ключ
    await user.save();
    res.status(200).json({
      identityKey: user.identityKey,
      signedPreKey: user.signedPreKey,
      oneTimePreKey
    });
  } catch (error) {
    console.error('Ошибка запроса ключей:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удаление использованного одноразового ключа
export const deleteUsedKey = async (req, res) => {
  try {
    const { username, usedKey } = req.body;
    if (!username || !usedKey) {
      return res.status(400).json({ message: 'Не указаны параметры' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    user.oneTimePreKeys = user.oneTimePreKeys.filter(key => key !== usedKey);
    await user.save();
    res.status(200).json({ message: 'Ключ удален' });
  } catch (error) {
    console.error('Ошибка удаления ключа:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};