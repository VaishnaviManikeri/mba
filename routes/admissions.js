const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');

// IMPORTANT: Place specific routes BEFORE parameterized routes
// Test email endpoint - MUST be before /:id route
router.get('/test-email', async (req, res) => {
  console.log('Test email endpoint called');
  try {
    // Check if email config exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.json({
        success: false,
        message: 'Email configuration missing',
        emailUserSet: !!process.env.EMAIL_USER,
        emailPassSet: !!process.env.EMAIL_PASS
      });
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Verify connection
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Email configuration is working!',
      emailUser: process.env.EMAIL_USER
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.json({
      success: false,
      message: error.message,
      emailUser: process.env.EMAIL_USER ? 'Set' : 'Not set'
    });
  }
});

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Helper function to send email
const sendAdmissionEmail = async (admissionData) => {
  const { name, email, phone, course, qualification, message } = admissionData;
  
  console.log('Preparing to send emails for:', email);
  
  const transporter = createTransporter();
  
  // Email to admin
  const adminMailOptions = {
    from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
    to: 'vaishnavimanikeri@gmail.com',
    replyTo: email,
    subject: `🎓 New Admission Application - ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #0a2a66; display: inline-block; width: 120px; }
          .value { color: #333; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          .badge { background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; display: inline-block; }
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
              <span class="label">📋 Student Name:</span>
              <span class="value">${name}</span>
            </div>
            <div class="field">
              <span class="label">📧 Email:</span>
              <span class="value">${email}</span>
            </div>
            <div class="field">
              <span class="label">📞 Phone:</span>
              <span class="value">${phone}</span>
            </div>
            <div class="field">
              <span class="label">🎯 Course:</span>
              <span class="value">${course}</span>
            </div>
            <div class="field">
              <span class="label">📚 Qualification:</span>
              <span class="value">${qualification}</span>
            </div>
            ${message ? `
            <div class="field">
              <span class="label">💬 Message:</span>
              <span class="value">${message}</span>
            </div>
            ` : ''}
            <div style="margin-top: 20px; padding: 15px; background: #e8f0fe; border-radius: 5px;">
              <span class="badge">New Application</span>
              <p style="margin-top: 10px; font-size: 14px;">Please contact the student within 24 hours.</p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from AIMS Admission System.</p>
            <p>© ${new Date().getFullYear()} AIMS Bhubaneswar</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  // Auto-reply to student
  const studentMailOptions = {
    from: `"AIMS Admission Office" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Thank you for applying to AIMS Bhubaneswar',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .button { background: #0a2a66; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎓 Application Received!</h2>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for applying to <strong>Aditya Institute of Management Studies (AIMS)</strong>, Bhubaneswar.</p>
            <p>We have received your application for <strong>${course}</strong> and our admission counselor will contact you within 24-48 hours.</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Application Summary</h3>
              <p><strong>Course:</strong> ${course}</p>
              <p><strong>Qualification:</strong> ${qualification}</p>
              <p><strong>Application ID:</strong> AIMS${Date.now()}</p>
            </div>
            
            <p>In the meantime, you can:</p>
            <ul>
              <li>Visit our website for more information</li>
              <li>Follow us on social media for updates</li>
              <li>Prepare for the admission counseling session</li>
            </ul>
            
            <a href="https://adityainstitutemanagement.com" class="button">Visit Our Website</a>
            
            <p>For any urgent queries, please call us at: <strong>+91 1234567890</strong></p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Admission Office</strong><br>
            AIMS Bhubaneswar</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    // Send email to admin
    console.log('Sending email to admin: vaishnavimanikeri@gmail.com');
    const adminInfo = await transporter.sendMail(adminMailOptions);
    console.log('Admin email sent:', adminInfo.messageId);
    
    // Send email to student
    console.log('Sending email to student:', email);
    const studentInfo = await transporter.sendMail(studentMailOptions);
    console.log('Student email sent:', studentInfo.messageId);
    
    return true;
  } catch (error) {
    console.error('Detailed email error:', error);
    throw error;
  }
};

// POST - Submit admission form
router.post('/submit', async (req, res) => {
  console.log('\n=== NEW FORM SUBMISSION ===');
  console.log('Request Body:', req.body);
  
  try {
    const { name, email, phone, course, qualification, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !course || !qualification) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Validate phone
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (10-15 digits)'
      });
    }
    
    // Save to database
    const admission = new Admission({
      name,
      email,
      phone: cleanPhone,
      course,
      qualification,
      message: message || ''
    });
    
    await admission.save();
    console.log('Data saved to MongoDB, ID:', admission._id);
    
    // Send email notifications
    try {
      await sendAdmissionEmail({
        name,
        email,
        phone: cleanPhone,
        course,
        qualification,
        message: message || ''
      });
      console.log('Emails sent successfully!');
      
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! Confirmation email sent.'
      });
      
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! (Email notification pending)'
      });
    }
    
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// GET - Fetch all admissions
router.get('/all', async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: admissions.length,
      data: admissions
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admissions'
    });
  }
});

// GET - Fetch single admission by ID - MUST be LAST
router.get('/:id', async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    res.json({
      success: true,
      data: admission
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application'
    });
  }
});

module.exports = router;
