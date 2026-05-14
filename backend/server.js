require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import all routes
const routes = require('./routes/index');     // Main routes file

const app = express();

app.use(cors());
app.use(express.json());

// All API routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/', (req, res) => res.send('PSG Tech Internship Portal Backend Running 🚀'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});