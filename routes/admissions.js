const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
let transporter = null;

// Initialize email transporter with better configuration
const initEmailTransporter = () => {
  if (!transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Initializing email transporter with user:', process.env.EMAIL_USER);
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: false, // Changed to false for better debugging
      debug: true, // Enable debug mode
      logger: true  // Enable logging
    });
    
    // Verify transporter configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter verification failed:', error);
        transporter = null;
      } else {
        console.log('Email server is ready to send messages');
      }
    });
  }
  return transporter;
};

// Function to send emails with detailed logging
const sendEmails = async (admissionData) => {
  const { name, mobileNumber, emailAddress, course, submittedAt, _id } = admissionData;
  
  console.log('Starting email sending process for:', emailAddress);
  
  const transporter = initEmailTransporter();
  if (!transporter) {
    console.error('Email transporter not initialized - check EMAIL_USER and EMAIL_PASS in .env');
    throw new Error('Email service not configured. Please check environment variables.');
  }
  
  // Admin email content (to vaishnavimanikeri@gmail.com)
  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd;">
      <h2 style="color: #0a2a66; border-bottom: 2px solid #0a2a66; padding-bottom: 10px;">New Admission Enquiry</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>📝 Student Name:</strong> ${name}</p>
        <p><strong>📱 Mobile Number:</strong> ${mobileNumber}</p>
        <p><strong>✉️ Email:</strong> ${emailAddress}</p>
        <p><strong>📚 Course:</strong> ${course}</p>
        <p><strong>🕐 Submitted At:</strong> ${new Date(submittedAt).toLocaleString()}</p>
        <p><strong>🆔 Application ID:</strong> ${_id}</p>
      </div>
      <p style="color: #666;">⚠️ Action Required: Please contact the student within 24 hours.</p>
      <hr/>
      <p style="font-size: 12px; color: #999;">This is an automated notification from AIMS Admission System.</p>
    </div>
  `;
  
  const adminMailOptions = {
    from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
    to: 'vaishnavimanikeri@gmail.com',
    subject: `🔔 NEW ADMISSION ENQUIRY - ${course} - ${name}`,
    html: adminEmailHtml,
    text: `NEW ADMISSION ENQUIRY\n\nStudent Name: ${name}\nMobile Number: ${mobileNumber}\nEmail: ${emailAddress}\nCourse: ${course}\nSubmitted At: ${new Date(submittedAt).toLocaleString()}\nApplication ID: ${_id}\n\nAction Required: Please contact the student within 24 hours.`
  };
  
  // Student auto-reply email content
  const studentEmailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #0a2a66;">Thank You for Your Admission Enquiry</h2>
      <p>Dear ${name},</p>
      <p>Thank you for submitting your admission enquiry for <strong>${course}</strong> program at <strong>Aditya Institute of Management Studies (AIMS)</strong>, Bhubaneswar.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p>✅ We have received your details and our admission counselor will contact you within <strong>24-48 hours</strong>.</p>
        <p>📧 Your Application ID: <strong>${_id}</strong></p>
      </div>
      <p>In the meantime, if you have any immediate questions, please feel free to reach out to us.</p>
      <br/>
      <p>Best regards,<br/>
      <strong>Admission Office</strong><br/>
      AIMS Bhubaneswar</p>
      <hr/>
      <p style="font-size: 12px; color: #999;">This is an automated confirmation. Please do not reply to this email.</p>
    </div>
  `;
  
  const studentMailOptions = {
    from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
    to: emailAddress,
    subject: `Thank you for your admission enquiry - AIMS Bhubaneswar`,
    html: studentEmailHtml,
    text: `Thank You for Your Admission Enquiry\n\nDear ${name},\n\nThank you for submitting your admission enquiry for ${course} program at Aditya Institute of Management Studies (AIMS), Bhubaneswar.\n\nWe have received your details and our admission counselor will contact you within 24-48 hours.\n\nYour Application ID: ${_id}\n\nBest regards,\nAdmission Office\nAIMS Bhubaneswar`
  };
  
  // Send admin email first
  console.log('Sending admin email to vaishnavimanikeri@gmail.com...');
  const adminInfo = await transporter.sendMail(adminMailOptions);
  console.log('Admin email sent successfully:', adminInfo.messageId);
  
  // Send student email
  console.log(`Sending auto-reply email to ${emailAddress}...`);
  const studentInfo = await transporter.sendMail(studentMailOptions);
  console.log('Student email sent successfully:', studentInfo.messageId);
  
  return { success: true, adminMessageId: adminInfo.messageId, studentMessageId: studentInfo.messageId };
};

// POST - Submit admission form
router.post('/submit', async (req, res) => {
  try {
    console.log('Received admission form submission:', req.body);
    
    const { name, mobileNumber, emailAddress, course } = req.body;
    
    // Validate required fields
    if (!name || !mobileNumber || !emailAddress || !course) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Check for duplicate email
    const existingSubmission = await Admission.findOne(
      { emailAddress: emailAddress.toLowerCase() }, 
      { _id: 1 }
    ).lean();
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted an admission enquiry.' 
      });
    }
    
    // Create new admission record
    const admission = new Admission({
      name: name.trim(),
      mobileNumber,
      emailAddress: emailAddress.toLowerCase(),
      course
    });
    
    await admission.save();
    console.log(`Admission saved successfully. ID: ${admission._id}`);
    
    // Send emails
    let emailResult = null;
    let emailError = null;
    
    try {
      emailResult = await sendEmails(admission);
      console.log('Emails sent successfully:', emailResult);
      
      res.status(201).json({
        success: true,
        message: 'Admission form submitted successfully! A confirmation email has been sent to your email address, and the admin has been notified.',
        data: {
          id: admission._id,
          name: admission.name,
          course: admission.course,
          email: admission.emailAddress,
          submittedAt: admission.submittedAt
        }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // Still return success but with warning about email
      res.status(201).json({
        success: true,
        message: 'Admission form submitted successfully! However, there was an issue sending email notifications. Our team will contact you directly.',
        data: {
          id: admission._id,
          name: admission.name,
          course: admission.course,
          email: admission.emailAddress,
          submittedAt: admission.submittedAt
        },
        emailWarning: emailError.message
      });
    }
    
  } catch (error) {
    console.error('Submission error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: errors[0] || 'Validation error'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// GET - Test email endpoint with detailed output
router.get('/test-email', async (req, res) => {
  try {
    console.log('Test email endpoint called');
    
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS in environment variables.',
        config: {
          emailUser: !!process.env.EMAIL_USER,
          emailPass: !!process.env.EMAIL_PASS
        }
      });
    }
    
    console.log('Email configured with user:', process.env.EMAIL_USER);
    
    const testData = {
      name: 'Test User',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      course: 'MBA',
      submittedAt: new Date(),
      _id: 'TEST_ID_12345'
    };
    
    const result = await sendEmails(testData);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      details: {
        adminEmail: 'vaishnavimanikeri@gmail.com',
        adminMessageId: result.adminMessageId,
        studentEmail: 'test@example.com',
        studentMessageId: result.studentMessageId
      }
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test email failed: ' + error.message,
      error: error.toString()
    });
  }
});

// GET - Check email configuration status
router.get('/email-status', (req, res) => {
  const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const transporterStatus = !!transporter;
  
  res.json({
    success: true,
    emailConfigured: isConfigured,
    transporterReady: transporterStatus,
    emailUser: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}...` : null,
    message: isConfigured ? 'Email is configured' : 'Email not configured - please set EMAIL_USER and EMAIL_PASS'
  });
});

// GET - Fetch all admissions (with pagination)
router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [admissions, total] = await Promise.all([
      Admission.find().sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
      Admission.countDocuments()
    ]);
    
    res.json({
      success: true,
      count: admissions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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

// GET - Single admission by ID
router.get('/:id', async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).lean();
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
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
      message: 'Error fetching admission' 
    });
  }
});

// PUT - Update status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: admission
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating status' 
    });
  }
});

// DELETE - Delete admission
router.delete('/:id', async (req, res) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    res.json({
      success: true,
      message: 'Admission deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting admission' 
    });
  }
});

module.exports = router;
