// src/utils/emailService.js - Email notification service
const nodemailer = require("nodemailer");
const logger = require("./logger");

class EmailService {
  constructor() {
    // Only create transporter if email is configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      logger.warn(
        "Email service not configured - skipping email notifications"
      );
    }
  }

  /**
   * Send license activation email
   */
  async sendLicenseActivation(email, licenseData) {
    if (!this.isConfigured) return;

    const mailOptions = {
      from: `"Threads Pro Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Threads Pro Bot License Has Been Activated",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1877f2;">Welcome to Threads Pro Bot!</h2>
          
          <p>Your license has been successfully activated. Here are your details:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>License Key:</strong> ${licenseData.key}</p>
            <p><strong>License Type:</strong> ${licenseData.type}</p>
            <p><strong>Valid Until:</strong> ${new Date(
              licenseData.expiresAt
            ).toDateString()}</p>
          </div>
          
          <h3>Features Included:</h3>
          <ul>
            <li>Extract up to ${licenseData.features.maxThreads} threads</li>
            <li>Custom posting delays</li>
            <li>Advanced anti-detection</li>
            <li>Priority support: ${licenseData.features.priority}</li>
          </ul>
          
          <p>To get started, open the Threads Pro Bot extension on Threads.net and enter your license key.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`License activation email sent to ${email}`);
    } catch (error) {
      logger.error("Failed to send license activation email:", error);
    }
  }

  /**
   * Send license expiry reminder
   */
  async sendExpiryReminder(email, licenseData, daysLeft) {
    if (!this.isConfigured) return;

    const mailOptions = {
      from: `"Threads Pro Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Threads Pro Bot License Expires in ${daysLeft} Days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e41e3f;">License Expiry Reminder</h2>
          
          <p>Your Threads Pro Bot license will expire in <strong>${daysLeft} days</strong>.</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>License Key:</strong> ${licenseData.key}</p>
            <p><strong>Expires On:</strong> ${new Date(
              licenseData.expiresAt
            ).toDateString()}</p>
          </div>
          
          <p>To continue using Threads Pro Bot without interruption, please renew your license.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.RENEWAL_URL || "#"}" 
               style="background-color: #1877f2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Renew License
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            If you have any questions about renewal, please contact our support team.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Expiry reminder email sent to ${email}`);
    } catch (error) {
      logger.error("Failed to send expiry reminder email:", error);
    }
  }

  /**
   * Send license revoked notification
   */
  async sendLicenseRevoked(email, reason) {
    if (!this.isConfigured) return;

    const mailOptions = {
      from: `"Threads Pro Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Threads Pro Bot License Has Been Revoked",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e41e3f;">License Revoked</h2>
          
          <p>Your Threads Pro Bot license has been revoked for the following reason:</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <p>If you believe this is an error, please contact our support team immediately.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`License revoked email sent to ${email}`);
    } catch (error) {
      logger.error("Failed to send license revoked email:", error);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, message: "Email service not configured" };
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: "Email service is configured correctly",
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
