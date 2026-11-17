import { chatAssistant } from '../server/controllers/aiController.js';
import { protectedHandler } from '../server/security.js';
export default protectedHandler(chatAssistant);
