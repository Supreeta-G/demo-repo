require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDb } = require('./config/db');
const routes = require('./routes/index');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Database Connection + Start Server
const startServer = async () => {
  try {
    await connectToDb();
    
    // Mount all API routes under /api
    app.use('/api', routes);

    // Health check
    app.get('/', (req, res) => {
      res.send('✅ PSG Tech Internship Portal Backend is Running');
    });

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();