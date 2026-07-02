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
  }
}, {
  timestamps: true
});

// Indexes for faster queries
admissionSchema.index({ emailAddress: 1 });
admissionSchema.index({ mobileNumber: 1 });
admissionSchema.index({ submittedAt: -1 });
admissionSchema.index({ course: 1 });
admissionSchema.index({ status: 1 });

// Virtual for reference number
admissionSchema.virtual('referenceNumber').get(function() {
  const year = this.submittedAt ? new Date(this.submittedAt).getFullYear() : new Date().getFullYear();
  const id = this._id.toString().slice(-6).toUpperCase();
  return `AIMS-${year}-${id}`;
});

admissionSchema.set('toJSON', { virtuals: true });
admissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Admission', admissionSchema);