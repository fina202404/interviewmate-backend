
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); 
const User = require('./models/User');   


dotenv.config();


connectDB();

const createAdminUser = async () => {
  try {
    
    const existingAdmin = await User.findOne({ role: 'admin', email: 'admin@example.com' }); 
    if (existingAdmin) {
      console.log('Admin user (admin@example.com) already exists.');
      mongoose.disconnect();
      return;
    }

    const adminData = {
      username: 'admin', 
      email: 'admin@im.com',    
      password: 'im6895dgfjw7fe34', 
      role: 'admin',
    };

    const user = new User(adminData);
    await user.save();

    console.log('Admin user created successfully!');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('IMPORTANT: Log in with the email and password you set in this script.');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
  mongoose.disconnect();
};


if (process.argv[2] === '-createAdmin') {
  createAdminUser();
} else {
  console.log('Please specify an action: node seeder.js -createAdmin');
  mongoose.disconnect();
}