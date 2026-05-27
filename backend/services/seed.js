const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('../models/Review');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meta_glasses_reviews';
        console.log(`Connecting to database at ${mongoURI}...`);
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected. Clearing existing reviews...');
        
        await Review.deleteMany({});
        console.log('Cleared existing reviews.');

        const filePath = path.join(__dirname, '../../Meta-Glasses-Reviews.json');
        console.log(`Reading dataset from ${filePath}...`);
        
        if (!fs.existsSync(filePath)) {
            console.error(`Error: Dataset file not found at ${filePath}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const reviews = JSON.parse(rawData);
        console.log(`Loaded ${reviews.length} reviews from JSON. Formatting data...`);

        const formattedReviews = reviews.map(r => {
            // Parse dates like "March 9, 2025" or "2025-12-25"
            let parsedDate = new Date(r.date);
            if (isNaN(parsedDate.getTime())) {
                parsedDate = new Date();
            }

            // Parse helpful count (remove commas)
            let parsedHelpful = 0;
            if (r.helpful) {
                parsedHelpful = parseInt(String(r.helpful).replace(/,/g, ''), 10);
                if (isNaN(parsedHelpful)) parsedHelpful = 0;
            }

            // Parse rating
            const parsedRating = parseFloat(r.rating) || 0;

            // Parse helpful_aug
            const parsedHelpfulAug = parseInt(r.helpful_aug, 10) || 0;

            // Parse helpfulness_score
            const parsedScore = parseFloat(r.helpfulness_score) || 0;

            // Parse verified purchase
            const isVerified = r.verifiedPurchase === 'True' || r.verifiedPurchase === 'true' || r.verifiedPurchase === true;

            // Parse is_positive_review
            const isPositive = r.is_positive_review === '1' || r.is_positive_review === 1 || r.is_positive_review === 'true' || r.is_positive_review === true;

            return {
                reviewID: r.reviewID,
                name: r.name || 'Anonymous',
                date: parsedDate,
                dateStr: r.date,
                verifiedPurchase: isVerified,
                rating: parsedRating,
                helpful: parsedHelpful,
                title: r.title || 'No Title',
                review: r.review || 'No review content provided.',
                profile: r.profile || '',
                country: r.country || 'United States',
                reviewLink: r.reviewLink || '',
                reviewImage: r.reviewImage || '',
                helpful_aug: parsedHelpfulAug,
                is_positive_review: isPositive,
                helpfulness_score: parsedScore
            };
        });

        // De-duplicate by reviewID to prevent Mongoose unique index validation errors
        const uniqueReviews = [];
        const seenIDs = new Set();
        for (const r of formattedReviews) {
            if (!seenIDs.has(r.reviewID)) {
                seenIDs.add(r.reviewID);
                uniqueReviews.push(r);
            }
        }

        console.log(`Unique reviews to insert: ${uniqueReviews.length} (filtered out ${formattedReviews.length - uniqueReviews.length} duplicates)`);

        // Insert in batches of 1000
        const chunkSize = 1000;
        for (let i = 0; i < uniqueReviews.length; i += chunkSize) {
            const chunk = uniqueReviews.slice(i, i + chunkSize);
            await Review.insertMany(chunk, { ordered: false });
            console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(uniqueReviews.length / chunkSize)}`);
        }

        console.log('Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
