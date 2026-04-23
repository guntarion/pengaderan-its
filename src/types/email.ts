// File: /src/types/email.ts
// Type definitions for email-related functionality

/**
 * Interface for email sending request
 */
export interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Interface for email sending response
 */
export interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}
