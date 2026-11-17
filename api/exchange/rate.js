import { getExchangeRate } from '../../server/controllers/exchangeController.js';
import { protectedHandler } from '../../server/security.js';
export default protectedHandler(getExchangeRate);
