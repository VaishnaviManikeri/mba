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
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
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
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'enrolled'],
    default: 'pending'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create compound index to prevent duplicate submissions
admissionSchema.index({ emailAddress: 1, mobileNumber: 1 }, { unique: false });

// Add index for faster queries
admissionSchema.index({ emailAddress: 1 });
admissionSchema.index({ mobileNumber: 1 });
admissionSchema.index({ submittedAt: -1 });
admissionSchema.index({ course: 1 });
admissionSchema.index({ status: 1 });

// Virtual field for formatted date
admissionSchema.virtual('formattedDate').get(function() {
  return this.submittedAt ? new Date(this.submittedAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;
});

// Virtual field for application reference number
admissionSchema.virtual('applicationRef').get(function() {
  if (!this._id) return null;
  const year = this.submittedAt ? new Date(this.submittedAt).getFullYear() : new Date().getFullYear();
  const id = this._id.toString().slice(-6).toUpperCase();
  return `AIMS-${year}-${id}`;
});

// Ensure virtuals are included in JSON output
admissionSchema.set('toJSON', { virtuals: true });
admissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Admission', admissionSchema);