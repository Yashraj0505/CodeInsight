// Chat Routes
// Define chat endpoints

import express from 'express';
import { sendMessage, getConversation } from './chat.controller.js';

const router = express.Router();

router.post('/message', sendMessage);
router.get('/:conversationId', getConversation);

export default router;
