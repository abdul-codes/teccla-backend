import crypto from 'crypto';
export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 10000000).toString();
  return otp
}

