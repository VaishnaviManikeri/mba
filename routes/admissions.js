const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Admission = require('../models/Admission');

router.post('/submit', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      course,
      qualification,
      message
    } = req.body;

    // Validation
    if (!name || !email || !phone || !course || !qualification) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Save in MongoDB
    const newAdmission = new Admission({
      name,
      email,
      phone,
      course,
      qualification,
      message
    });

    await newAdmission.save();

    // Mail Config
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send Mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'vaishnavimanikeri@gmail.com',
      subject: 'New Admission Form Submitted',
      html: `
        <h2>New Admission Enquiry</h2>

        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Course:</b> ${course}</p>
        <p><b>Qualification:</b> ${qualification}</p>
        <p><b>Message:</b> ${message || 'N/A'}</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
