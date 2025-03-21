// src/middlewares/requestLogger.js
export const requestLogger = (req, res, next) => {
    const now = new Date();
    const timestamp = now.toISOString(); // формат: 2025-03-21T13:45:00.123Z
  
    console.log(`\n=== Incoming Request ===`);
    console.log(`Time: ${timestamp}`);
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.originalUrl}`);
    console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  
    // Переопределяем res.send, чтобы логировать ответ
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      console.log(`--- Response for ${req.method} ${req.originalUrl} ---`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(body);
      return originalSend(body);
    };
  
    next();
  };