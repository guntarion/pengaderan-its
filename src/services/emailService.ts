// File: /src/services/emailService.ts
// Service to handle email sending functionality

import { EmailRequest, EmailResponse } from '@/types/email';

/**
 * Send an email using the API
 * 
 * @param emailData The email data containing recipient, subject, and body
 * @returns Promise with the response from the email API
 */
export const sendEmail = async (emailData: EmailRequest): Promise<EmailResponse> => {
  try {
    // Call the API endpoint
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    // Parse the JSON response
    const data = await response.json();

    // Return the response data
    return data;
  } catch (error) {
    // Handle any errors
    console.error('Error in email service:', error);
    return {
      success: false,
      message: 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
