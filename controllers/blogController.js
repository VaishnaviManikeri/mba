const Blog = require('../models/Blog');
const { cloudinary } = require('../config/cloudinary');

exports.getAll = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ date: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { title, content, author, tags } = req.body;

        let imageUrl = '';
        let publicId = '';

        if (req.file) {
            imageUrl = req.file.path;
            publicId = req.file.filename;
        }

        const newBlog = new Blog({
            title,
            content,
            author,
            imageUrl,
            publicId,
            tags: tags ? tags.split(',') : []
        });

        await newBlog.save();
        res.status(201).json(newBlog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        const existingBlog = await Blog.findById(req.params.id);
        
        if (req.file) {
            // Delete old image from Cloudinary
            if (existingBlog.publicId) {
                await cloudinary.uploader.destroy(existingBlog.publicId);
            }
            
            updateData.imageUrl = req.file.path;
            updateData.publicId = req.file.filename;
        }
        
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',');
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        res.json(blog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        // Delete image from Cloudinary
        if (blog.publicId) {
            await cloudinary.uploader.destroy(blog.publicId);
        }
        
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};