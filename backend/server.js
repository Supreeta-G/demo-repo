require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const { connectToDb } = require('./config/db');
const routes = require('./routes/index');
const pdfRoutes = require('./routes/pdfGenerator');

// ====================== APP INIT ======================
const app = express();

// ====================== CORS ======================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// ====================== JSON BODY PARSER FIRST ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== PDF ROUTES BEFORE fileUpload ======================
// IMPORTANT: must be registered BEFORE fileUpload middleware
// because fileUpload consumes the body and breaks express.json()
app.use('/api', pdfRoutes);

// ====================== FILE UPLOAD (after PDF routes) ======================
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====================== EMERGENCY DELETE HANDLER ======================
app.delete('/api/admin/applications/*', async (req, res) => {
  const application_id = req.params[0];

  console.log(`🔥 EMERGENCY DELETE TRIGGERED! Full ID = "${application_id}"`);

  if (!application_id) {
    return res.status(400).json({ error: "Application ID required" });
  }

  try {
    const { pool } = require('./config/db');

    const result = await pool.query(
      "DELETE FROM internship_applications WHERE application_id = $1",
      [application_id]
    );

    if (result.rowCount === 0) {
      console.log(`❌ Application not found: ${application_id}`);
      return res.status(404).json({ error: "Application not found" });
    }

    console.log(`✅ SUCCESSFULLY DELETED: ${application_id}`);
    res.json({ success: true, message: "Application deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete application" });
  }
});

// Debug logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/', (req, res) => res.send('✅ PSG Tech Backend Running'));

// ====================== MAIN ROUTES ======================
app.use('/api', routes);

// ====================== START SERVER ======================
const startServer = async () => {
  try {
    await connectToDb();
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();