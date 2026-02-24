const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', careerController.getAll);
router.get('/active', careerController.getActive);

// Admin routes
router.post('/', auth, careerController.create);
router.put('/:id', auth, careerController.update);
router.delete('/:id', auth, careerController.delete);

module.exports = router;