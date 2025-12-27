import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

interface InitializeData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

interface VerifyData {
    id: number;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    channel: string;
    currency: string;
    paid_at: string | null;
    authorization: {
        card_type: string;
        bank: string;
    } | null;
}

/**
 * Initialize a Paystack transaction
 * Returns authorization URL to redirect user to
 */
export const initializeTransaction = async (
    email: string,
    amount: number,
    reference: string,
    callbackUrl: string
): Promise<InitializeData> => {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            amount,
            reference,
            callback_url: callbackUrl,
        }),
    });

    const result: PaystackResponse<InitializeData> = await response.json();

    if (!result.status) {
        throw new Error(result.message || 'Failed to initialize transaction');
    }

    return result.data;
};

/**
 * Verify a transaction by reference
 */
export const verifyTransaction = async (reference: string): Promise<VerifyData> => {
    const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
        }
    );

    const result: PaystackResponse<VerifyData> = await response.json();

    if (!result.status) {
        throw new Error(result.message || 'Failed to verify transaction');
    }

    return result.data;
};

/**
 * Verify Paystack webhook signature
 */
export const verifyWebhookSignature = (signature: string, body: string): boolean => {
    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(body)
        .digest('hex');
    return hash === signature;
};

/**
 * Generate a unique payment reference
 */
export const generateReference = (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY_${timestamp}_${random}`.toUpperCase();
};
