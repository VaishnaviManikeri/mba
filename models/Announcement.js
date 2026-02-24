const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    important: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Announcement', announcementSchema);