const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

// ====================== MIDDLEWARE ======================
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://adityainstitutemanagement.com",
    "https://www.adityainstitutemanagement.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ====================== DATABASE CONNECTION ======================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ====================== EMAIL CONFIGURATION ======================
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials missing');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });
};

let transporter = createTransporter();

// Verify transporter
const verifyTransporter = async () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  if (transporter) {
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email verification failed:', error.message);
      transporter = null;
      return false;
    }
  }
  return false;
};

verifyTransporter();

// ====================== EMAIL SEND FUNCTION ======================
const sendEmail = async (mailOptions) => {
  try {
    if (!transporter) {
      transporter = createTransporter();
      if (!transporter) {
        throw new Error('Transporter not available');
      }
    }
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    throw error;
  }
};

// ====================== ADMISSION FORM SUBMISSION ======================
app.post('/api/submit-admission', async (req, res) => {
  console.log('📝 Step 1: User submits admission form');
  
  try {
    const { name, mobile, email, course, message } = req.body;
    console.log(`📋 Form Data: Name: ${name}, Mobile: ${mobile}, Email: ${email}, Course: ${course}`);

    // ========== VALIDATION ==========
    console.log('🔍 Step 2: Validating form data');
    const errors = {};
    
    if (!name || name.trim().length < 2) {
      errors.name = 'Valid name is required';
    }
    
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile || !mobileRegex.test(mobile)) {
      errors.mobile = 'Valid 10-digit mobile number is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.email = 'Valid email address is required';
    }
    
    if (!course || !['MBA', 'MCA'].includes(course)) {
      errors.course = 'Please select a valid course';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation failed:', errors);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors 
      });
    }
    console.log('✅ Validation passed');

    // ========== SAVE TO DATABASE ==========
    console.log('💾 Step 3: Saving to database');
    const Admission = require('./models/Admission');
    
    // Check for duplicate
    const existing = await Admission.findOne({ emailAddress: email.toLowerCase() });
    if (existing) {
      console.log('⚠️ Duplicate submission found for:', email);
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an admission enquiry.'
      });
    }

    const admission = new Admission({
      name: name.trim(),
      mobileNumber: mobile,
      emailAddress: email.toLowerCase(),
      course,
      message: message || ''
    });
    
    await admission.save();
    console.log(`✅ Admission saved. ID: ${admission._id}`);

    // ========== SEND EMAILS ==========
    console.log('📧 Step 4: Sending emails');
    
    const adminEmail = 'adityainstitute.admission@gmail.com';
    let adminEmailSent = false;
    let studentEmailSent = false;
    const emailErrors = [];

    // 4a: Send to Admin
    try {
      console.log(`📤 Sending admin email to: ${adminEmail}`);
      
      const adminMailOptions = {
        from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        replyTo: email,
        subject: `🔔 NEW ADMISSION ENQUIRY - ${course} - ${name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #0a2a66; }
              .header { background: #0a2a66; color: white; padding: 15px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #0a2a66; }
              .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>📋 NEW ADMISSION ENQUIRY</h2>
              </div>
              <div class="content">
                <div class="field"><span class="label">👤 Student Name:</span> ${name}</div>
                <div class="field"><span class="label">📱 Mobile Number:</span> ${mobile}</div>
                <div class="field"><span class="label">✉️ Email:</span> ${email}</div>
                <div class="field"><span class="label">📚 Course:</span> ${course}</div>
                <div class="field"><span class="label">💬 Message:</span> ${message || 'No message provided'}</div>
                <div class="field"><span class="label">🕐 Submitted At:</span> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                <div class="field"><span class="label">🆔 Application ID:</span> ${admission._id}</div>
                <div class="field"><span class="label">📋 Reference:</span> ${admission.referenceNumber || 'N/A'}</div>
                
                <div class="highlight">
                  <p><strong>⚠️ ACTION REQUIRED:</strong> Please contact the student within 24 hours.</p>
                </div>
              </div>
              <div class="footer">
                <p>This is an automated notification from AIMS Admission System.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
NEW ADMISSION ENQUIRY
=====================
Student Name: ${name}
Mobile Number: ${mobile}
Email: ${email}
Course: ${course}
Message: ${message || 'No message provided'}
Submitted At: ${new Date().toLocaleString()}
Application ID: ${admission._id}

ACTION REQUIRED: Please contact the student within 24 hours.
        `
      };

      await sendEmail(adminMailOptions);
      adminEmailSent = true;
      console.log(`✅ Admin email sent successfully to ${adminEmail}`);
    } catch (adminError) {
      console.error('❌ Admin email failed:', adminError.message);
      emailErrors.push(`Admin email: ${adminError.message}`);
    }

    // 4b: Send Auto-Reply to Student with CORRECT LOCATION
    try {
      console.log(`📤 Sending auto-reply to student: ${email}`);
      
      const studentMailOptions = {
        from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Thank you for your admission enquiry - AIMS Pune`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { color: #0a2a66; border-bottom: 3px solid #0a2a66; padding-bottom: 10px; }
              .content { padding: 20px; background: #f5f5f5; border-radius: 5px; margin: 20px 0; }
              .highlight { background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
              .location { color: #0a2a66; font-weight: bold; }
              .campus-info { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Thank You for Your Admission Enquiry</h2>
              </div>
              
              <p>Dear ${name},</p>
              
              <p>Thank you for submitting your admission enquiry for <strong>${course}</strong> program at <strong>Aditya Institute of Management Studies (AIMS)</strong>, <span class="location">Pune, Maharashtra, India</span>.</p>
              
              <div class="content">
                <div class="highlight">
                  <p>✅ We have received your details and our admission counselor will contact you within <strong>24-48 hours</strong>.</p>
                  <p>📧 Your Application ID: <strong>${admission._id}</strong></p>
                  <p>📋 Reference: <strong>${admission.referenceNumber || 'N/A'}</strong></p>
                </div>
              </div>
              
              <h3>📌 Next Steps:</h3>
              <ul>
                <li>Our admission counselor will contact you shortly</li>
                <li>You'll receive detailed information about the program</li>
                <li>We'll guide you through the admission process</li>
              </ul>
              
              <div class="campus-info">
                <h3>📍 Campus Location:</h3>
                <p><strong>Aditya Institute of Management Studies (AIMS)</strong><br/>
                Pune, Maharashtra, India</p>
              </div>
              
              <p>Best regards,<br/>
              <strong>Admission Office</strong><br/>
              AIMS Pune</p>
              
              <hr/>
              <div class="footer">
                <p>This is an automated confirmation. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} Aditya Institute of Management Studies, Pune</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Thank You for Your Admission Enquiry
=====================================

Dear ${name},

Thank you for submitting your admission enquiry for ${course} program at Aditya Institute of Management Studies (AIMS), Pune, Maharashtra, India.

✅ We have received your details and our admission counselor will contact you within 24-48 hours.
📧 Your Application ID: ${admission._id}
📋 Reference: ${admission.referenceNumber || 'N/A'}

📌 Next Steps:
- Our admission counselor will contact you shortly
- You'll receive detailed information about the program
- We'll guide you through the admission process

📍 Campus Location:
Aditya Institute of Management Studies (AIMS)
Pune, Maharashtra, India

Best regards,
Admission Office
AIMS Pune

---
This is an automated confirmation. Please do not reply to this email.
© ${new Date().getFullYear()} Aditya Institute of Management Studies, Pune
        `
      };

      await sendEmail(studentMailOptions);
      studentEmailSent = true;
      console.log(`✅ Auto-reply sent successfully to ${email}`);
    } catch (studentError) {
      console.error('❌ Student email failed:', studentError.message);
      emailErrors.push(`Student email: ${studentError.message}`);
    }

    // ========== PREPARE RESPONSE WITH CORRECT LOCATION ==========
    console.log('📤 Step 5: Sending response to user');
    
    let responseMessage = '✅ Admission form submitted successfully!';
    let statusCode = 201;

    if (adminEmailSent && studentEmailSent) {
      responseMessage = `✅ Thank you for submitting your admission enquiry for ${course} program at Aditya Institute of Management Studies (AIMS), Pune, Maharashtra, India. Our team will contact you soon.`;
    } else if (adminEmailSent && !studentEmailSent) {
      responseMessage = '⚠️ Form submitted but auto-reply email could not be sent. Admin has been notified.';
      statusCode = 207;
    } else if (!adminEmailSent && studentEmailSent) {
      responseMessage = '⚠️ Form submitted but admin notification failed. Our team will still contact you.';
      statusCode = 207;
    } else {
      responseMessage = '⚠️ Form submitted but email notifications failed. Our team will contact you directly.';
      statusCode = 207;
    }

    res.status(statusCode).json({
      success: true,
      message: responseMessage,
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course,
        email: admission.emailAddress,
        mobile: admission.mobileNumber,
        reference: admission.referenceNumber || 'N/A',
        submittedAt: admission.submittedAt,
        location: 'Pune, Maharashtra, India'
      },
      emailStatus: {
        adminNotified: adminEmailSent,
        autoReplySent: studentEmailSent,
        errors: emailErrors.length > 0 ? emailErrors : null
      }
    });
    
    console.log('✅ Step 6: Process completed successfully');

  } catch (error) {
    console.error('❌ Submission error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: errors[0] || 'Validation error'
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an admission enquiry.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.'
    });
  }
});

// ====================== TEST EMAIL ENDPOINT ======================
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('📧 Testing email...');
    
    const result = await sendEmail({
      from: `"AIMS Test" <${process.env.EMAIL_USER}>`,
      to: 'adityainstitute.admission@gmail.com',
      subject: '✅ Test Email from AIMS Admission System',
      html: `
        <h2>✅ Email Configuration Test</h2>
        <p>This is a test email from the AIMS Admission System.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>If you receive this, email is working correctly!</p>
        <p><strong>Location:</strong> Pune, Maharashtra, India</p>
      `
    });
    
    res.json({
      success: true,
      message: '✅ Test email sent successfully!',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed: ' + error.message
    });
  }
});

// ====================== ROUTES ======================
const authRoutes = require('./routes/auth');
const galleryRoutes = require('./routes/gallery');
const announcementsRoutes = require('./routes/announcements');
const noticesRoutes = require('./routes/notices');
const careersRoutes = require('./routes/careers');
const blogsRoutes = require('./routes/blogs');
const adminRoutes = require('./routes/admin');
const admissionsRoutes = require('./routes/admissions');

app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/careers', careersRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admissions', admissionsRoutes);

// ====================== HEALTH CHECK ======================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "🚀 AIMS Backend is running",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: "🚀 AIMS Backend is running",
    status: "online",
    uptime: process.uptime()
  });
});

// ====================== 404 HANDLER ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

// ====================== ERROR HANDLER ======================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5018;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📧 Admin Email: adityainstitute.admission@gmail.com`);
  console.log(`📧 Sender Email: ${process.env.EMAIL_USER}`);
  console.log(`✅ Email configured: ${!!transporter}`);
  console.log('='.repeat(60));
});