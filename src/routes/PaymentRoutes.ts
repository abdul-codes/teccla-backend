import { Router } from 'express';
import {
    initializePayment,
    verifyPayment,
    getPaymentHistory,
    initializeProjectPayment,
    getProjectPaymentHistory,
    getMyPaymentProgress,
} from '../controller/PaymentController';
import { authenticateUser } from '../middleware/authMIddleware';
import { validateSchema } from '../middleware/validateMiddleware';
import { initializeProjectPaymentSchema } from '../validation/project';

const router = Router();

router.post('/initialize', authenticateUser, initializePayment);
router.post('/projects/:id/payments/initialize', authenticateUser, validateSchema(initializeProjectPaymentSchema), initializeProjectPayment);
router.get('/projects/:id/payments/history', authenticateUser, getProjectPaymentHistory);
router.get('/projects/:id/payments/my-status', authenticateUser, getMyPaymentProgress);
router.get('/verify/:reference', authenticateUser, verifyPayment);
router.get('/history', authenticateUser, getPaymentHistory);

export default router;
