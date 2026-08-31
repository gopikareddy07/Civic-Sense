/**
 * CivicSense Backend - Main Server Configuration
 * Express server with MongoDB connection
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth');
const issueRoutes = require('./routes/issues');
const classifyRoutes = require('./routes/classify');
const statsRoutes = require('./routes/stats');

const app = express();

// ===================
// Middleware
// ===================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===================
// Database Connection
// ===================
const connectDB = async () => {
  let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicsense';
  
  const startInMemoryMongo = async () => {
    console.log('ℹ️ Spinning up an in-memory MongoDB server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.14'
      },
      instance: {
        startupTimeout: 120000
      }
    });
    const uri = mongoServer.getUri();
    console.log(`✅ In-memory MongoDB started at: ${uri}`);
    process.env.MONGODB_URI = uri;
    
    console.log('🌱 Database is empty. Seeding data...');
    const { execSync } = require('child_process');
    execSync('node src/seed/seedData.js', {
      env: { ...process.env, MONGODB_URI: uri },
      stdio: 'inherit'
    });
    console.log('✅ Database seeded successfully!');
    return uri;
  };

  try {
    if (mongoURI.includes('xxxxx')) {
      mongoURI = await startInMemoryMongo();
    }
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.warn('⚠️ MongoDB Connection failed:', error.message);
    console.log('🔄 Falling back to In-Memory MongoDB server...');
    try {
      mongoURI = await startInMemoryMongo();
      await mongoose.connect(mongoURI);
      console.log('✅ MongoDB Connected Successfully (In-Memory)');
    } catch (fallbackErr) {
      console.error('❌ MongoDB Connection Error:', fallbackErr.message);
      process.exit(1);
    }
  }
};

// ===================
// Routes
// ===================

// Root route - API welcome message
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Welcome to CivicSense API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      issues: '/api/issues',
      classify: '/api/classify',
      stats: '/api/stats'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/classify', classifyRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CivicSense API is running',
    timestamp: new Date().toISOString()
  });
});

// ===================
// Error Handling
// ===================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ===================
// Start Server
// ===================
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CivicSense Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

module.exports = app;
