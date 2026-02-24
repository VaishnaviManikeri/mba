const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/', noticeController.getAll);

// Admin routes
router.post('/', auth, upload.single('file'), noticeController.create);
router.put('/:id', auth, upload.single('file'), noticeController.update);
router.delete('/:id', auth, noticeController.delete);

module.exports = router;