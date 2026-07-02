const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');

// GET - Fetch all admissions with pagination
router.get('/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, course } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (course) filter.course = course;
    
    const [admissions, total] = await Promise.all([
      Admission.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).lean(),
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
    res.status(500).json({ success: false, message: 'Error fetching admissions' });
  }
});

// GET - Single admission by ID
router.get('/:id', async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id).lean();
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    res.json({ success: true, data: admission });
  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching admission' });
  }
});

// GET - Statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, pending, contacted, enrolled, mbaCount, mcaCount] = await Promise.all([
      Admission.countDocuments(),
      Admission.countDocuments({ status: 'pending' }),
      Admission.countDocuments({ status: 'contacted' }),
      Admission.countDocuments({ status: 'enrolled' }),
      Admission.countDocuments({ course: 'MBA' }),
      Admission.countDocuments({ course: 'MCA' })
    ]);
    
    res.json({
      success: true,
      data: { total, pending, contacted, enrolled, byCourse: { MBA: mbaCount, MCA: mcaCount } }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

// PUT - Update status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'contacted', 'enrolled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    
    res.json({ success: true, message: 'Status updated successfully', data: admission });
  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// DELETE - Delete admission
router.delete('/:id', async (req, res) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    res.json({ success: true, message: 'Admission deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ success: false, message: 'Error deleting admission' });
  }
});

module.exports = router;