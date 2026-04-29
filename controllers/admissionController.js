const Admission = require('../models/Admission');
const { sendAdminNotification, sendStudentThankYou } = require('../services/emailService');

// Submit new admission application
exports.submitApplication = async (req, res) => {
    try {
        const { name, email, phone, course, qualification, message } = req.body;
        
        // Validate required fields
        if (!name || !email || !phone || !course || !qualification) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be filled' 
            });
        }
        
        // Check if email already exists
        const existingApplication = await Admission.findOne({ email });
        if (existingApplication) {
            return res.status(400).json({ 
                success: false, 
                message: 'An application with this email already exists' 
            });
        }
        
        // Create new admission application
        const admission = new Admission({
            name,
            email,
            phone,
            course,
            qualification,
            message: message || '',
            status: 'pending'
        });
        
        await admission.save();
        
        // Send email notifications (don't wait for response)
        Promise.all([
            sendAdminNotification(admission),
            sendStudentThankYou(admission)
        ]).catch(err => console.error('Email sending error:', err));
        
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully! Our team will contact you soon.',
            data: {
                id: admission._id,
                name: admission.name,
                email: admission.email,
                course: admission.course,
                status: admission.status
            }
        });
        
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again later.' 
        });
    }
};

// Get all applications (Admin only)
exports.getAllApplications = async (req, res) => {
    try {
        const applications = await Admission.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Get single application by ID (Admin only)
exports.getApplicationById = async (req, res) => {
    try {
        const application = await Admission.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }
        
        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Update application status (Admin only)
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'contacted', 'enrolled', 'rejected'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status value' 
            });
        }
        
        const application = await Admission.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        
        if (!application) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Application status updated successfully',
            data: application
        });
        
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Delete application (Admin only)
exports.deleteApplication = async (req, res) => {
    try {
        const application = await Admission.findByIdAndDelete(req.params.id);
        
        if (!application) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

// Get statistics (Admin only)
exports.getStatistics = async (req, res) => {
    try {
        const total = await Admission.countDocuments();
        const pending = await Admission.countDocuments({ status: 'pending' });
        const contacted = await Admission.countDocuments({ status: 'contacted' });
        const enrolled = await Admission.countDocuments({ status: 'enrolled' });
        const rejected = await Admission.countDocuments({ status: 'rejected' });
        
        // Get last 7 days applications
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentApplications = await Admission.find({
            createdAt: { $gte: sevenDaysAgo }
        }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: {
                total,
                pending,
                contacted,
                enrolled,
                rejected,
                recentCount: recentApplications.length,
                recentApplications
            }
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};
