const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

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
app.use(express.json({ limit: '10mb' })); // Increased limit
app.use(express.urlencoded({ extended: true }));

// Database connection with optimized settings
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Connection pool
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

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
app.use('/api/admissions', require('./routes/admissions')); // Add this line

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// ====================== PORT ======================
const PORT = process.env.PORT || 5018;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
