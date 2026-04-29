const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter once (not per request)
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
      // Increase timeout and add pool for better performance
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });
    
    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter error:', error);
      } else {
        console.log('Email server is ready to send messages');
      }
    });
  }
  return transporter;
};

// Send email asynchronously without blocking response
const sendEmailsAsync = async (admissionData) => {
  const { name, mobileNumber, emailAddress, course, submittedAt } = admissionData;
  
  if (!initEmailTransporter()) {
    console.error('Email transporter not initialized');
    return;
  }
  
  // Simple email template without heavy HTML (faster)
  const adminEmailText = `
New Admission Enquiry

Student Name: ${name}
Mobile Number: ${mobileNumber}
Email: ${emailAddress}
Course: ${course}
Submitted At: ${new Date(submittedAt).toLocaleString()}

Action Required: Please contact the student within 24 hours.
  `;
  
  const studentEmailText = `
Thank you for your admission enquiry - AIMS Bhubaneswar

Dear ${name},

Thank you for submitting your admission enquiry for ${course} program at Aditya Institute of Management Studies (AIMS), Bhubaneswar.

We have received your details and our admission counselor will contact you within 24-48 hours.

Best regards,
Admission Office
AIMS Bhubaneswar
  `;
  
  const adminMailOptions = {
    from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
    to: 'vaishnavimanikeri@gmail.com',
    subject: `New Admission Enquiry - ${course} - ${name}`,
    text: adminEmailText
  };
  
  const studentMailOptions = {
    from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
    to: emailAddress,
    subject: `Thank you for your admission enquiry - AIMS Bhubaneswar`,
    text: studentEmailText
  };
  
  try {
    // Send emails in parallel (faster)
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(studentMailOptions)
    ]);
    console.log('Both emails sent successfully for:', emailAddress);
  } catch (error) {
    console.error('Email sending error:', error.message);
  }
};

// POST - Fast submission endpoint
router.post('/submit', async (req, res) => {
  try {
    const { name, mobileNumber, emailAddress, course } = req.body;
    
    // Quick validation
    if (!name || !mobileNumber || !emailAddress || !course) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Check for duplicate (fast query with lean())
    const existingSubmission = await Admission.findOne(
      { emailAddress: emailAddress.toLowerCase() }, 
      { _id: 1 } // Only get _id for speed
    ).lean();
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted an admission enquiry.' 
      });
    }
    
    // Create and save in one step
    const admission = new Admission({
      name: name.trim(),
      mobileNumber,
      emailAddress: emailAddress.toLowerCase(),
      course
    });
    
    // Save to database (this is the main operation)
    await admission.save();
    
    // Send response immediately (don't wait for emails)
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
    
    // Send emails in background (doesn't block response)
    sendEmailsAsync(admission).catch(err => {
      console.error('Background email sending failed:', err);
    });
    
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

// GET - Fetch all admissions (with pagination for speed)
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

// GET - Single admission
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

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const testData = {
      name: 'Test User',
      mobileNumber: '9999999999',
      emailAddress: 'test@example.com',
      course: 'MBA',
      submittedAt: new Date()
    };
    
    await sendEmailsAsync(testData);
    res.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
