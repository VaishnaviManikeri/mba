const Notice = require('../models/Notice');
const { cloudinary } = require('../config/cloudinary');

exports.getAll = async (req, res) => {
    try {
        const notices = await Notice.find().sort({ date: -1 });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { title, description } = req.body;
        
        let fileUrl = '';
        let fileType = '';
        let publicId = '';

        if (req.file) {
            fileUrl = req.file.path;
            fileType = req.file.mimetype;
            publicId = req.file.filename;
        }

        const newNotice = new Notice({
            title,
            description,
            fileUrl,
            fileType,
            publicId
        });

        await newNotice.save();
        res.status(201).json(newNotice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        const existingNotice = await Notice.findById(req.params.id);
        
        if (req.file) {
            // Delete old file from Cloudinary
            if (existingNotice.publicId) {
                await cloudinary.uploader.destroy(existingNotice.publicId, {
                    resource_type: 'raw'
                });
            }
            
            updateData.fileUrl = req.file.path;
            updateData.fileType = req.file.mimetype;
            updateData.publicId = req.file.filename;
        }

        const notice = await Notice.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        res.json(notice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        
        // Delete file from Cloudinary
        if (notice.publicId) {
            await cloudinary.uploader.destroy(notice.publicId, {
                resource_type: 'raw'
            });
        }
        
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Notice deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};