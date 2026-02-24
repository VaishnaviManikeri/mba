const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    fileUrl: String,
    fileType: String,
    publicId: String
});

module.exports = mongoose.model('Notice', noticeSchema);