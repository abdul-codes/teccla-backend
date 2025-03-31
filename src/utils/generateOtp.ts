import crypto from 'crypto';
export const generateOtp = () => {
  const otp = crypto.randomInt(1000000, 100000000).toString();
  return otp
}

