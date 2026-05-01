const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
let transporter = null;

// Initialize email transporter
const initEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials missing in environment variables');
    return null;
  }
  
  if (!transporter) {
    console.log('📧 Initializing email transporter with user:', process.env.EMAIL_USER);
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
  }
  
  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error);
      transporter = null;
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
  
  return transporter;
};

// Initialize transporter on module load
initEmailTransporter();

// Function to send emails with SEPARATE handling for admin and student
const sendAdminEmail = async (admissionData) => {
  const { name, mobileNumber, emailAddress, course, submittedAt, _id } = admissionData;
  
  console.log(`📤 Sending ADMIN email for ${name} to vaishnavimanikeri@gmail.com`);
  
  if (!transporter) {
    console.error('❌ Transporter not initialized');
    throw new Error('Email transporter not ready');
  }
  
  const adminEmailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #0a2a66;">
      <h2 style="color: #0a2a66; background: #f0f4ff; padding: 10px;">📋 NEW ADMISSION ENQUIRY</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>👤 Student Name:</strong> ${name}</p>
        <p><strong>📱 Mobile Number:</strong> ${mobileNumber}</p>
        <p><strong>✉️ Email:</strong> ${emailAddress}</p>
        <p><strong>📚 Course:</strong> ${course}</p>
        <p><strong>🕐 Submitted At:</strong> ${new Date(submittedAt).toLocaleString()}</p>
        <p><strong>🆔 Application ID:</strong> ${_id}</p>
      </div>
      <p style="color: #d32f2f;"><strong>⚠️ ACTION REQUIRED:</strong> Please contact the student within 24 hours.</p>
      <hr/>
      <p style="font-size: 12px; color: #666;">This is an automated notification from AIMS Admission System.</p>
    </div>
  `;
  
  const adminMailOptions = {
    from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
    to: 'vaishnavimanikeri@gmail.com',  // Hardcoded admin email
    replyTo: emailAddress,  // So admin can reply directly to student
    subject: `🔔 NEW ADMISSION ENQUIRY - ${course} - ${name}`,
    html: adminEmailHtml,
    text: `NEW ADMISSION ENQUIRY\n\nStudent Name: ${name}\nMobile Number: ${mobileNumber}\nEmail: ${emailAddress}\nCourse: ${course}\nSubmitted At: ${new Date(submittedAt).toLocaleString()}\nApplication ID: ${_id}\n\nACTION REQUIRED: Please contact the student within 24 hours.`
  };
  
  const info = await transporter.sendMail(adminMailOptions);
  console.log(`✅ ADMIN email sent successfully! Message ID: ${info.messageId}`);
  return info;
};

const sendStudentEmail = async (admissionData) => {
  const { name, emailAddress, course, _id } = admissionData;
  
  console.log(`📤 Sending STUDENT auto-reply email to ${emailAddress}`);
  
  if (!transporter) {
    console.error('❌ Transporter not initialized');
    throw new Error('Email transporter not ready');
  }
  
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
  
  const info = await transporter.sendMail(studentMailOptions);
  console.log(`✅ STUDENT auto-reply email sent successfully to ${emailAddress}! Message ID: ${info.messageId}`);
  return info;
};

// POST - Submit admission form
router.post('/submit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { name, mobileNumber, emailAddress, course } = req.body;
    console.log('📝 Received admission form submission:', { name, mobileNumber, emailAddress, course });
    
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
    console.log(`✅ Admission saved. ID: ${admission._id}, Name: ${name}`);
    
    // Track email sending results
    let adminEmailSent = false;
    let studentEmailSent = false;
    let emailErrors = [];
    
    // Send ADMIN email first (to vaishnavimanikeri@gmail.com)
    try {
      await sendAdminEmail(admission);
      adminEmailSent = true;
      console.log('✅ Admin notification sent to vaishnavimanikeri@gmail.com');
    } catch (adminError) {
      console.error('❌ Failed to send admin email:', adminError);
      emailErrors.push(`Admin email failed: ${adminError.message}`);
    }
    
    // Send STUDENT auto-reply email
    try {
      await sendStudentEmail(admission);
      studentEmailSent = true;
      console.log(`✅ Auto-reply sent to student: ${emailAddress}`);
    } catch (studentError) {
      console.error('❌ Failed to send student email:', studentError);
      emailErrors.push(`Student email failed: ${studentError.message}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    // Prepare response message
    let responseMessage = 'Admission form submitted successfully!';
    if (adminEmailSent && studentEmailSent) {
      responseMessage = '✅ Admission form submitted successfully! Admin has been notified and you will receive a confirmation email shortly.';
    } else if (adminEmailSent && !studentEmailSent) {
      responseMessage = '⚠️ Form submitted but auto-reply email could not be sent. Admin has been notified.';
    } else if (!adminEmailSent && studentEmailSent) {
      responseMessage = '⚠️ Form submitted but admin notification failed. Our team will still contact you.';
    } else {
      responseMessage = '⚠️ Form submitted but email notifications failed. Our team will contact you directly.';
    }
    
    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course,
        email: admission.emailAddress,
        submittedAt: admission.submittedAt
      },
      emailStatus: {
        adminNotified: adminEmailSent,
        autoReplySent: studentEmailSent,
        errors: emailErrors.length > 0 ? emailErrors : null
      },
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('❌ Submission error:', error);
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

// GET - Test email endpoint (specifically for admin email)
router.get('/test-admin-email', async (req, res) => {
  try {
    console.log('📧 Testing admin email to vaishnavimanikeri@gmail.com');
    
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
      name: 'TEST USER - Please Ignore',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      course: 'MBA',
      submittedAt: new Date(),
      _id: 'TEST_' + Date.now()
    };
    
    const result = await sendAdminEmail(testData);
    
    res.json({ 
      success: true, 
      message: '✅ Test email sent successfully to vaishnavimanikeri@gmail.com!',
      messageId: result.messageId,
      note: 'Please check your inbox and spam folder'
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test email failed: ' + error.message,
      error: error.toString()
    });
  }
});

// GET - Email status endpoint (updated)
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
    transporterReady: !!transporter,
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER : null,
    adminEmail: 'vaishnavimanikeri@gmail.com',
    message: isConfigured && transporter ? '✅ Email is configured and ready' : '⚠️ Email configured but transporter not ready',
    tips: [
      'Make sure EMAIL_PASS is using Gmail App Password (not regular password)',
      'Check that 2-Factor Authentication is enabled on Gmail',
      'Verify the sender email has permission to send emails'
    ]
  });
});

// GET - Fetch all admissions
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
