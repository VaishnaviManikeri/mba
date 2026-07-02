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
// Create email transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials missing in environment variables');
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
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
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
      console.error('❌ Email transporter verification failed:', error.message);
      transporter = null;
      return false;
    }
  }
  return false;
};

// Initial verification
verifyTransporter();

// Email sending function with retry logic
const sendEmailWithRetry = async (mailOptions, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Ensure transporter is ready
      if (!transporter) {
        transporter = createTransporter();
        if (!transporter) {
          throw new Error('Transporter not available');
        }
      }
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully (attempt ${i + 1})`);
      return result;
    } catch (error) {
      console.error(`❌ Email attempt ${i + 1} failed:`, error.message);
      
      // Recreate transporter on failure
      transporter = createTransporter();
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// ====================== ADMISSION FORM API ======================
// POST - Submit admission form (main endpoint)
app.post('/api/submit-admission', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { name, mobile, email, course, message } = req.body;
    console.log('📝 Received admission form submission:', { name, mobile, email, course });

    // Validate required fields
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
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors 
      });
    }

    // Import Admission model
    const Admission = require('./models/Admission');
    
    // Check for duplicate email
    const existingSubmission = await Admission.findOne(
      { emailAddress: email.toLowerCase() }
    );
    
    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an admission enquiry. Our team will contact you soon.'
      });
    }

    // Save to database
    const admission = new Admission({
      name: name.trim(),
      mobileNumber: mobile,
      emailAddress: email.toLowerCase(),
      course,
      message: message || '',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    await admission.save();
    console.log(`✅ Admission saved. ID: ${admission._id}`);

    // Send emails in background
    const adminEmail = 'adityainstitute.admission@gmail.com';
    let emailResults = {
      admin: false,
      student: false,
      errors: []
    };

    // Send admin email
    try {
      const adminMailOptions = {
        from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        replyTo: email,
        subject: `🔔 NEW ADMISSION ENQUIRY - ${course} - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #0a2a66;">
            <h2 style="color: #0a2a66; background: #f0f4ff; padding: 10px;">📋 NEW ADMISSION ENQUIRY</h2>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>👤 Student Name:</strong> ${name}</p>
              <p><strong>📱 Mobile Number:</strong> ${mobile}</p>
              <p><strong>✉️ Email:</strong> ${email}</p>
              <p><strong>📚 Course:</strong> ${course}</p>
              <p><strong>💬 Message:</strong> ${message || 'No message provided'}</p>
              <p><strong>🕐 Submitted At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p><strong>🆔 Application ID:</strong> ${admission._id}</p>
              <p><strong>📋 Reference:</strong> AIMS-${new Date().getFullYear()}-${admission._id.toString().slice(-6).toUpperCase()}</p>
            </div>
            <p style="color: #d32f2f;"><strong>⚠️ ACTION REQUIRED:</strong> Please contact the student within 24 hours.</p>
            <hr/>
            <p style="font-size: 12px; color: #666;">This is an automated notification from AIMS Admission System.</p>
          </div>
        `,
        text: `NEW ADMISSION ENQUIRY\n\nStudent Name: ${name}\nMobile Number: ${mobile}\nEmail: ${email}\nCourse: ${course}\nMessage: ${message || 'No message provided'}\nSubmitted At: ${new Date().toLocaleString()}\nApplication ID: ${admission._id}\n\nACTION REQUIRED: Please contact the student within 24 hours.`
      };

      await sendEmailWithRetry(adminMailOptions);
      emailResults.admin = true;
      console.log(`✅ Admin email sent to ${adminEmail}`);
    } catch (adminError) {
      console.error('❌ Failed to send admin email:', adminError.message);
      emailResults.errors.push(`Admin email failed: ${adminError.message}`);
    }

    // Send student auto-reply
    try {
      const studentMailOptions = {
        from: `"AIMS Admission" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Thank you for your admission enquiry - AIMS Bhubaneswar`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #0a2a66;">Thank You for Your Admission Enquiry</h2>
            <p>Dear ${name},</p>
            <p>Thank you for submitting your admission enquiry for <strong>${course}</strong> program at <strong>Aditya Institute of Management Studies (AIMS)</strong>, Bhubaneswar.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p>✅ We have received your details and our admission counselor will contact you within <strong>24-48 hours</strong>.</p>
              <p>📧 Your Application ID: <strong>${admission._id}</strong></p>
              <p>📋 Reference: <strong>AIMS-${new Date().getFullYear()}-${admission._id.toString().slice(-6).toUpperCase()}</strong></p>
            </div>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Our admission counselor will contact you shortly</li>
              <li>You'll receive detailed information about the program</li>
              <li>We'll guide you through the admission process</li>
            </ul>
            <p>Best regards,<br/>
            <strong>Admission Office</strong><br/>
            AIMS Bhubaneswar</p>
            <hr/>
            <p style="font-size: 12px; color: #999;">This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        `,
        text: `Thank You for Your Admission Enquiry\n\nDear ${name},\n\nThank you for submitting your admission enquiry for ${course} program at Aditya Institute of Management Studies (AIMS), Bhubaneswar.\n\nWe have received your details and our admission counselor will contact you within 24-48 hours.\n\nYour Application ID: ${admission._id}\nReference: AIMS-${new Date().getFullYear()}-${admission._id.toString().slice(-6).toUpperCase()}\n\nBest regards,\nAdmission Office\nAIMS Bhubaneswar`
      };

      await sendEmailWithRetry(studentMailOptions);
      emailResults.student = true;
      console.log(`✅ Auto-reply sent to student: ${email}`);
    } catch (studentError) {
      console.error('❌ Failed to send student email:', studentError.message);
      emailResults.errors.push(`Student email failed: ${studentError.message}`);
    }

    const responseTime = Date.now() - startTime;

    // Prepare response based on email sending status - CHANGED VARIABLE NAME TO responseMessage
    let responseMessage = 'Admission form submitted successfully!';
    let statusCode = 201;

    if (emailResults.admin && emailResults.student) {
      responseMessage = '✅ Admission form submitted successfully! Admin has been notified and you will receive a confirmation email shortly.';
    } else if (emailResults.admin && !emailResults.student) {
      responseMessage = '⚠️ Form submitted but auto-reply email could not be sent. Admin has been notified.';
      statusCode = 207;
    } else if (!emailResults.admin && emailResults.student) {
      responseMessage = '⚠️ Form submitted but admin notification failed. Our team will still contact you.';
      statusCode = 207;
    } else {
      responseMessage = '⚠️ Form submitted but email notifications failed. Our team will contact you directly.';
      statusCode = 207;
    }

    res.status(statusCode).json({
      success: true,
      message: responseMessage, // USING responseMessage INSTEAD OF message
      data: {
        id: admission._id,
        name: admission.name,
        course: admission.course,
        email: admission.emailAddress,
        mobile: admission.mobileNumber,
        submittedAt: admission.submittedAt,
        reference: `AIMS-${new Date().getFullYear()}-${admission._id.toString().slice(-6).toUpperCase()}`
      },
      emailStatus: {
        adminNotified: emailResults.admin,
        autoReplySent: emailResults.student,
        errors: emailResults.errors.length > 0 ? emailResults.errors : null
      },
      responseTime: `${responseTime}ms`
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
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an admission enquiry. Our team will contact you soon.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ====================== TEST EMAIL ENDPOINT ======================
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('📧 Testing email configuration...');
    
    if (!transporter) {
      transporter = createTransporter();
      if (!transporter) {
        return res.status(400).json({
          success: false,
          message: 'Email transporter not configured. Check EMAIL_USER and EMAIL_PASS in .env'
        });
      }
    }
    
    const result = await sendEmailWithRetry({
      from: `"AIMS Test" <${process.env.EMAIL_USER}>`,
      to: 'adityainstitute.admission@gmail.com',
      subject: '✅ Test Email from AIMS Admission System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0a2a66;">✅ Email Configuration Test</h2>
          <p>This is a test email from the AIMS Admission System.</p>
          <p>If you receive this, email is working correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Automated test from AIMS Backend</p>
        </div>
      `
    });
    
    res.json({
      success: true,
      message: '✅ Test email sent successfully!',
      messageId: result.messageId,
      details: {
        from: process.env.EMAIL_USER,
        to: 'adityainstitute.admission@gmail.com',
        time: new Date().toISOString()
      }
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

// ====================== EMAIL STATUS ENDPOINT ======================
app.get('/api/email-status', (req, res) => {
  const isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const transporterReady = !!transporter;
  
  // Attempt to initialize if not ready
  if (isConfigured && !transporterReady) {
    transporter = createTransporter();
  }
  
  res.json({
    success: true,
    emailConfigured: isConfigured,
    transporterReady: !!transporter,
    emailUser: process.env.EMAIL_USER || null,
    adminEmail: 'adityainstitute.admission@gmail.com',
    message: isConfigured && transporter ? '✅ Email is configured and ready' : '⚠️ Email configuration issues detected',
    tips: [
      'Make sure EMAIL_PASS is using Gmail App Password (not regular password)',
      'Check that 2-Factor Authentication is enabled on Gmail',
      'Verify the sender email has permission to send emails',
      'Check Gmail "Less secure app access" settings'
    ]
  });
});

// ====================== ROUTES ======================

// Import routes
const authRoutes = require('./routes/auth');
const galleryRoutes = require('./routes/gallery');
const announcementsRoutes = require('./routes/announcements');
const noticesRoutes = require('./routes/notices');
const careersRoutes = require('./routes/careers');
const blogsRoutes = require('./routes/blogs');
const adminRoutes = require('./routes/admin');
const admissionsRoutes = require('./routes/admissions');

// Mount routes
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
    message: "🚀 AIMS Backend is running successfully",
    server: "Hostinger VPS",
    port: process.env.PORT || 5018,
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/",
      status: "/api/status",
      submitAdmission: "/api/submit-admission",
      testEmail: "/api/test-email",
      emailStatus: "/api/email-status",
      admissions: "/api/admissions",
      auth: "/api/auth",
      gallery: "/api/gallery",
      announcements: "/api/announcements",
      notices: "/api/notices",
      careers: "/api/careers",
      blogs: "/api/blogs",
      admin: "/api/admin"
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: "🚀 AIMS Backend is running successfully",
    server: "Hostinger VPS",
    port: process.env.PORT || 5018,
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ====================== 404 HANDLER ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
    availableEndpoints: [
      "GET /",
      "GET /api/status",
      "POST /api/submit-admission",
      "GET /api/test-email",
      "GET /api/email-status",
      "GET /api/admissions/all",
      "GET /api/admissions/:id",
      "GET /api/admissions/stats/summary",
      "PUT /api/admissions/:id/status",
      "DELETE /api/admissions/:id"
    ]
  });
});

// ====================== ERROR HANDLING MIDDLEWARE ======================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: errors[0] || 'Validation error'
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5018;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📧 Email configured: ${!!transporter}`);
  console.log(`📧 Admin email: adityainstitute.admission@gmail.com`);
  console.log(`📧 Sender email: ${process.env.EMAIL_USER || 'Not set'}`);
  console.log(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});