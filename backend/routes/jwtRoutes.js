const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/auth');

// OPTIONS for JWT profile
router.options('/profile', (req, res) => {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.status(200).end();
});

// JWT Core Utility routes
router.post('/generate-token', authController.generateToken);
router.post('/verify-token', authController.verifyToken);
router.post('/refresh-token', authController.refreshToken);
router.delete('/logout', authController.logout);

// JWT Protected Profile and Dashboard
router.get('/profile', protect, authController.getProfile);
router.get('/dashboard', protect, authorize('admin'), authController.getDashboard);

// JWT Role Verification routes
router.get('/admin', protect, authorize('admin'), (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Access granted to admin protected route',
        user: {
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
        }
    });
});

router.get('/user', protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Access granted to user protected route',
        user: {
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
        }
    });
});

module.exports = router;
