const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer'); // Add this

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
app.use(express.json());

// ====================== EMAIL CONFIGURATION ======================
// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Your Gmail app password
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

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
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/blogs', (req, res, next) => {
    console.log(`${req.method} ${req.url} - Blog route accessed`);
    next();
});
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/admin', require('./routes/admin'));

const PORT = 5018;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
