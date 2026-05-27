const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper to validate strong password
const isPasswordStrong = (password) => {
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number or special character
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumberOrSpecial = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
    return minLength && hasUppercase && hasLowercase && hasNumberOrSpecial;
};

// ==========================================
// STANDARD AUTHENTICATION CONTROLLERS
// ==========================================

// @desc    Register a new user
// @route   POST /auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
        }

        // Validate strong password
        if (!isPasswordStrong(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, and a number or special character.'
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user'
        });

        // Generate tokens
        const accessToken = user.getSignedJwtToken();
        const refreshToken = user.getSignedRefreshToken();

        // Save refresh token to user
        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({
            success: true,
            accessToken,
            refreshToken,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for missing credentials
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find user by email and select password explicitly
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Match password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = user.getSignedJwtToken();
        const refreshToken = user.getSignedRefreshToken();

        // Save refresh token to user
        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout user / Clear refresh token
// @route   POST /auth/logout
// @access  Private (or Public with body token)
exports.logout = async (req, res) => {
    try {
        let token = req.body.refreshToken || req.headers['x-refresh-token'];

        // If authenticated, we can clear the user's refresh token directly
        if (req.user) {
            req.user.refreshToken = undefined;
            await req.user.save();
            return res.status(200).json({ success: true, message: 'User logged out successfully' });
        }

        // Otherwise, locate user by the provided refresh token and clear it
        if (token) {
            const user = await User.findOne({ refreshToken: token });
            if (user) {
                user.refreshToken = undefined;
                await user.save();
            }
        }

        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current authenticated user profile
// @route   GET /profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        // req.user is populated by protect middleware
        res.status(200).json({
            success: true,
            data: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PATCH /profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const fieldsToUpdate = {};
        if (req.body.name) fieldsToUpdate.name = req.body.name;
        if (req.body.email) fieldsToUpdate.email = req.body.email;

        // Perform email uniqueness verification
        if (req.body.email && req.body.email !== req.user.email) {
            const emailExists = await User.findOne({ email: req.body.email });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already taken' });
            }
        }

        // Handle password update if provided
        if (req.body.password) {
            if (!isPasswordStrong(req.body.password)) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be strong (min 8 chars, uppercase, lowercase, special/number)'
                });
            }
            req.user.password = req.body.password;
            await req.user.save();
        }

        const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Forgot Password - Request reset token
// @route   POST /auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with that email' });
        }

        // Generate random 6-character hex token
        const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Store in DB, expires in 10 minutes
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Return token in response (simulating email dispatch)
        res.status(200).json({
            success: true,
            message: 'Password reset token generated successfully. Dispatch simulated.',
            resetToken,
            instructions: 'Send a POST request to /auth/reset-password with fields: email, token, newPassword'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset password using reset token
// @route   POST /auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide email, token, and newPassword' });
        }

        // Find user by email and match token + check expiry
        const user = await User.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
        }

        // Validate strong password
        if (!isPasswordStrong(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be strong (min 8 chars, uppercase, lowercase, special/number)'
            });
        }

        // Update password and clear reset token fields
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Refresh JWT Access Token
// @route   POST /auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // Find user with this refresh token
        const user = await User.findOne({ _id: decoded.id, refreshToken });
        if (!user) {
            return res.status(401).json({ success: false, message: 'User or session no longer exists' });
        }

        // Sign new Access Token
        const newAccessToken = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Fetch authenticated user info (Alias for protect -> Profile)
// @route   GET /auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        res.status(200).json({
            success: true,
            data: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user account
// @route   DELETE /auth/account
// @access  Private
exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.status(200).json({ success: true, message: 'User account successfully deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ==========================================
// JWT SPECIFIC AUTHENTICATION CONTROLLERS
// ==========================================

// @desc    Generate a generic JWT token for testing/payload
// @route   POST /jwt/generate-token
// @access  Public
exports.generateToken = async (req, res) => {
    try {
        const { payload, expiresIn } = req.body;
        
        if (!payload) {
            return res.status(400).json({ success: false, message: 'Please provide payload object' });
        }

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: expiresIn || '1h' }
        );

        res.status(200).json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify any given JWT token
// @route   POST /jwt/verify-token
// @access  Public
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Please provide token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        res.status(200).json({ success: true, decoded });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid or expired token', error: error.message });
    }
};

// @desc    Get dashboard metrics (Admin Protected)
// @route   GET /jwt/dashboard
// @access  Private (Admin Role Check)
exports.getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        res.status(200).json({
            success: true,
            dashboard: {
                systemName: 'Meta Glasses Reviews Dashboard',
                userMetrics: {
                    totalRegisteredUsers: totalUsers,
                    totalAdmins: totalAdmins
                },
                health: 'ALL SYSTEMS GO',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
