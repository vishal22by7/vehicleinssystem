// Suppress ethers.js network detection errors globally - MUST BE FIRST
require('./utils/suppressEthersErrors');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Import PostgreSQL connection
const { sequelize, testConnection } = require('./config/database');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Required environment variables missing in production!');
    process.exit(1);
  }
}

// Ensure uploads directory exists
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'VIMS Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      policies: '/api/policies',
      claims: '/api/claims',
      admin: '/api/admin',
      calculator: '/api/calculator'
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/calculator', require('./routes/calculator'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VIMS Backend API is running' });
});

// Connect to PostgreSQL
const connectDB = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ PostgreSQL connection failed');
      process.exit(1);
    }
    
    // Sync database models (create tables if they don't exist)
    if (process.env.NODE_ENV !== 'production') {
      const { sequelize } = require('./config/database');
      await sequelize.sync({ alter: false }); // Set to true to auto-migrate in dev
      console.log('✅ Database models synced');
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: PostgreSQL`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;

