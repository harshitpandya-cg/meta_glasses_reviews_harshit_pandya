const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    reviewID: {
        type: String,
        required: [true, 'Please add a review ID'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Typical Amazon review ID matches e.g. R26GJW65W9X4OB, starts with R and is alphanumeric
                return /^R[A-Z0-9]+$/.test(v);
            },
            message: props => `${props.value} is not a valid review ID format! Must start with 'R' and contain alphanumeric characters.`
        }
    },
    name: {
        type: String,
        required: [true, 'Please add a user name'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    dateStr: {
        type: String, // Keep original date string just in case
    },
    verifiedPurchase: {
        type: Boolean,
        required: [true, 'Please specify if it is a verified purchase']
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
    },
    helpful: {
        type: Number,
        default: 0
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        minlength: [3, 'Title must be at least 3 characters'],
        trim: true
    },
    review: {
        type: String,
        required: [true, 'Please add review text'],
        trim: true
    },
    profile: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Please add a country'],
        trim: true
    },
    reviewLink: {
        type: String,
        trim: true
    },
    reviewImage: {
        type: String,
        default: ''
    },
    helpful_aug: {
        type: Number,
        default: 0
    },
    is_positive_review: {
        type: Boolean,
        default: false
    },
    helpfulness_score: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Review', ReviewSchema);
