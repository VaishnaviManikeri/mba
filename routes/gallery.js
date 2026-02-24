const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/', galleryController.getAll);

// Admin routes
router.post('/', auth, upload.single('media'), galleryController.create);
router.put('/:id', auth, upload.single('media'), galleryController.update);
router.delete('/:id', auth, galleryController.delete);

module.exports = router;