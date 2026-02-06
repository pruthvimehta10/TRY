
import express from 'express';
import { streamVideo, getSignedUrl } from '../controllers/videoController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', streamVideo);
router.get('/signed-url', authMiddleware, getSignedUrl);

export default router;
