const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const createRateLimiter = require('../middlewares/rateLimiter');

// Rate Limiters
const loginLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Brute force protection: limit 10 login attempts per minute.' });
const registerLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Registration rate limit: limit 5 registrations per minute.' });

// OPTIONS & HEAD for auth routes
router.options('/login', (req, res) => {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(200).end();
});

router.route('/me')
    .get(protect, authController.getMe)
    .head((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).end();
    });

// Auth Routes
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.delete('/account', protect, authController.deleteAccount);

module.exports = router;
