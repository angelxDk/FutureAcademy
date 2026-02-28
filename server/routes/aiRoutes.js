import express from 'express';
import { chatAssistant, parseTimetable } from '../controllers/aiController.js';

const router = express.Router();

router.post('/openai', chatAssistant);
router.post('/parse-timetable', parseTimetable);

export default router;
