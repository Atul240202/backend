const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send OTP email
const sendOTPEmail = async (email, name, otp) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Verify Your Email - OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering as an admin user. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Regards,<br>Industrywaala Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hello ${name},</p>
          <p>You requested a password reset. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link is valid for 30 minutes.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>Regards,<br>Industrywaala Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
};
