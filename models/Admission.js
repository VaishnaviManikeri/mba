const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    course: {
      type: String,
      required: true
    },

    qualification: {
      type: String,
      required: true
    },

    message: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', admissionSchema);
