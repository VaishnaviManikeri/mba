const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');

// GET - Fetch all admissions with pagination
router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const course = req.query.course;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (course) filter.course = course;
    
    const [admissions, total] = await Promise.all([
      Admission.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Admission.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      count: admissions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: admissions
    });
  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching admissions',
      error: error.message 
    });
  }
});

// GET - Single admission by ID
router.get('/:id', async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).lean();
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    res.json({
      success: true,
      data: admission
    });
  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching admission',
      error: error.message 
    });
  }
});

// GET - Search admissions by name, email, or mobile
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const searchRegex = new RegExp(query, 'i');
    
    const admissions = await Admission.find({
      $or: [
        { name: searchRegex },
        { emailAddress: searchRegex },
        { mobileNumber: searchRegex }
      ]
    }).sort({ submittedAt: -1 }).lean();
    
    res.json({
      success: true,
      count: admissions.length,
      data: admissions
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching admissions',
      error: error.message 
    });
  }
});

// GET - Get statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, pending, contacted, enrolled, mbaCount, mcaCount, todayCount] = await Promise.all([
      Admission.countDocuments(),
      Admission.countDocuments({ status: 'pending' }),
      Admission.countDocuments({ status: 'contacted' }),
      Admission.countDocuments({ status: 'enrolled' }),
      Admission.countDocuments({ course: 'MBA' }),
      Admission.countDocuments({ course: 'MCA' }),
      Admission.countDocuments({
        submittedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        pending,
        contacted,
        enrolled,
        byCourse: { MBA: mbaCount, MCA: mcaCount },
        today: todayCount
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics',
      error: error.message 
    });
  }
});

// PUT - Update admission status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'contacted', 'enrolled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, contacted, or enrolled'
      });
    }
    
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: admission
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating status',
      error: error.message 
    });
  }
});

// PUT - Update admission details (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { name, mobileNumber, emailAddress, course, message } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (mobileNumber) updateData.mobileNumber = mobileNumber;
    if (emailAddress) updateData.emailAddress = emailAddress.toLowerCase();
    if (course) updateData.course = course;
    if (message !== undefined) updateData.message = message.trim();
    
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Admission updated successfully',
      data: admission
    });
  } catch (error) {
    console.error('❌ Update error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: errors[0] || 'Validation error'
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Error updating admission',
      error: error.message 
    });
  }
});

// DELETE - Delete admission
router.delete('/:id', async (req, res) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admission not found' 
      });
    }
    res.json({
      success: true,
      message: 'Admission deleted successfully',
      data: {
        id: admission._id,
        name: admission.name
      }
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting admission',
      error: error.message 
    });
  }
});

// POST - Bulk delete admissions
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of admission IDs to delete'
      });
    }
    
    const result = await Admission.deleteMany({ _id: { $in: ids } });
    
    res.json({
      success: true,
      message: `${result.deletedCount} admissions deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting admissions',
      error: error.message 
    });
  }
});

// GET - Export admissions as CSV (admin only)
router.get('/export/csv', async (req, res) => {
  try {
    const admissions = await Admission.find()
      .sort({ submittedAt: -1 })
      .lean();
    
    if (admissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No admissions to export'
      });
    }
    
    // Create CSV header
    const headers = ['Name', 'Mobile', 'Email', 'Course', 'Status', 'Submitted At', 'Message'];
    const csvRows = [headers.join(',')];
    
    // Add data rows
    admissions.forEach(admission => {
      const row = [
        `"${admission.name}"`,
        `"${admission.mobileNumber}"`,
        `"${admission.emailAddress}"`,
        `"${admission.course}"`,
        `"${admission.status}"`,
        `"${new Date(admission.submittedAt).toLocaleString()}"`,
        `"${admission.message || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=admissions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting admissions',
      error: error.message 
    });
  }
});

module.exports = router;