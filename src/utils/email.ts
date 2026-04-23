// src/utils/email.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using nodemailer
 */
export async function sendEmail({ to, subject, html }: EmailOptions) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Generate a password reset email with a link
 */
export function generatePasswordResetEmail(name: string, resetLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; margin-bottom: 20px;">Permintaan Pengaturan Ulang Kata Sandi</h2>
      <p>Halo ${name},</p>
      <p>Kami menerima permintaan untuk mengatur ulang kata sandi Anda. Silakan klik tombol di bawah ini untuk mengatur ulang kata sandi Anda:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Jika Anda tidak meminta pengaturan ulang kata sandi, abaikan email ini atau hubungi bagian dukungan jika Anda memiliki masalah.</p>
      <p>Tautan ini akan kedaluwarsa dalam 1 jam karena alasan keamanan.</p>
      <p>Best regards,<br/>Your Support Team</p>
    </div>
  `;
}
