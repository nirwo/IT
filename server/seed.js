const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Organization = require('./models/Organization');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Organization.deleteMany({});

    // Create default organization
    const organization = new Organization({
      name: 'Default Organization',
      description: 'Default organization for IT R&D Dashboard',
      type: 'admin'
    });

    await organization.save();
    console.log('Created default organization');

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      organization: organization._id,
      permissions: ['read', 'write', 'admin', 'profile_management']
    });

    await adminUser.save();
    console.log('Created admin user');

    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123',
      role: 'user',
      organization: organization._id,
      permissions: ['read']
    });

    await testUser.save();
    console.log('Created test user');

    console.log('Database seeded successfully!');
    console.log('Admin credentials: admin / admin123');
    console.log('Test user credentials: testuser / test123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
