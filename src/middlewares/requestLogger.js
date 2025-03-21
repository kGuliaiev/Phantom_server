// src/middlewares/requestLogger.js
export const requestLogger = (req, res, next) => {
    console.log(`\n=== Incoming Request ===`);
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.originalUrl}`);
    console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
  
    // Переопределяем res.send, чтобы логировать ответ
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      console.log(`--- Response for ${req.method} ${req.originalUrl} ---`);
      console.log(body);
      return originalSend(body);
    };
  
    next();
  };