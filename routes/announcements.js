const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', announcementController.getAll);

// Admin routes
router.post('/', auth, announcementController.create);
router.put('/:id', auth, announcementController.update);
router.delete('/:id', auth, announcementController.delete);

module.exports = router;