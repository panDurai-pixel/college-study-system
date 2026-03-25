require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Sanitize MONGO_URI (remove any accidental quotes from dashboard entry)
let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/collegestudysystem';
if (mongoUri.startsWith('"') && mongoUri.endsWith('"')) {
  mongoUri = mongoUri.slice(1, -1);
}

// Connect to MongoDB
mongoose.connect(mongoUri, { family: 4 })
  .then(() => console.log('✅ MongoDB Connected to:', mongoUri.split('@')[1] || 'localhost'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

// Ensure required directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files for legacy local uploads
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/materials', require('./routes/materials'));

const PORT = 5000;

// Auto-seed admin user if it doesn't exist
async function seedAdmin() {
  const User = require('./models/User');
  try {
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password', salt);
      await User.create({ username: 'admin', password: hashedPassword, role: 'staff' });
      console.log('✅ Admin user created: username=admin, password=password');
    } else {
      console.log('ℹ️  Admin user already exists.');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedAdmin();
});
