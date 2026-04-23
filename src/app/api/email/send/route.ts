// File: /app/api/email/send/route.ts
// This file handles the API route for sending emails through the SMTP server.

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Define the request body type
interface SendEmailRequestBody {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * API Route handler for sending emails
 * @param request The incoming request with email details
 * @returns Response indicating success or failure
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: SendEmailRequestBody = await request.json();
    
    // Validate required fields
    if (!body.to || !body.subject || (!body.text && !body.html)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: to, subject, and either text or html body' 
        }, 
        { status: 400 }
      );
    }

    // Create email transporter with environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Configure email options
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    // Return success response with message ID
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Return appropriate error message
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
