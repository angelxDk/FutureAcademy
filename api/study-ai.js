import { studyAi } from '../server/controllers/studyAiController.js';
import { protectedHandler } from '../server/security.js';
export default protectedHandler(studyAi);
