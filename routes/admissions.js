const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter - Initialize immediately
let transporter = null;

// Initialize email transporter IMMEDIATELY when server starts
const initEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials missing in environment variables');
    return null;
  }
  
  if (!transporter) {
    console.log('Initializing email transporter with user:', process.env.EMAIL_USER);
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: true, // Use pooled connections for better performance
      maxConnections: 5,
      maxMessages: 100
    });
  }
  
  // Verify connection (don't await here to avoid blocking)
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter verification failed:', error);
      transporter = null;
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
  
  return transporter;
};

// Initialize transporter on module load
initEmailTransporter();

// Function to send emails with performance optimization
const sendEmails = async (admissionData) => {
  const { name, mobileNumber, emailAddress, course, submittedAt, _id } = admissionData;
  
  // Check if transporter is ready
  if (!transporter) {
    const newTransporter = initEmailTransporter();
    if (!newTransporter) {
      throw new Error('Email service not configured. Please check environment variables.');
    }
  }
  
  // Prepare email content
  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #ddd;">
      <h2 style="color: #0a2a66;">📋 New Admission Enquiry</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Student Name:</strong> ${name}</p>
        <p><strong>Mobile Number:</strong> ${mobileNumber}</p>
        <p><strong>Email:</strong> ${emailAddress}</p>
        <p><strong>Course:</strong> ${course}</p>
        <p><strong>Submitted At:</strong> ${new Date(submittedAt).toLocaleString()}</p>
        <p><strong>Application ID:</strong> ${_id}</p>
      </div>
      <p><strong>Action Required:</strong> Please contact the student within 24 hours.</p>
    </div>
  `;
  
  const studentEmailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <h2 style="color: #0a2a66;">Thank You for Your Admission Enquiry</h2>
      <p>Dear ${name},</p>
      <p>Thank you for submitting your admission enquiry for <strong>${course}</strong> program at <strong>Aditya Institute of Management Studies (AIMS)</strong>, Bhubaneswar.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p>✅ We have received your details and our admission counselor will contact you within <strong>24-48 hours</strong>.</p>
        <p>📧 Your Application ID: <strong>${_id}</strong></p>
      </div>
      <p>Best regards,<br/>
      <strong>Admission Office</strong><br/>
      AIMS Bhubaneswar</p>
    </div>
  `;
  
  // Send both emails in parallel for better performance
  const [adminInfo, studentInfo] = await Promise.all([
    transporter.sendMail({
      from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
      to: 'vaishnavimanikeri@gmail.com',
      subject: `🔔 NEW ADMISSION - ${course} - ${name}`,
      html: adminEmailHtml,
      text: `NEW ADMISSION ENQUIRY\n\nName: ${name}\nMobile: ${mobileNumber}\nEmail: ${emailAddress}\nCourse: ${course}`
    }),
    transporter.sendMail({
      from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
      to: emailAddress,
      subject: `Thank you for your admission enquiry - AIMS Bhubaneswar`,
      html: studentEmailHtml,
      text: `Thank you for your admission enquiry!\n\nDear ${name},\n\nWe have received your details and will contact you within 24-48 hours.\n\nBest regards,\nAIMS Bhubaneswar`
    })
  ]);
  
  console.log('✅ Emails sent - Admin:', adminInfo.messageId, 'Student:', studentInfo.messageId);
  return { success: true };
};

// ============= OPTIMIZED ROUTES =============

// GET - Email status endpoint (UPDATED)
router.get('/email-status', (req, res) => {
  const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const transporterReady = !!transporter;
  
  // Attempt to initialize if not ready
  if (isConfigured && !transporterReady) {
    initEmailTransporter();
  }
  
  res.json({
    success: true,
    emailConfigured: isConfigured,
    transporterReady: !!transporter, // This should now be true
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : null,
    message: isConfigured && transporter ? 'Email is configured and ready' : 'Email configured but transporter not ready'
  });
});

// POST - Submit admission form (OPTIMIZED for speed)
router.post('/submit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { name, mobileNumber, emailAddress, course } = req.body;
    
    // Quick validation
    if (!name || !mobileNumber || !emailAddress || !course) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Quick duplicate check (use lean() for faster query)
    const existingSubmission = await Admission.findOne(
      { emailAddress: emailAddress.toLowerCase() }, 
      { _id: 1 }
    ).lean().maxTimeMS(2000); // 2 second timeout
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted an admission enquiry.' 
      });
    }
    
    // Create and save admission
    const admission = new Admission({
      name: name.trim(),
      mobileNumber,
      emailAddress: emailAddress.toLowerCase(),
      course
    });
    
    await admission.save();
    console.log(`✅ Admission saved in ${Date.now() - startTime}ms. ID: ${admission._id}`);
    
    // Send emails in background (don't await - fire and forget for speed)
    sendEmails(admission).catch(error => {
      console.error('Background email sending failed:', error);
    });
    
    // Immediate response (under 500ms typically)
    const responseTime = Date.now() - startTime;
    console.log(`✅ Form submitted successfully in ${responseTime}ms`);
    
    res.status(201).json({
      success: true,
      message: 'Admission form submitted successfully! You will receive a confirmation email shortly.',
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course,
        email: admission.emailAddress,
        submittedAt: admission.submittedAt
      },
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('Submission error:', error);
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: errors[0] || 'Validation error',
        responseTime: `${responseTime}ms`
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.',
      responseTime: `${responseTime}ms`
    });
  }
});

// GET - Test email endpoint
router.get('/test-email', async (req, res) => {
  try {
    if (!transporter) {
      initEmailTransporter();
      if (!transporter) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email transporter not ready. Please check configuration.'
        });
      }
    }
    
    const testData = {
      name: 'Test User',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      course: 'MBA',
      submittedAt: new Date(),
      _id: 'TEST_' + Date.now()
    };
    
    await sendEmails(testData);
    
    res.json({ 
      success: true, 
      message: '✅ Test email sent successfully to vaishnavimanikeri@gmail.com! Please check inbox/spam.'
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test email failed: ' + error.message 
    });
  }
});

// GET - Fetch all admissions (optimized with indexes)
router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [admissions, total] = await Promise.all([
      Admission.find()
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(5000),
      Admission.countDocuments().maxTimeMS(2000)
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
