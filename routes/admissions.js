const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send email
async function sendAdmissionEmail(admissionData) {
  const { name, mobileNumber, emailAddress, course, submittedAt } = admissionData;
  
  // Email to admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: 'vaishnavimanikeri@gmail.com',
    subject: `New Admission Enquiry - ${course} Application from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .label { font-weight: bold; color: #0a2a66; display: inline-block; width: 120px; }
          .value { color: #333; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          .badge { background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎓 New Admission Enquiry</h2>
            <p>Application Received</p>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Student Name:</span>
              <span class="value">${name}</span>
            </div>
            <div class="field">
              <span class="label">Mobile Number:</span>
              <span class="value">${mobileNumber}</span>
            </div>
            <div class="field">
              <span class="label">Email Address:</span>
              <span class="value">${emailAddress}</span>
            </div>
            <div class="field">
              <span class="label">Course Applied:</span>
              <span class="value"><span class="badge">${course}</span></span>
            </div>
            <div class="field">
              <span class="label">Submitted At:</span>
              <span class="value">${new Date(submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee;">
              <strong>Action Required:</strong> Please contact the student within 24 hours.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from AIMS Admission System</p>
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
    to: emailAddress,
    subject: `Thank you for your admission enquiry - AIMS Bhubaneswar`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #0a2a66; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 Thank You for Your Interest!</h2>
            <p>Admission Enquiry Received</p>
          </div>
          <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for submitting your admission enquiry for <strong>${course}</strong> program at <strong>Aditya Institute of Management Studies (AIMS), Bhubaneswar</strong>.</p>
            <p>We have received your details and our admission counselor will contact you within 24-48 hours to guide you through:</p>
            <ul>
              <li>Admission process and deadlines</li>
              <li>Course curriculum and specializations</li>
              <li>Fee structure and scholarship opportunities</li>
              <li>Campus tour and counseling sessions</li>
            </ul>
            <p>For immediate assistance, please call us at: <strong>+91-XXXXXXXXXX</strong></p>
            <a href="https://adityainstitutemanagement.com" class="button">Visit Our Website</a>
            <p style="margin-top: 20px;">Best regards,<br>
            <strong>Admission Office</strong><br>
            AIMS Bhubaneswar</p>
          </div>
          <div class="footer">
            <p>This is an automated confirmation email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    // Send email to admin
    await transporter.sendMail(adminMailOptions);
    console.log('Admin email sent successfully');
    
    // Send auto-reply to student
    await transporter.sendMail(studentMailOptions);
    console.log('Student auto-reply email sent successfully');
    
    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

// POST - Submit admission form
router.post('/submit', async (req, res) => {
  try {
    const { name, mobileNumber, emailAddress, course } = req.body;
    
    // Check if student already submitted
    const existingSubmission = await Admission.findOne({ 
      emailAddress: emailAddress.toLowerCase(),
      status: { $ne: 'enrolled' }
    });
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted an admission enquiry. Our counselor will contact you soon.' 
      });
    }
    
    // Create new admission record
    const admission = new Admission({
      name: name.trim(),
      mobileNumber,
      emailAddress: emailAddress.toLowerCase(),
      course
    });
    
    // Save to database (MongoDB will automatically create the collection if it doesn't exist)
    await admission.save();
    console.log('Admission saved to database:', admission);
    
    // Send email notifications
    try {
      await sendAdmissionEmail(admission);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails, just log it
    }
    
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
    
  } catch (error) {
    console.error('Submission error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
});

// GET - Fetch all admissions (for admin dashboard)
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

// PUT - Update admission status (for admin)
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

// DELETE - Delete admission (for admin)
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
