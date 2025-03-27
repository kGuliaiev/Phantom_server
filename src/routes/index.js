import express          from 'express';
import authRoutes       from './authRoutes.js';
import chatRoutes       from './chatRoutes.js';
import contactRoutes    from './contactRoutes.js';
import userRoutes       from './userRoutes.js';



const router = express.Router();



router.use('/auth',     authRoutes);
router.use('/users',    userRoutes);
router.use('/chat',     chatRoutes);
router.use('/contacts', contactRoutes);

export default router;