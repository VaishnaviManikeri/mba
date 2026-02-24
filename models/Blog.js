const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
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
    tags: [String]
});

module.exports = mongoose.model('Blog', blogSchema);