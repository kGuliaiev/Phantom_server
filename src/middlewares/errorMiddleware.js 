import { logEvent } from '../utils/logger.js';

// Middleware для обработки 404 ошибок
export const notFound = (req, res, next) => {
    const message = `Маршрут ${req.originalUrl} не найден`;
    logEvent(`404 Not Found: ${req.originalUrl}`);
    res.status(404).json({ message });
};

// Middleware для обработки серверных ошибок
export const errorHandler = (err, req, res, next) => {
    logEvent(`Ошибка сервера: ${err.message}`);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });
};
