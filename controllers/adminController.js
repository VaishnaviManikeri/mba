const Admin = require('../models/Admin');

exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find().select('-password');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const newAdmin = new Admin({ username, password, email });
        await newAdmin.save();
        
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};