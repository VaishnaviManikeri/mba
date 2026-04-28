const Blog = require('../models/Blog');
const { cloudinary } = require('../config/cloudinary');

exports.getAll = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ date: -1 });
        res.json(blogs);
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
    } catch (err) {
        console.error('Error fetching blog by slug:', err);
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
        console.error('Error fetching blog by id:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.incrementViews = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json({ views: blog.views });
    } catch (err) {
        console.error('Error incrementing views:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        const { title, content, author, tags, metaTitle, metaDescription } = req.body;

        if (!title || !content || !author) {
            return res.status(400).json({ message: 'Title, content, and author are required' });
        }

        let imageUrl = '';
        let publicId = '';

        if (req.file) {
            imageUrl = req.file.path;
            publicId = req.file.filename;
        }

        // Generate slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Calculate reading time
        const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);

        const newBlog = new Blog({
            title,
            slug,
            content,
            author,
            imageUrl,
            publicId,
            tags: tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [],
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || content.replace(/<[^>]*>/g, '').substring(0, 160),
            readingTime
        });

        const savedBlog = await newBlog.save();
        console.log('Blog saved successfully:', savedBlog._id);
        res.status(201).json(savedBlog);
    } catch (err) {
        console.error('Error creating blog:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        const existingBlog = await Blog.findById(req.params.id);
        if (!existingBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        if (req.file) {
            if (existingBlog.publicId) {
                await cloudinary.uploader.destroy(existingBlog.publicId);
            }
            
            updateData.imageUrl = req.file.path;
            updateData.publicId = req.file.filename;
        }
        
        // Update slug if title changed
        if (updateData.title && updateData.title !== existingBlog.title) {
            updateData.slug = updateData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
        }
        
        // Update reading time if content changed
        if (updateData.content && updateData.content !== existingBlog.content) {
            const wordCount = updateData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            updateData.readingTime = Math.ceil(wordCount / 200);
        }
        
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',');
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        res.json(blog);
    } catch (err) {
        console.error('Error updating blog:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        
        if (blog.publicId) {
            await cloudinary.uploader.destroy(blog.publicId);
        }
        
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ message: err.message });
    }
};
