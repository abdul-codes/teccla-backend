import { Router } from 'express';
import { handlePaystackWebhook } from '../controller/WebhookController';

const router = Router();

router.post('/paystack', handlePaystackWebhook);

export default router;
