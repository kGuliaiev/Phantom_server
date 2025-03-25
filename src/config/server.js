import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import connectDB from './db.js';
import authRoutes from '../routes/auth.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

//app.use('/api/auth', authRoutes);

connectDB();

wss.on('connection', (ws) => {
    console.log('Новое WebSocket-соединение');
    ws.on('message', (data) => {
        console.log('Сообщение:', data.toString());
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));