import { Router } from 'express';
import {
    initializePayment,
    verifyPayment,
    getPaymentHistory,
} from '../controller/PaymentController';
import { authenticateUser } from '../middleware/authMIddleware';

const router = Router();

router.post('/initialize', authenticateUser, initializePayment);
router.get('/verify/:reference', authenticateUser, verifyPayment);
router.get('/history', authenticateUser, getPaymentHistory);

export default router;
