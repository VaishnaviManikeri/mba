const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send email to admin
const sendAdminNotification = async (admissionData) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'vaishnavimanikeri@gmail.com';
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `New Admission Application - ${admissionData.name}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
                    .field { margin-bottom: 15px; }
                    .label { font-weight: bold; color: #0a2a66; margin-bottom: 5px; }
                    .value { color: #374151; margin-top: 5px; }
                    .status { display: inline-block; background: #fef3c7; color: #92400e; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
                    button { background: #0a2a66; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🎓 New Admission Application</h2>
                        <p>AIMS Bhubaneswar</p>
                    </div>
                    <div class="content">
                        <p style="font-size: 16px;">Dear Admin,</p>
                        <p>A new student has submitted an admission application. Please review the details below:</p>
                        
                        <div class="field">
                            <div class="label">📋 Application ID:</div>
                            <div class="value">${admissionData._id}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">👤 Full Name:</div>
                            <div class="value">${admissionData.name}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">📧 Email Address:</div>
                            <div class="value">${admissionData.email}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">📞 Phone Number:</div>
                            <div class="value">${admissionData.phone}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">🎯 Interested Course:</div>
                            <div class="value">${admissionData.course}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">🎓 Highest Qualification:</div>
                            <div class="value">${admissionData.qualification}</div>
                        </div>
                        
                        ${admissionData.message ? `
                        <div class="field">
                            <div class="label">💬 Message:</div>
                            <div class="value">${admissionData.message}</div>
                        </div>
                        ` : ''}
                        
                        <div class="field">
                            <div class="label">📅 Submitted On:</div>
                            <div class="value">${new Date(admissionData.createdAt).toLocaleString()}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">📊 Status:</div>
                            <div class="value"><span class="status">${admissionData.status.toUpperCase()}</span></div>
                        </div>
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                        
                        <p><strong>Next Steps:</strong></p>
                        <ul>
                            <li>Review the application details</li>
                            <li>Contact the student within 24-48 hours</li>
                            <li>Schedule a counseling session if needed</li>
                            <li>Update the application status in the admin panel</li>
                        </ul>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="${process.env.ADMIN_PANEL_URL || 'https://your-admin-panel.com'}" style="background: #0a2a66; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Admin Panel</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from AIMS Bhubaneswar Admission System.</p>
                        <p>© ${new Date().getFullYear()} AIMS Bhubaneswar. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Admin notification email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending admin email:', error);
        return false;
    }
};

// Send thank you email to student
const sendStudentThankYou = async (admissionData) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admissionData.email,
        subject: '🎓 Thank You for Applying to AIMS Bhubaneswar!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0a2a66, #1e3a8a); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
                    .thankyou { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                    .details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                    .next-steps { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0a2a66; }
                    .button { background: #0a2a66; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
                    .contact-info { margin-top: 20px; padding: 15px; background: white; border-radius: 8px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎓 AIMS Bhubaneswar</h1>
                        <p>Aditya Institute of Management Studies</p>
                    </div>
                    <div class="content">
                        <div class="thankyou">
                            Thank You, ${admissionData.name}! 🙏
                        </div>
                        
                        <p>Dear ${admissionData.name},</p>
                        
                        <p>We are delighted to inform you that we have successfully received your admission application for the <strong>${admissionData.course}</strong> program at AIMS Bhubaneswar.</p>
                        
                        <div class="details">
                            <h3 style="color: #0a2a66; margin-top: 0;">Application Summary:</h3>
                            <p><strong>Application ID:</strong> ${admissionData._id}</p>
                            <p><strong>Course Applied:</strong> ${admissionData.course}</p>
                            <p><strong>Qualification:</strong> ${admissionData.qualification}</p>
                            <p><strong>Application Date:</strong> ${new Date(admissionData.createdAt).toLocaleString()}</p>
                        </div>
                        
                        <div class="next-steps">
                            <h3 style="color: #0a2a66; margin-top: 0;">📌 Next Steps:</h3>
                            <ol style="margin: 10px 0; padding-left: 20px;">
                                <li>Our admission counselor will contact you within 24-48 hours</li>
                                <li>We'll verify your documents and eligibility</li>
                                <li>You'll receive further instructions for the admission process</li>
                                <li>Keep your phone and email accessible for updates</li>
                            </ol>
                        </div>
                        
                        <div class="contact-info">
                            <h4 style="color: #0a2a66; margin: 0 0 10px 0;">📞 Need Immediate Assistance?</h4>
                            <p>Contact our Admission Helpline:</p>
                            <p><strong>Phone:</strong> +91-XXXXXXXXXX</p>
                            <p><strong>Email:</strong> admissions@aimsbbsr.edu.in</p>
                            <p><strong>Working Hours:</strong> Monday to Saturday, 10:00 AM - 6:00 PM</p>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.COLLEGE_WEBSITE || 'https://adityainstitutemanagement.com'}" class="button">Visit Our Website</a>
                        </div>
                        
                        <hr style="margin: 30px 0 20px; border: none; border-top: 1px solid #e5e7eb;">
                        
                        <p><strong>Important Information:</strong></p>
                        <ul>
                            <li>Please keep your application ID for future reference</li>
                            <li>You'll receive updates via email and SMS</li>
                            <li>Check your spam folder if you don't receive our emails</li>
                            <li>All communications will come from official AIMS email addresses</li>
                        </ul>
                        
                        <p style="margin-top: 30px;">Best regards,</p>
                        <p><strong>Admissions Office</strong><br>
                        AIMS Bhubaneswar<br>
                        <em>Shaping Future Leaders</em></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Aditya Institute of Management Studies. All rights reserved.</p>
                        <p>This is an automated confirmation email. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Thank you email sent to student successfully');
        return true;
    } catch (error) {
        console.error('Error sending student email:', error);
        return false;
    }
};

module.exports = {
    sendAdminNotification,
    sendStudentThankYou
};
