const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    imageUrl: String,
    publicId: String,
    date: {
        type: Date,
        default: Date.now
    },
    tags: [String],
    metaTitle: String,
    metaDescription: String,
    readingTime: Number,
    views: {
        type: Number,
        default: 0
    }
});

// Generate slug from title before saving
blogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Calculate reading time (average 200 words per minute)
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    next();
});

module.exports = mongoose.model('Blog', blogSchema);
