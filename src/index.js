try {
    import('./config/server.js')
        .then(() => console.log('Сервер успешно запущен'))
        .catch((err) => console.error('Ошибка при запуске сервера:', err));
} catch (err) {
    console.error('Ошибка при инициализации сервера:', err);
}