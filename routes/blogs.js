const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/', blogController.getAll);
router.get('/slug/:slug', blogController.getBySlug);
router.get('/:id', blogController.getOne);
router.post('/:id/view', blogController.incrementViews);

// Admin routes
router.post('/', auth, upload.single('image'), blogController.create);
router.put('/:id', auth, upload.single('image'), blogController.update);
router.delete('/:id', auth, blogController.delete);

module.exports = router;
