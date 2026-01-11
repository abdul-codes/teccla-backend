import nodemailer from 'nodemailer';
import { 
  getOTPEmailTemplate, 
  getPasswordResetEmailTemplate, 
  getPasswordChangedEmailTemplate
} from './emailTemplates';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, otp: string, userName: string = 'User') => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email Address',
    html: getOTPEmailTemplate(otp, userName),
  });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string, userName: string = 'User') => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password - Teccla',
    html: getPasswordResetEmailTemplate(userName, resetLink),
  });
};

export const sendPasswordChangedEmail = async (email: string, userName: string = 'User') => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Changed Successfully - Teccla',
    html: getPasswordChangedEmailTemplate(userName),
  });
};
