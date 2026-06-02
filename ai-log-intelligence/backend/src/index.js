const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Health check — always have one, interviewers notice
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/logs', require('./routes/logs'));
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/keys', require('./routes/keys'));
app.use('/api/stats', require('./routes/stats'));

// Global error handler — catches anything that falls through
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Connect to MongoDB, THEN start server
// Never start the server before DB is ready
async function start() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();