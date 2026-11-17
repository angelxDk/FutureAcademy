import { communityApi } from '../server/controllers/communityController.js';
import { protectedHandler } from '../server/security.js';
export default protectedHandler(communityApi);
