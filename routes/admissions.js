const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');

// Create Brevo transporter (more reliable on cloud hosts)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.BREVO_EMAIL, // Your Brevo login email
      pass: process.env.BREVO_SMTP_KEY // Your SMTP key from Brevo
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
};

// Test email configuration endpoint
router.get('/test-email', async (req, res) => {
  console.log('Test email endpoint called');
  try {
    if (!process.env.BREVO_EMAIL || !process.env.BREVO_SMTP_KEY) {
      return res.json({
        success: false,
        message: 'Brevo configuration missing',
        brevoEmailSet: !!process.env.BREVO_EMAIL,
        brevoKeySet: !!process.env.BREVO_SMTP_KEY
      });
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Brevo email configuration is working!',
      brevoEmail: process.env.BREVO_EMAIL
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to send emails using Brevo
const sendAdmissionEmail = async (admissionData) => {
  const { name, email, phone, course, qualification, message } = admissionData;
  
  const transporter = createTransporter();
  
  // Email to admin (vaishnavimanikeri@gmail.com)
  const adminMailOptions = {
    from: `"AIMS Admission System" <${process.env.BREVO_EMAIL}>`,
    to: 'vaishnavimanikeri@gmail.com',
    replyTo: email,
    subject: `🎓 New Admission Application - ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a2a66; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #0a2a66; width: 120px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎓 New Admission Application</h2>
            <p>Submitted on ${new Date().toLocaleString()}</p>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Student Name:</span>
              <span>${name}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span>${email}</span>
            </div>
            <div class="field">
              <span class="label">Phone:</span>
              <span>${phone}</span>
            </div>
            <div class="field">
              <span class="label">Course:</span>
              <span>${course}</span>
            </div>
            <div class="field">
              <span class="label">Qualification:</span>
              <span>${qualification}</span>
            </div>
            ${message ? `<div class="field"><span class="label">Message:</span><span>${message}</span></div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `
  };

  // Auto-reply to student
  const studentMailOptions = {
    from: `"AIMS Admission Office" <${process.env.BREVO_EMAIL}>`,
    to: email,
    subject: 'Thank you for applying to AIMS Bhubaneswar',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a2a66; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Application Received!</h2>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for applying to <strong>Aditya Institute of Management Studies (AIMS)</strong>, Bhubaneswar.</p>
            <p>We have received your application for <strong>${course}</strong>.</p>
            <p>Our admission counselor will contact you within 24-48 hours.</p>
            <br>
            <p>Best regards,<br>
            <strong>Admission Office</strong><br>
            AIMS Bhubaneswar</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(studentMailOptions);
  return true;
};

// POST - Submit admission form (keep your existing working code)
router.post('/submit', async (req, res) => {
  // ... your existing submit code from before
  // Just replace the email sending part to use sendAdmissionEmail function
});

// ... rest of your routes (all, :id, etc.)
