const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models/sequelize');
const { auth } = require('../middleware/auth');

const router = express.Router();

// OTP Storage (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (Mock implementation - integrate with SMS service like Twilio, MSG91, etc.)
router.post('/send-otp', [
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile } = req.body;
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP
    otpStore.set(mobile, { otp, expiresAt });

    // TODO: Integrate with SMS service
    // For now, log OTP (remove in production)
    console.log(`OTP for ${mobile}: ${otp} (expires in 5 minutes)`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Remove this in production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('otp').matches(/^[0-9]{6}$/).withMessage('Valid 6-digit OTP is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile, otp } = req.body;

    // Get stored OTP
    const stored = otpStore.get(mobile);
    if (!stored) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired' });
    }

    // Check expiry
    if (new Date() > stored.expiresAt) {
      otpStore.delete(mobile);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // Verify OTP
    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified - delete it
    otpStore.delete(mobile);

    // Find or create user
    let user = await User.findOne({ where: { phone: mobile } });
    const isNewUser = !user;

    if (!user) {
      // Create user with mobile only (password will be set during registration)
      user = await User.create({
        name: 'User', // Temporary, will be updated during registration
        email: `${mobile}@temp.com`, // Temporary, will be updated
        phone: mobile,
        phoneVerified: true,
        passwordHash: '' // Will be set during registration
      });
    } else {
      // Update phone verification status
      await user.update({ phoneVerified: true });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: isNewUser ? 'OTP verified. Please complete registration.' : 'OTP verified successfully',
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      isNewUser
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// Register (with OTP verification or email/password)
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, mobile, dateOfBirth, gender, maritalStatus, address, consents } = req.body;

    // Check if user exists
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const existingUserByPhone = await User.findOne({ where: { phone: mobile } });
    if (existingUserByPhone) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });
    }

    // Password will be hashed by User model hook
    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: password || '', // User model beforeCreate hook will hash it
      phone: mobile,
      phoneVerified: true, // Assuming OTP was verified before reaching here
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      maritalStatus: maritalStatus || null,
      addressLine1: address?.line1 || '',
      addressLine2: address?.line2 || '',
      landmark: address?.landmark || '',
      city: address?.city || '',
      state: address?.state || '',
      pincode: address?.pincode || '',
      termsAccepted: consents?.termsAccepted || false,
      marketingConsent: consents?.marketingConsent || false,
      termsAcceptedAt: consents?.termsAccepted ? new Date() : null,
      role: 'user'
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle duplicate email/phone (Sequelize unique constraint error)
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'field';
      return res.status(400).json({ 
        success: false, 
        message: `${field === 'email' ? 'Email' : 'Mobile number'} already registered` 
      });
    }
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user (include passwordHash for comparison)
    // Use unscoped() to override default scope that excludes passwordHash
    const user = await User.unscoped().findOne({ 
      where: { email }
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

