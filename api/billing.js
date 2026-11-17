import { billingApi } from '../server/controllers/billingController.js';
import { protectedHandler } from '../server/security.js';
export default protectedHandler(billingApi);
