const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const auth = require('../middleware/auth');

// Public route - Submit application
router.post('/submit', admissionController.submitApplication);

// Admin only routes
router.get('/all', auth, admissionController.getAllApplications);
router.get('/statistics', auth, admissionController.getStatistics);
router.get('/:id', auth, admissionController.getApplicationById);
router.put('/:id/status', auth, admissionController.updateApplicationStatus);
router.delete('/:id', auth, admissionController.deleteApplication);

module.exports = router;
