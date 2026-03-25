const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node create-user.js <username> <password>');
  process.exit(1);
}

const [username, password] = args;

async function createUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`Error: Username '${username}' is already taken.`);
      return;
    }

    // Hash password and store user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/collegestudysystem');
    await User.create({ username, password: hashedPassword, role: 'staff' });
    console.log(`✅ Success! Staff user '${username}' has been securely created.`);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    mongoose.connection.close();
  }
}

createUser();
