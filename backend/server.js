require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToDb } = require('./config/db');
const routes = require('./routes/index');

const app = express();

app.use(cors());
app.use(express.json());

connectToDb();   // ← Important

app.use('/api', routes);

app.get('/', (req, res) => res.send('✅ Backend Running'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));