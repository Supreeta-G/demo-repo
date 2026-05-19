require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const { connectToDb } = require('./config/db');
const routes = require('./routes/index');

const app = express();

// ====================== MIDDLEWARE ======================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// File Upload Middleware
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true
}));

// Serve uploaded files statically
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

console.log(`📁 Uploads folder: ${uploadsPath}`);

// Debug middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/', (req, res) => res.send('✅ PSG Tech Backend Running'));

// Main API Routes
app.use('/api', routes);

const startServer = async () => {
  try {
    await connectToDb();
    
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📂 Uploads available at: http://localhost:${PORT}/uploads`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();