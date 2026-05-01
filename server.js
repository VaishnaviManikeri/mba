const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://adityainstitutemanagement.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection with optimized settings
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// ====================== OPTIMIZED EMAIL CONFIGURATION ======================
// Create email transporter with better timeout settings
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Optimized connection settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    // Pool connections for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  });
};

let transporter = createTransporter();

// Auto-reply email template for user
const getAutoReplyEmail = (userName, course) => {
  return {
    subject: `Thank you for your enquiry - ${course} Program`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Thank You for Your Interest!</h2>
        <p>Dear ${userName},</p>
        <p>Thank you for your enquiry about the ${course} program. We have received your admission form and one of our counselors will get back to you within 24 hours.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <ul>
            <li>Our admission counselor will contact you shortly</li>
            <li>You'll receive detailed information about the program</li>
            <li>We'll guide you through the admission process</li>
          </ul>
        </div>
        
        <p>In the meantime, if you have any urgent questions, feel free to call us at your convenience.</p>
        
        <p>Best regards,<br>
        <strong>Admissions Team</strong><br>
        Aditya Institute of Management</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated response. Please do not reply to this email.</p>
      </div>
    `
  };
};

// Admin notification email template
const getAdminNotificationEmail = (formData) => {
  return {
    subject: `New Admission Enquiry - ${formData.course}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">New Admission Form Submission</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="background-color: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd;">Field</th>
            <th style="background-color: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd;">Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formData.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Mobile Number</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formData.mobile}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formData.email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Selected Course</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formData.course}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message/Enquiry</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${formData.message || 'No message provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Submission Time</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px;">Please follow up with this candidate at the earliest.</p>
      </div>
    `
  };
};

// Function to send email with retry logic
const sendEmailWithRetry = async (mailOptions, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      // Recreate transporter if needed
      if (!transporter || i > 0) {
        transporter = createTransporter();
      }
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.log(`Email attempt ${i + 1} failed:`, error.message);
      if (i === retries) throw error;
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// ====================== ADMISSION FORM API ======================
// Optimized API endpoint with background email sending
app.post('/api/submit-admission', async (req, res) => {
  const { name, mobile, email, course, message } = req.body;

  // Quick validation
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

  // Send immediate success response to user
  res.status(200).json({
    success: true,
    message: 'Form submitted successfully. We will contact you soon.'
  });

  // Send emails in background (don't block the response)
  sendEmailsInBackground({ name, mobile, email, course, message });
});

// Background function to send emails
const sendEmailsInBackground = async (formData) => {
  try {
    const { name, email, course } = formData;
    
    // Send email to admin
    await sendEmailWithRetry({
      from: `"Admission Form" <${process.env.EMAIL_USER}>`,
      to: 'vaishnavimanikeri@gmail.com',
      subject: getAdminNotificationEmail(formData).subject,
      html: getAdminNotificationEmail(formData).html
    });

    // Send auto-reply to user
    await sendEmailWithRetry({
      from: `"Admissions Office" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: getAutoReplyEmail(name, course).subject,
      html: getAutoReplyEmail(name, course).html
    });

    console.log('✅ Emails sent successfully for:', email);
  } catch (error) {
    console.error('❌ Background email error:', error.message);
    // Log to file or database for retry later
    logFailedEmail(formData, error);
  }
};

// Simple logging for failed emails (optional)
const logFailedEmail = (formData, error) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    formData,
    error: error.message,
    status: 'failed'
  };
  console.log('Failed email log:', logEntry);
  // You can save this to database or file for retry later
};

// ====================== STATUS API ======================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Backend is running successfully",
    server: "Hostinger VPS",
    port: 5018,
    status: "online"
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: "Backend is running successfully",
    server: "Hostinger VPS",
    port: 5018,
    status: "online"
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// ====================== PORT ======================
const PORT = process.env.PORT || 5018;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
