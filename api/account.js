import { deleteAccount, exportAccount } from '../server/controllers/accountController.js';
import { protectedHandler } from '../server/security.js';
export default protectedHandler((req, res) => req.method === 'GET' ? exportAccount(req, res) : deleteAccount(req, res));
