const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middlewares/auth');
const createRateLimiter = require('../middlewares/rateLimiter');

// Rate Limiters
const reviewsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests, please try again in a minute.' });
const searchLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 15, message: 'Too many searches, please try again in a minute.' });
const adminLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Strict admin rate limit, please try again in a minute.' });
const spamLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Spam prevention: limit 5 review creations per minute.' });
const deleteLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Delete rate limit: limit 5 deletes per minute.' });
const importLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 2, message: 'Bulk upload rate limit: limit 2 bulk imports per minute.' });

// ==========================================
// GOOD TO HAVE ROUTES (HEAD & OPTIONS)
// ==========================================
router.route('/')
    .head((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).end();
    })
    .options((req, res) => {
        res.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
        res.status(200).end();
    });

router.route('/reviews')
    .head((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).end();
    })
    .options((req, res) => {
        res.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
        res.status(200).end();
    });

router.route('/reviews/:reviewID')
    .head((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).end();
    })
    .options((req, res) => {
        res.setHeader('Allow', 'GET, PUT, PATCH, DELETE, OPTIONS, HEAD');
        res.status(200).end();
    });

// ==========================================
// BASIC CRUD ROUTES
// ==========================================
router.route('/')
    .get(reviewsLimiter, reviewController.getReviews);

router.route('/reviews')
    .get(reviewsLimiter, reviewController.getReviews)
    .post(spamLimiter, reviewController.createReview);

router.route('/verified')
    .get(reviewController.getVerifiedReviews);

router.route('/users')
    .get(reviewController.getUsers);

router.route('/countries')
    .get(reviewController.getCountries);

router.route('/ratings')
    .get(reviewController.getRatingsDistribution);

// ==========================================
// ROUTE PARAMETERS ROUTES (With /reviews prefix)
// ==========================================
router.get('/users/:name/reviews', reviewController.getReviewsByUser);
router.get('/country/:country/reviews', reviewController.getReviewsByCountry);
router.get('/ratings/:rating', reviewController.getReviewsByRating);
router.get('/verified/:status', reviewController.getVerifiedByStatus);

router.get('/reviews/title/:title', reviewController.getReviewsByTitle);
router.get('/reviews/date/:date', reviewController.getReviewsByDate);
router.get('/reviews/helpful/:count', reviewController.getReviewsByHelpfulCount);
router.get('/reviews/positive/:status', reviewController.getPositiveReviewsByStatus);
router.get('/reviews/country/:country/rating/:rating', reviewController.getCountryReviewsByRating);
router.get('/reviews/year/:year', reviewController.getReviewsByYear);
router.get('/reviews/month/:month', reviewController.getReviewsByMonth);
router.get('/reviews/day/:day', reviewController.getReviewsByDay);
router.get('/reviews/user/:name/rating/:rating', reviewController.getUserReviewsByRating);
router.get('/reviews/country/:country/verified/:status', reviewController.getVerifiedCountryReviews);
router.get('/reviews/helpfulness/:score', reviewController.getReviewsByHelpfulnessScore);
router.get('/reviews/profile/:profileID', reviewController.getReviewsByProfileID);
router.get('/reviews/review-link/:reviewID', reviewController.getReviewLink);
router.get('/reviews/image/:status', reviewController.getReviewsByImageStatus);
router.get('/reviews/device/:deviceName', reviewController.getReviewsByDevice);

// ==========================================
// PAGINATION & SORTING ROUTES (With /reviews prefix)
// ==========================================
router.get('/reviews/positive', reviewController.getPaginatedPositiveReviews);
router.get('/reviews/negative', reviewController.getPaginatedNegativeReviews);
router.get('/reviews/latest', reviewController.getPaginatedLatestReviews);
router.get('/reviews/helpful', reviewController.getPaginatedHelpfulReviews);

// ==========================================
// SEARCH ROUTES
// ==========================================
router.get('/search', searchLimiter, reviewController.searchReviews);
router.get('/search/title', reviewController.searchTitles);
router.get('/search/user', reviewController.searchByUser);
router.get('/search/reviews', reviewController.searchReviewTextOnly);
router.get('/search/country', reviewController.searchCountries);
router.get('/search/users', reviewController.searchUsers);

// ==========================================
// STATISTICS ROUTES
// ==========================================
router.get('/stats/average-rating', reviewController.getAverageRating);
router.get('/stats/highest-rating', reviewController.getHighestRating);
router.get('/stats/lowest-rating', reviewController.getLowestRating);
router.get('/stats/country/:country', reviewController.getCountryStats);
router.get('/stats/user/:name', reviewController.getUserStats);
router.get('/stats/positive-reviews', reviewController.getPositiveStats);
router.get('/stats/negative-reviews', reviewController.getNegativeStats);
router.get('/stats/top-reviewers', reviewController.getTopReviewers);
router.get('/stats/most-helpful', reviewController.getMostHelpful);
router.get('/stats/verified-purchases', reviewController.getVerifiedStats);
router.get('/stats/monthly-average', reviewController.getMonthlyAverage);
router.get('/stats/reviews', reviewController.getPaginatedStatsReviews);

// ==========================================
// ADVANCED ROUTES (With /reviews prefix where applicable)
// ==========================================
router.get('/reviews/top/highest-rated', reviewController.getHighestRatedReviews);
router.get('/reviews/top/lowest-rated', reviewController.getLowestRatedReviews);
router.get('/compare', reviewController.compareUsers);
router.get('/compare/rating', reviewController.compareRatings);
router.get('/reviews/random', reviewController.getRandomReview);
router.get('/reviews/trending', reviewController.getTrendingReviews);
router.get('/reviews/recent', reviewController.getRecentReviews);
router.get('/reviews/ai-summary', reviewController.generateAISummary);
router.get('/reviews/sentiment-analysis', reviewController.getSentimentAnalysis);

// ==========================================
// MIDDLEWARE ROUTES (ADMIN & PROTECTED)
// ==========================================
// Admin reviews CRUD (rate limited and protected)
router.route('/admin/reviews')
    .get(protect, authorize('admin'), adminLimiter, reviewController.getReviews)
    .post(protect, authorize('admin'), reviewController.createReview);

router.route('/admin/reviews/:reviewID')
    .patch(protect, authorize('admin'), reviewController.updateReviewRating)
    .delete(protect, authorize('admin'), reviewController.deleteReview);

// Admin dashboard (rate limited and protected)
router.get('/admin/dashboard', protect, authorize('admin'), adminLimiter, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome Admin to the Reviews Dashboard',
        role: req.user.role,
        accessedAt: new Date()
    });
});

// Protected reviews routes
router.route('/protected/reviews')
    .get(protect, reviewController.getReviews)
    .post(protect, reviewController.createReview);

router.delete('/protected/reviews/:reviewID', protect, reviewController.deleteReview);

// ==========================================
// BULK DATA IMPORT ROUTE
// ==========================================
router.post('/import/json', importLimiter, reviewController.importReviewsJson);

// ==========================================
// DYNAMIC CRUD BY ID ROUTES (Placed at bottom to prevent shadowing)
// ==========================================
router.route('/reviews/:reviewID')
    .get(reviewController.getReview)
    .put(reviewController.updateReview)
    .delete(deleteLimiter, reviewController.deleteReview);

router.patch('/reviews/:reviewID/rating', reviewController.updateReviewRating);

module.exports = router;
