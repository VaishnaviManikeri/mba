const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');

// Email transporter (reuse from server.js or create new)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send email
const sendAdmissionEmail = async (admissionData) => {
  const { name, email, phone, course, qualification, message } = admissionData;
  
  // Email to admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: 'vaishnavimanikeri@gmail.com',
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
    from: process.env.EMAIL_USER,
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
            
            <p>For any urgent queries, please call us at: <strong>+91 XXXXX XXXXX</strong></p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Admission Office</strong><br>
            AIMS Bhubaneswar</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  // Send both emails
  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(studentMailOptions);
  
  return true;
};

// POST - Submit admission form
router.post('/submit', async (req, res) => {
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
    
    // Validate phone (basic validation)
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (10-15 digits)'
      });
    }
    
    // Create new admission record
    const admission = new Admission({
      name,
      email,
      phone: cleanPhone,
      course,
      qualification,
      message: message || ''
    });
    
    // Save to database
    await admission.save();
    
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
      
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! We have sent a confirmation email to your inbox. Our admission counselor will contact you soon.'
      });
      
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Still return success since data is saved in DB
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully! Our admission counselor will contact you soon.'
      });
    }
    
  } catch (error) {
    console.error('Submission error:', error);
    
    // Handle duplicate or validation errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This application has already been submitted.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// GET - Fetch all admissions (protected route for admin)
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

// GET - Fetch single admission by ID
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
