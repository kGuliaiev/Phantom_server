import fs   from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'logs', 'server.log');

// Создание папки logs, если ее нет
if (!fs.existsSync(path.dirname(logFilePath))) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
}

// Функция логирования
export const logEvent = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) console.error('Ошибка при записи в лог:', err);
    });

    console.log(logMessage.trim());
};
