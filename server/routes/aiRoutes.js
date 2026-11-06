import express from 'express';
import { chatAssistant, parseTimetable } from '../controllers/aiController.js';

import { studyAi } from '../controllers/studyAiController.js';

const router = express.Router();

router.get('/study-ai', studyAi);
router.post('/study-ai', studyAi);

router.post('/openai', chatAssistant);
router.post('/parse-timetable', parseTimetable);

export default router;
