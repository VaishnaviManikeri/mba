const Gallery = require('../models/Gallery');
const { cloudinary } = require('../config/cloudinary');

exports.getAll = async (req, res) => {
    try {
        const items = await Gallery.find().sort({ date: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { title, description, category } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Determine media type based on file mimetype
        const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

        const newItem = new Gallery({
            title,
            description,
            category,
            mediaUrl: req.file.path,
            mediaType,
            publicId: req.file.filename
        });

        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const updateData = { title, description, category };

        // Find existing item to get publicId
        const existingItem = await Gallery.findById(req.params.id);
        
        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (existingItem.publicId) {
                await cloudinary.uploader.destroy(existingItem.publicId, {
                    resource_type: existingItem.mediaType
                });
            }
            
            updateData.mediaUrl = req.file.path;
            updateData.publicId = req.file.filename;
            updateData.mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        const item = await Gallery.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        res.json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        
        // Delete from Cloudinary
        if (item.publicId) {
            await cloudinary.uploader.destroy(item.publicId, {
                resource_type: item.mediaType
            });
        }
        
        await Gallery.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};