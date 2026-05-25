import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendRegisterMail = async (email, fullname, otp) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px">
        <div style="max-width:500px; margin:auto; background:#fff; padding:20px; border-radius:6px">
          <h2 style="color:#333;">Welcome, ${fullname} 👋</h2>
          <p style="font-size:15px; color:#555;">Thank you for registering. Please use the OTP below to verify your account:</p>
          <div style="text-align:center; margin:30px 0">
            <span style="display:inline-block; padding:14px 20px; font-size:20px; letter-spacing:3px; background:#222; color:#fff; border-radius:6px">${otp}</span>
          </div>
          <p style="font-size:13px; color:#888">This OTP is valid for a limited time. Do not share it with anyone.</p>
          <hr style="border:none; border-top:1px solid #eee" />
          <p style="font-size:12px; color:#aaa; text-align:center">© ${new Date().getFullYear()} Dhakal Traders. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `Dhakal Traders <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Account - OTP Code',
      html,
    });

    console.log('Verification email sent');
  } catch (error) {
    console.error('Mail Error:', error);
    throw error;
  }
};

export default sendRegisterMail;
