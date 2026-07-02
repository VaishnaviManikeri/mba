const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  emailAddress: {
    type: String,
    required: [true, 'Email address is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  course: {
    type: String,
    required: [true, 'Course is required'],
    enum: ['MBA', 'MCA']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'enrolled'],
    default: 'pending'
  }
});

// Add index for faster queries
admissionSchema.index({ emailAddress: 1 });
admissionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Admission', admissionSchema);
