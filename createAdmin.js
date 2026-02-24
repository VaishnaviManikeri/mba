const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const adminData = {
            username: 'trijja',
            password: 'trijja123',
            email: 'jadhavar@college.edu'
        };

        const existingAdmin = await Admin.findOne({ username: adminData.username });
        
        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit(0);
        }

        const admin = new Admin(adminData);
        await admin.save();
        
        console.log('Admin created successfully!');
        console.log('Username:', adminData.username);
        console.log('Password:', adminData.password);
        
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
};

createAdmin();