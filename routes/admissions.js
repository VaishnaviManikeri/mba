const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter with better configuration
let transporter = null;

// Initialize email transporter
const initEmailTransporter = () => {
  if (!transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Add these options for better reliability
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    
    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email transporter error:', error);
      } else {
        console.log('✅ Email server is ready to send messages');
      }
    });
  }
  return transporter;
};

// Improved email sending function with retry logic
const sendEmailsAsync = async (admissionData, retryCount = 0) => {
  const { name, mobileNumber, emailAddress, course, submittedAt } = admissionData;
  
  const emailTransporter = initEmailTransporter();
  if (!emailTransporter) {
    console.error('❌ Email transporter not initialized. Check EMAIL_USER and EMAIL_PASS');
    return { success: false, error: 'Email service not configured' };
  }
  
  const adminEmailText = `
📋 NEW ADMISSION ENQUIRY - AIMS Bhubaneswar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Student Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Student Name: ${name}
📱 Mobile Number: ${mobileNumber}
📧 Email: ${emailAddress}
📚 Course: ${course}
🕐 Submitted At: ${new Date(submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Status: Pending
Action Required: Contact student within 24 hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
  
  const studentEmailText = `
🎓 Thank you for your admission enquiry - AIMS Bhubaneswar

Dear ${name},

Thank you for submitting your admission enquiry for the ${course} program at Aditya Institute of Management Studies (AIMS), Bhubaneswar.

📌 We have received your details and here's what happens next:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Our admission counselor will contact you within 24-48 hours
✓ You will receive guidance on the admission process
✓ We'll help you with application and documentation

📞 For immediate assistance, contact our admission helpline:
   Phone: [Your College Phone Number]
   Email: admissions@aimsbbsr.com

Best regards,
Admission Office
Aditya Institute of Management Studies (AIMS)
Bhubaneswar, Odisha
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*This is an automated message, please do not reply directly to this email.*
  `;
  
  const adminMailOptions = {
    from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
    to: 'vaishnavimanikeri@gmail.com',
    subject: `🔔 NEW ADMISSION ENQUIRY - ${course} - ${name}`,
    text: adminEmailText,
    headers: {
      'Priority': 'high',
      'Importance': 'high'
    }
  };
  
  const studentMailOptions = {
    from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
    to: emailAddress,
    subject: `✅ Acknowledgement: Admission Enquiry Received - AIMS Bhubaneswar`,
    text: studentEmailText
  };
  
  try {
    console.log(`📧 Attempting to send emails for: ${emailAddress} (Attempt ${retryCount + 1})`);
    
    // Send emails sequentially with timeout
    const adminResult = await emailTransporter.sendMail(adminMailOptions);
    console.log('✅ Admin email sent:', adminResult.messageId);
    
    const studentResult = await emailTransporter.sendMail(studentMailOptions);
    console.log('✅ Student email sent:', studentResult.messageId);
    
    console.log('🎉 Both emails sent successfully for:', emailAddress);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Email sending error (Attempt ${retryCount + 1}):`, error.message);
    
    // Retry once if failed
    if (retryCount < 1) {
      console.log('🔄 Retrying email send...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return sendEmailsAsync(admissionData, retryCount + 1);
    }
    
    return { success: false, error: error.message };
  }
};

// POST - Submit admission form
router.post('/submit', async (req, res) => {
  try {
    const { name, mobileNumber, emailAddress, course } = req.body;
    
    // Validation
    if (!name || !mobileNumber || !emailAddress || !course) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Check for duplicate
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
    
    // Save to database
    const admission = new Admission({
      name: name.trim(),
      mobileNumber,
      emailAddress: emailAddress.toLowerCase(),
      course
    });
    
    await admission.save();
    console.log('✅ Admission saved to database:', admission._id);
    
    // Send response immediately
    res.status(201).json({
      success: true,
      message: 'Admission form submitted successfully! We will contact you shortly.',
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course,
        submittedAt: admission.submittedAt
      }
    });
    
    // Send emails in background (don't await)
    sendEmailsAsync(admission).catch(err => {
      console.error('❌ Background email sending failed:', err);
    });
    
  } catch (error) {
    console.error('❌ Submission error:', error);
    
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

// GET - Test email endpoint
router.get('/test-email', async (req, res) => {
  try {
    console.log('📧 Test email endpoint called');
    
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
    
    const testData = {
      name: 'Test User',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      course: 'MBA',
      submittedAt: new Date()
    };
    
    const result = await sendEmailsAsync(testData);
    
    if (result && result.success) {
      res.json({ 
        success: true, 
        message: '✅ Test email sent successfully to vaishnavimanikeri@gmail.com! Please check your inbox and spam folder.' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '❌ Failed to send test email. Check server logs for details.',
        error: result?.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test email failed: ' + error.message 
    });
  }
});

// GET - Email configuration status
router.get('/email-status', (req, res) => {
  const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  res.json({
    success: true,
    configured: isConfigured,
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 3) + '***' : 'not set',
    hasPassword: !!process.env.EMAIL_PASS,
    message: isConfigured ? 'Email is configured' : 'Email is NOT configured'
  });
});

// ... rest of your routes (GET /all, GET /:id, etc.) remain the same
