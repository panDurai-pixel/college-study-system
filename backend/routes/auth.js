const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Staff Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const payload = { user: { id: user._id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, role: user.role, username: user.username });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Setup Initial User (Development only)
router.post('/setup', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) return res.json({ message: 'Admin already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    await User.create({ username: 'admin', password: hashedPassword, role: 'staff' });
    
    res.json({ message: 'Admin user created. login with admin / password' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Create New Staff User (Staff Only)
router.post('/register', auth, async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username and password' });
  }
  
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username is already taken' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await User.create({ username, password: hashedPassword, role: 'staff' });
    
    res.json({ message: `Staff user '${username}' created successfully!` });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
