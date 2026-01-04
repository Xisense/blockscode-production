import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey = process.env.MAILJET_API_KEY;
  private readonly apiSecret = process.env.MAILJET_API_SECRET;
  private readonly senderEmail = process.env.MAILJET_SENDER_EMAIL || 'no-reply@blockscode.com';
  private readonly senderName = process.env.MAILJET_SENDER_NAME || 'BlocksCode University';

  async sendWelcomeEmail(user: { email: string; name: string; password: string }, organization: { name: string; primaryColor?: string }) {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Mailjet credentials not found. Skipping email sending.');
      return;
    }

    const primaryColor = organization.primaryColor || '#fc751b';
    const orgName = organization.name;

    const htmlPart = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${primaryColor}; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">Welcome to ${orgName}</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your account has been successfully created at <strong>${orgName}</strong>.</p>
          <p>Here are your login credentials:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 1.2em;">${user.password}</span></p>
          </div>
          <p>Please log in and change your password immediately.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://blockscode.com/login" style="background-color: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888;">
          <p>&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: this.senderEmail,
                Name: this.senderName,
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name,
                },
              ],
              Subject: `Welcome to ${orgName} - Your Login Credentials`,
              HTMLPart: htmlPart,
              TextPart: `Welcome to ${orgName}. Your login credentials are: Email: ${user.email}, Password: ${user.password}. Please login and change your password.`,
            },
          ],
        },
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Welcome email sent to ${user.email}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${user.email}: ${error.message}`, error.response?.data);
      // Don't throw error to prevent blocking user creation, just log it
    }
  }

  async sendPasswordResetEmail(user: { email: string; name: string }, newPassword: string, organization: { name: string; primaryColor?: string }) {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Mailjet credentials not found. Skipping email sending.');
      return;
    }

    const primaryColor = organization.primaryColor || '#fc751b';
    const orgName = organization.name;

    const htmlPart = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${primaryColor}; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password for <strong>${orgName}</strong>.</p>
          <p>Your new temporary password is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
            <span style="font-family: monospace; font-size: 1.5em; font-weight: bold; letter-spacing: 2px;">${newPassword}</span>
          </div>
          <p><strong>Please log in and change your password immediately.</strong></p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://blockscode.com/login" style="background-color: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Dashboard</a>
          </div>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you did not request this password reset, please contact support immediately.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888;">
          <p>&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      const response = await axios.post(
        'https://api.mailjet.com/v3.1/send',
        {
          Messages: [
            {
              From: {
                Email: this.senderEmail,
                Name: this.senderName,
              },
              To: [
                {
                  Email: user.email,
                  Name: user.name,
                },
              ],
              Subject: `Password Reset - ${orgName}`,
              HTMLPart: htmlPart,
              TextPart: `Password Reset for ${orgName}. Your new temporary password is: ${newPassword}. Please login and change your password immediately.`,
            },
          ],
        },
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${error.message}`, error.response?.data);
    }
  }

}
