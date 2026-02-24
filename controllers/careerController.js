const Career = require('../models/Career');

exports.getAll = async (req, res) => {
    try {
        const careers = await Career.find().sort({ postedDate: -1 });
        res.json(careers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getActive = async (req, res) => {
    try {
        const careers = await Career.find({ status: 'active' }).sort({ postedDate: -1 });
        res.json(careers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newCareer = new Career(req.body);
        await newCareer.save();
        res.status(201).json(newCareer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const career = await Career.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(career);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await Career.findByIdAndDelete(req.params.id);
        res.json({ message: 'Career deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};