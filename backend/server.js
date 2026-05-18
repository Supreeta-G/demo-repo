require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDb } = require('./config/db');
const routes = require('./routes/index');

const app = express();

// ====================== MIDDLEWARE ======================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// ✅ IMPROVED STATIC FILE SERVING FOR UPLOADS
const uploadsPath = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadsPath, {
  index: false,
  setHeaders: (res, filepath) => {
    if (filepath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

console.log(`📁 Serving uploads from: ${uploadsPath}`);

// Debug middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/', (req, res) => res.send('✅ Backend Running'));
// === EMERGENCY DELETE HANDLER (MUST BE BEFORE ROUTES) ===
// app.delete('/api/admin/applications/:id', async (req, res) => {
//   console.log("🔥 EMERGENCY DELETE TRIGGERED! ID =", req.params.id);
  
//   try {
//     const { pool } = require('./config/db');
//     const result = await pool.query(
//       "DELETE FROM internship_applications WHERE application_id = $1", 
//       [req.params.id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Application not found" });
//     }

//     console.log("✅ Application deleted from database!");
//     res.json({ success: true, message: "Application deleted successfully" });
//   } catch (err) {
//     console.error("Delete Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Main routes
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
    console.error('❌ Failed to start:', err.message);
  }
};

startServer();







