import { stripeWebhook } from '../server/controllers/billingController.js';
export const config = { api: { bodyParser: false } };
export default stripeWebhook;
