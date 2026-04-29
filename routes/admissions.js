const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Admission = require('../models/Admission');

router.post('/submit', async (req, res) => {
  try {
    console.log('BODY:', req.body);

    const {
      name,
      email,
      phone,
      course,
      qualification,
      message
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !course || !qualification) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are mandatory'
      });
    }

    // Save to MongoDB
    const savedData = await Admission.create({
      name,
      email,
      phone,
      course,
      qualification,
      message: message || ''
    });

    console.log('Saved Admission ID:', savedData._id);

    // Send email if credentials exist
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: 'vaishnavimanikeri@gmail.com',
          subject: 'New Admission Form Submitted',
          html: `
            <h2>New Admission Enquiry</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Course:</strong> ${course}</p>
            <p><strong>Qualification:</strong> ${qualification}</p>
            <p><strong>Message:</strong> ${message || 'N/A'}</p>
          `
        });

        console.log('Email sent successfully');
      } catch (mailError) {
        console.error('Mail Error:', mailError.message);
      }
    } else {
      console.log('EMAIL_USER or EMAIL_PASS missing in environment variables');
    }

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('MAIN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;
