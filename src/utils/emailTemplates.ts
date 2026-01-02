export const getOTPEmailTemplate = (otp: string, userName: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 30px 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 40px;
      }
      .otp-box {
        background: #f8f9fa;
        border: 2px dashed #667eea;
        padding: 20px;
        text-align: center;
        border-radius: 8px;
        margin: 30px 0;
      }
      .otp {
        font-size: 36px;
        font-weight: bold;
        color: #667eea;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
      }
      .warning {
        background: #fff3cd;
        color: #856404;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
        font-size: 14px;
      }
      .footer {
        background: #f8f9fa;
        padding: 20px 40px;
        text-align: center;
        color: #6c757d;
        font-size: 14px;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔐 Verify Your Email</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Thank you for registering! Your verification code is:</p>
        
        <div class="otp-box">
          <div class="otp">${otp}</div>
        </div>
        
        <p>Enter this code to verify your account and get started.</p>
        
        <div class="warning">
          ⚠️ <strong>Important:</strong> This code expires in <strong>10 minutes</strong> and can only be used once.
        </div>
        
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© 2025 Teccla. All rights reserved.</p>
        <p>Need help? <a href="mailto:support@teccla.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
`;

export const getPasswordResetEmailTemplate = (userName: string, resetLink: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        padding: 30px 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 40px;
      }
      .reset-button {
        display: inline-block;
        background: #dc3545;
        color: #ffffff;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        font-size: 16px;
        margin: 20px 0;
      }
      .reset-button:hover {
        background: #c82333;
      }
      .warning {
        background: #fff3cd;
        color: #856404;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
        font-size: 14px;
      }
      .footer {
        background: #f8f9fa;
        padding: 20px 40px;
        text-align: center;
        color: #6c757d;
        font-size: 14px;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔑 Reset Your Password</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="reset-button">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea; font-size: 12px;">
          ${resetLink}
        </p>
        
        <div class="warning">
          ⚠️ <strong>Important:</strong> This link expires in <strong>1 hour</strong> and can only be used once.
        </div>
        
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
      <div class="footer">
        <p>© 2025 Teccla. All rights reserved.</p>
        <p>Need help? <a href="mailto:support@teccla.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
`;

export const getPasswordChangedEmailTemplate = (userName: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Changed Successfully</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #28a745 0%, #218838 100%);
        padding: 30px 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 40px;
      }
      .success-icon {
        text-align: center;
        font-size: 64px;
        margin: 20px 0;
      }
      .info-box {
        background: #d4edda;
        color: #155724;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
      }
      .footer {
        background: #f8f9fa;
        padding: 20px 40px;
        text-align: center;
        color: #6c757d;
        font-size: 14px;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✅ Password Changed</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${userName}</strong>,</p>
        
        <div class="success-icon">🎉</div>
        
        <p>Your password has been changed successfully!</p>
        
        <div class="info-box">
          <strong>For your security:</strong>
          <ul style="margin: 10px 0 0 20px; padding: 0;">
            <li>You have been logged out from all devices</li>
            <li>Please login with your new password</li>
            <li>Your password reset link has been invalidated</li>
          </ul>
        </div>
        
        <p>If you did not make this change, please contact support immediately to secure your account.</p>
      </div>
      <div class="footer">
        <p>© 2025 Teccla. All rights reserved.</p>
        <p>Need help? <a href="mailto:support@teccla.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
`;
