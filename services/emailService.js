const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// verify transporter once on server start
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter error:', error);
    } else {
        console.log('✅ Email server is ready');
    }
});

const sendAdminNotification = async (admissionData) => {
    try {
        const mailOptions = {
            from: `"AIMS Admission System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `New Admission Application - ${admissionData.name}`,
            html: `
                <h2>New Admission Form Submitted</h2>
                <p><b>Name:</b> ${admissionData.name}</p>
                <p><b>Email:</b> ${admissionData.email}</p>
                <p><b>Phone:</b> ${admissionData.phone}</p>
                <p><b>Course:</b> ${admissionData.course}</p>
                <p><b>Qualification:</b> ${admissionData.qualification}</p>
                <p><b>Message:</b> ${admissionData.message || 'N/A'}</p>
                <p><b>Submitted:</b> ${new Date(admissionData.createdAt).toLocaleString()}</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Admin mail sent:', info.response);
        return true;
    } catch (error) {
        console.error('❌ Admin email failed:', error);
        return false;
    }
};

const sendStudentThankYou = async (admissionData) => {
    try {
        const mailOptions = {
            from: `"AIMS Bhubaneswar" <${process.env.EMAIL_USER}>`,
            to: admissionData.email,
            subject: 'Thank You for Your Application',
            html: `
                <h2>Thank You ${admissionData.name}</h2>
                <p>We received your admission form successfully.</p>
                <p><b>Course:</b> ${admissionData.course}</p>
                <p>Our team will contact you within 24-48 hours.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Student mail sent:', info.response);
        return true;
    } catch (error) {
        console.error('❌ Student email failed:', error);
        return false;
    }
};

module.exports = {
    sendAdminNotification,
    sendStudentThankYou
};
