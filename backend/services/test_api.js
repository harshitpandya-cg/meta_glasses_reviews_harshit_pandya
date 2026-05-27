const BASE_URL = 'http://localhost:5000';

// Global variables to store session states
let jwtAccessToken = '';
let jwtRefreshToken = '';
let testReviewID = 'R99TESTVALIDATION';
let resetTokenCode = '';

// Helper to print test headings
const printHeading = (text) => {
    console.log(`\n======================================================`);
    console.log(`🔍 TEST GROUP: ${text}`);
    console.log(`======================================================`);
};

// Helper for passing/failing visual checks
const assertStatus = (name, res, expectedStatus = 200, debugBody = false) => {
    if (res.status === expectedStatus) {
        console.log(`✅ [PASS] ${name} (Status: ${res.status})`);
        return true;
    } else {
        console.log(`❌ [FAIL] ${name} (Expected: ${expectedStatus}, Got: ${res.status})`);
        if (debugBody) {
            console.log(`   Response Body:`, JSON.stringify(res.body, null, 2));
        }
        return false;
    }
};

// Custom fetch wrapper that parses json automatically
const apiCall = async (method, path, body = null, headers = {}) => {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-testing': 'true',
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${BASE_URL}${path}`, options);
        let responseBody = null;
        try {
            responseBody = await response.json();
        } catch (e) {
            // No json returned
        }
        return {
            status: response.status,
            body: responseBody,
            headers: response.headers
        };
    } catch (error) {
        return { status: 500, body: { error: error.message }, headers: new Headers() };
    }
};

const runAllTests = async () => {
    console.log('🚀 STARTING COMPREHENSIVE BACKEND API INTEGRATION SUITE...');
    console.log(`🔗 Target Host: ${BASE_URL}\n`);

    // ==========================================
    // GROUP 1: AUTH & JWT LIFECYCLE
    // ==========================================
    printHeading('AUTHENTICATION & JWT SERVICES');

    // Register User (Validate strong password check first)
    const weakPassRes = await apiCall('POST', '/auth/register', {
        name: 'Harshit Pandya',
        email: 'harshit@test.com',
        password: 'weak'
    });
    assertStatus('Validation: Prevent registering with weak password', weakPassRes, 400);

    // Register User (Strong Password - Success)
    const regRes = await apiCall('POST', '/auth/register', {
        name: 'Harshit Pandya',
        email: 'harshit@test.com',
        password: 'SecurePassword123!',
        role: 'admin' // Enable admin role for dashboard access
    });
    if (regRes.status === 400 && regRes.body?.message?.includes('exists')) {
        console.log('ℹ️ User already registered, proceeding to login...');
    } else {
        assertStatus('POST /auth/register - Register secure admin user', regRes, 201);
    }

    // Login User
    const loginRes = await apiCall('POST', '/auth/login', {
        email: 'harshit@test.com',
        password: 'SecurePassword123!'
    });
    const loggedIn = assertStatus('POST /auth/login - Retrieve Auth Session tokens', loginRes, 200);
    if (loggedIn) {
        jwtAccessToken = loginRes.body.accessToken;
        jwtRefreshToken = loginRes.body.refreshToken;
    }

    // GET /profile (JWT Protected)
    const profileRes = await apiCall('GET', '/profile', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /profile - Access protected user profile data', profileRes, 200);

    // PATCH /profile
    const updateProfileRes = await apiCall('PATCH', '/profile', { name: 'Harshit Pandya Updated' }, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('PATCH /profile - Update profile details', updateProfileRes, 200);

    // GET /auth/me
    const meRes = await apiCall('GET', '/auth/me', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /auth/me - Access session details', meRes, 200);

    // POST /auth/forgot-password
    const forgotRes = await apiCall('POST', '/auth/forgot-password', { email: 'harshit@test.com' });
    const forgotPassed = assertStatus('POST /auth/forgot-password - Request reset code', forgotRes, 200);
    if (forgotPassed) {
        resetTokenCode = forgotRes.body.resetToken;
    }

    // POST /auth/reset-password
    const resetRes = await apiCall('POST', '/auth/reset-password', {
        email: 'harshit@test.com',
        token: resetTokenCode,
        newPassword: 'NewSecurePassword123!'
    });
    assertStatus('POST /auth/reset-password - Complete password reset flow', resetRes, 200);

    // Log back in with new password
    const reloginRes = await apiCall('POST', '/auth/login', {
        email: 'harshit@test.com',
        password: 'NewSecurePassword123!'
    });
    if (assertStatus('POST /auth/login - Relogin with updated credentials', reloginRes, 200)) {
        jwtAccessToken = reloginRes.body.accessToken;
        jwtRefreshToken = reloginRes.body.refreshToken;
    }

    // POST /auth/refresh-token
    const refreshRes = await apiCall('POST', '/auth/refresh-token', { refreshToken: jwtRefreshToken });
    assertStatus('POST /auth/refresh-token - Exchange session refresh token', refreshRes, 200);


    // ==========================================
    // GROUP 2: JWT SPECIFIC UTILITY ENDPOINTS
    // ==========================================
    printHeading('JWT UTILITIES & ROLE PROTECTIONS');

    // POST /jwt/generate-token
    const genTokenRes = await apiCall('POST', '/jwt/generate-token', {
        payload: { testVal: 'AntigravityEngine' },
        expiresIn: '5m'
    });
    const customToken = genTokenRes.body?.token;
    assertStatus('POST /jwt/generate-token - Generate customized testing token', genTokenRes, 200);

    // POST /jwt/verify-token
    const verifyTokenRes = await apiCall('POST', '/jwt/verify-token', { token: customToken });
    assertStatus('POST /jwt/verify-token - Validate external JWT payload', verifyTokenRes, 200);

    // GET /jwt/profile
    const jwtProfileRes = await apiCall('GET', '/jwt/profile', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /jwt/profile - Access JWT profile details', jwtProfileRes, 200);

    // GET /jwt/dashboard
    const jwtDashboardRes = await apiCall('GET', '/jwt/dashboard', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /jwt/dashboard - Access JWT dashboard (Admin authorization)', jwtDashboardRes, 200);

    // GET /jwt/user
    const jwtUserRes = await apiCall('GET', '/jwt/user', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /jwt/user - JWT Protected standard user route', jwtUserRes, 200);

    // GET /jwt/admin
    const jwtAdminRes = await apiCall('GET', '/jwt/admin', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /jwt/admin - JWT Protected admin route checks', jwtAdminRes, 200);


    // ==========================================
    // GROUP 3: BASIC CRUD ENDPOINTS & VALIDATIONS
    // ==========================================
    printHeading('REVIEWS CRUD OPERATIONS & REQUEST VALIDATIONS');

    // Create Review - Malformed reviewID validation
    const malformedIDRes = await apiCall('POST', '/reviews', {
        reviewID: 'BAD_ID_123',
        name: 'Harshit Pandya',
        date: 'March 9, 2025',
        verifiedPurchase: true,
        rating: 4,
        title: 'Nice',
        review: 'Nice review content here.',
        country: 'United States'
    });
    assertStatus('Validation: Rejects malformed reviewID format', malformedIDRes, 400);

    // Create Review - Invalid Rating boundary check
    const badRatingRes = await apiCall('POST', '/reviews', {
        reviewID: testReviewID,
        name: 'Harshit Pandya',
        date: 'March 9, 2025',
        verifiedPurchase: true,
        rating: 6.5,
        title: 'Nice Smart Shades',
        review: 'Nice review content here.',
        country: 'United States'
    });
    assertStatus('Validation: Rejects rating out of 1-5 boundary', badRatingRes, 400);

    // Create Review - Min Title Length check
    const badTitleRes = await apiCall('POST', '/reviews', {
        reviewID: testReviewID,
        name: 'Harshit Pandya',
        date: 'March 9, 2025',
        verifiedPurchase: true,
        rating: 4,
        title: 'Hi',
        review: 'Nice review content here.',
        country: 'United States'
    });
    assertStatus('Validation: Enforces minimum title length (min 3 characters)', badTitleRes, 400);

    // Create Review - Success
    const createReviewRes = await apiCall('POST', '/reviews', {
        reviewID: testReviewID,
        name: 'Harshit Pandya',
        date: '2025-12-25',
        verifiedPurchase: 'True',
        rating: 5.0,
        title: 'Perfect Action Capture device',
        review: 'The battery and speaker quality are top notch smart devices.',
        country: 'United States',
        profile: 'https://amazon.com/gp/profile/amzn1.account.HARSHIT',
        reviewLink: 'https://amazon.com/gp/customer-reviews/R99TESTVALIDATION',
        reviewImage: 'https://images-na.ssl-images-amazon.com/images/I/71Xo.jpg'
    });
    assertStatus('POST /reviews - Create new valid review', createReviewRes, 201);

    // GET /reviews/:reviewID
    const getReviewRes = await apiCall('GET', `/reviews/${testReviewID}`);
    assertStatus('GET /reviews/:reviewID - Fetch single review by ID', getReviewRes, 200);

    // PUT /reviews/:reviewID
    const putReviewRes = await apiCall('PUT', `/reviews/${testReviewID}`, {
        reviewID: testReviewID,
        name: 'Harshit Pandya',
        date: '2025-12-25',
        verifiedPurchase: 'True',
        rating: 4.0,
        title: 'Perfect Action Capture device replaced',
        review: 'The battery is great, but speaker can be slightly louder.',
        country: 'United States'
    });
    assertStatus('PUT /reviews/:reviewID - Replace complete review payload', putReviewRes, 200);

    // PATCH /reviews/:reviewID/rating
    const patchRes = await apiCall('PATCH', `/reviews/${testReviewID}/rating`, { rating: 5.0 });
    assertStatus('PATCH /reviews/:reviewID/rating - Update review rating', patchRes, 200);

    // GET /users & GET /countries & GET /ratings & GET /verified
    assertStatus('GET /users - Fetch unique reviewers list', await apiCall('GET', '/users'), 200);
    assertStatus('GET /countries - Fetch unique reviewer countries', await apiCall('GET', '/countries'), 200);
    assertStatus('GET /ratings - Fetch review ratings distribution data', await apiCall('GET', '/ratings'), 200);
    assertStatus('GET /verified - Fetch verified purchase reviews', await apiCall('GET', '/verified'), 200);


    // ==========================================
    // GROUP 4: ROUTE PARAMETERS ENDPOINTS
    // ==========================================
    printHeading('DYNAMIC ROUTE PARAMETERS');

    assertStatus('GET /users/:name/reviews', await apiCall('GET', '/users/HebeZ/reviews'), 200);
    assertStatus('GET /country/:country/reviews', await apiCall('GET', '/country/United States/reviews'), 200);
    assertStatus('GET /ratings/:rating', await apiCall('GET', '/ratings/5'), 200);
    assertStatus('GET /verified/:status', await apiCall('GET', '/verified/true'), 200);
    assertStatus('GET /reviews/title/:title', await apiCall('GET', '/reviews/title/Great'), 200);
    assertStatus('GET /reviews/date/:date', await apiCall('GET', '/reviews/date/2025-12-25'), 200);
    assertStatus('GET /reviews/helpful/:count', await apiCall('GET', '/reviews/helpful/5'), 200);
    assertStatus('GET /reviews/positive/:status', await apiCall('GET', '/reviews/positive/true'), 200);
    assertStatus('GET /reviews/country/:country/rating/:rating', await apiCall('GET', '/reviews/country/United States/rating/5'), 200);
    assertStatus('GET /reviews/year/:year', await apiCall('GET', '/reviews/year/2025'), 200);
    assertStatus('GET /reviews/month/:month', await apiCall('GET', '/reviews/month/12'), 200);
    assertStatus('GET /reviews/day/:day', await apiCall('GET', '/reviews/day/25'), 200);
    assertStatus('GET /reviews/user/:name/rating/:rating', await apiCall('GET', '/reviews/user/HebeZ/rating/4'), 200);
    assertStatus('GET /reviews/country/:country/verified/:status', await apiCall('GET', '/reviews/country/United States/verified/true'), 200);
    assertStatus('GET /reviews/helpfulness/:score', await apiCall('GET', '/reviews/helpfulness/5'), 200);
    assertStatus('GET /reviews/profile/:profileID', await apiCall('GET', '/reviews/profile/amzn1.account.AHB27IWMWVLAD54XVISCCOCFACBA'), 200);
    assertStatus('GET /reviews/review-link/:reviewID', await apiCall('GET', '/reviews/review-link/R26GJW65W9X4OB'), 200);
    assertStatus('GET /reviews/image/:status', await apiCall('GET', '/reviews/image/with'), 200);
    assertStatus('GET /reviews/device/:deviceName', await apiCall('GET', '/reviews/device/wayfarer'), 200);


    // ==========================================
    // GROUP 5: QUERY PARAMETERS, PAGINATION, SORTING
    // ==========================================
    printHeading('QUERY PARAMETERS, PAGINATION & SORTING');

    assertStatus('Query: Filter rating=5', await apiCall('GET', '/reviews?rating=5'), 200);
    assertStatus('Query: Filter country=United States', await apiCall('GET', '/reviews?country=United States'), 200);
    assertStatus('Query: Filter verifiedPurchase=True', await apiCall('GET', '/reviews?verifiedPurchase=True'), 200);
    assertStatus('Query: Filter positive=1', await apiCall('GET', '/reviews?positive=1'), 200);
    assertStatus('Query: Filter minHelpful=10', await apiCall('GET', '/reviews?minHelpful=10'), 200);
    assertStatus('Query: Filter fields projection', await apiCall('GET', '/reviews?fields=name,rating,title'), 200);
    assertStatus('Query: Filter Exact Date', await apiCall('GET', '/reviews?date=2025-12-25'), 200);
    assertStatus('Query: Filter Title Contains', await apiCall('GET', '/reviews?titleContains=smart'), 200);
    assertStatus('Query: Combined sorting (sort=rating,-helpful)', await apiCall('GET', '/reviews?sort=rating,-helpful'), 200);
    assertStatus('Pagination: positive reviews paginated', await apiCall('GET', '/reviews/positive?page=1&limit=5'), 200);
    assertStatus('Pagination: latest reviews paginated', await apiCall('GET', '/reviews/latest?page=1&limit=5'), 200);


    // ==========================================
    // GROUP 6: SEARCH SERVICES
    // ==========================================
    printHeading('KEYWORD SEARCH SERVICES');

    assertStatus('GET /search?keyword=battery', await apiCall('GET', '/search?keyword=battery'), 200);
    assertStatus('GET /search/title?keyword=Great', await apiCall('GET', '/search/title?keyword=Great'), 200);
    assertStatus('GET /search/user?keyword=Karla', await apiCall('GET', '/search/user?keyword=Karla'), 200);
    assertStatus('GET /search/reviews?q=audio', await apiCall('GET', '/search/reviews?q=audio'), 200);
    assertStatus('GET /search/country?q=United', await apiCall('GET', '/search/country?q=United'), 200);
    assertStatus('GET /search/users?q=Scott', await apiCall('GET', '/search/users?q=Scott'), 200);


    // ==========================================
    // GROUP 7: STATISTICS & ANALYTICS SERVICES
    // ==========================================
    printHeading('ANALYTICS & STATISTICS SERVICES');

    assertStatus('GET /stats/average-rating', await apiCall('GET', '/stats/average-rating'), 200);
    assertStatus('GET /stats/highest-rating', await apiCall('GET', '/stats/highest-rating'), 200);
    assertStatus('GET /stats/lowest-rating', await apiCall('GET', '/stats/lowest-rating'), 200);
    assertStatus('GET /stats/country/:country', await apiCall('GET', '/stats/country/United States'), 200);
    assertStatus('GET /stats/user/:name', await apiCall('GET', '/stats/user/HebeZ'), 200);
    assertStatus('GET /stats/positive-reviews', await apiCall('GET', '/stats/positive-reviews'), 200);
    assertStatus('GET /stats/negative-reviews', await apiCall('GET', '/stats/negative-reviews'), 200);
    assertStatus('GET /stats/top-reviewers', await apiCall('GET', '/stats/top-reviewers'), 200);
    assertStatus('GET /stats/most-helpful', await apiCall('GET', '/stats/most-helpful'), 200);
    assertStatus('GET /stats/verified-purchases', await apiCall('GET', '/stats/verified-purchases'), 200);
    assertStatus('GET /stats/monthly-average', await apiCall('GET', '/stats/monthly-average'), 200);
    assertStatus('GET /stats/reviews (Daily stats paginated)', await apiCall('GET', '/stats/reviews?page=1&limit=10'), 200);


    // ==========================================
    // GROUP 8: MIDDLEWARE ROUTE PROTECTIONS (ADMIN & USER)
    // ==========================================
    printHeading('MIDDLEWARE & CONTROLLED ACCESS SERVICES');

    // Admin reviews route (Admin protected)
    const adminGetReviewsRes = await apiCall('GET', '/admin/reviews', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /admin/reviews - Authorized admin access', adminGetReviewsRes, 200);

    // Admin Dashboard (Admin protected)
    const adminDashboardRes = await apiCall('GET', '/admin/dashboard', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /admin/dashboard - Authorized dashboard access', adminDashboardRes, 200);

    // Protected Reviews route (User protected)
    const userGetReviewsRes = await apiCall('GET', '/protected/reviews', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('GET /protected/reviews - Protected reviewer query', userGetReviewsRes, 200);


    // ==========================================
    // GROUP 9: ADVANCED AI & SENTIMENT SERVICES
    // ==========================================
    printHeading('ADVANCED LOGICAL ANALYTICS & UTILITIES');

    assertStatus('GET /reviews/top/highest-rated', await apiCall('GET', '/reviews/top/highest-rated'), 200);
    assertStatus('GET /reviews/top/lowest-rated', await apiCall('GET', '/reviews/top/lowest-rated'), 200);
    assertStatus('GET /compare?user1=HebeZ&user2=Karla', await apiCall('GET', '/compare?user1=HebeZ&user2=Karla'), 200);
    assertStatus('GET /compare/rating?rating1=4&rating2=5', await apiCall('GET', '/compare/rating?rating1=4&rating2=5'), 200);
    assertStatus('GET /reviews/random', await apiCall('GET', '/reviews/random'), 200);
    assertStatus('GET /reviews/trending', await apiCall('GET', '/reviews/trending'), 200);
    assertStatus('GET /reviews/recent', await apiCall('GET', '/reviews/recent'), 200);
    assertStatus('GET /reviews/ai-summary - AI synthesized review summary', await apiCall('GET', '/reviews/ai-summary'), 200);
    assertStatus('GET /reviews/sentiment-analysis - Custom sentiment metrics', await apiCall('GET', '/reviews/sentiment-analysis'), 200);
    assertStatus('GET /health - System health status check', await apiCall('GET', '/health'), 200);
    assertStatus('GET /version - Read server version', await apiCall('GET', '/version'), 200);


    // ==========================================
    // GROUP 10: OPTIONAL METADATA LOGISTICS (HEAD & OPTIONS)
    // ==========================================
    printHeading('METADATA & OPTIONS DISCOVERY METHODS');

    // HEAD /reviews
    const headReviewsRes = await apiCall('HEAD', '/reviews');
    assertStatus('HEAD /reviews - Read metadata headers only', headReviewsRes, 200);

    // OPTIONS /reviews
    const optionsReviewsRes = await apiCall('OPTIONS', '/reviews');
    const isOptionsPassed = optionsReviewsRes.status === 200 || optionsReviewsRes.status === 204;
    if (isOptionsPassed) {
        console.log(`✅ [PASS] OPTIONS /reviews - Discover allowed request methods (Status: ${optionsReviewsRes.status})`);
    } else {
        console.log(`❌ [FAIL] OPTIONS /reviews - Discover allowed request methods (Expected: 200 or 204, Got: ${optionsReviewsRes.status})`);
    }


    // ==========================================
    // GROUP 11: BULK LOAD & SYSTEM CLEANUP
    // ==========================================
    printHeading('SYSTEM CLEANUP & HOUSEKEEPING');

    // POST /import/json (Bulk Upload)
    const importRes = await apiCall('POST', '/import/json', {
        reviews: [
            {
                reviewID: 'R99BULKIMPORT01',
                name: 'Antigravity Bulk Loader',
                date: '2025-12-25',
                verifiedPurchase: true,
                rating: 5,
                title: 'Bulk item',
                review: 'Nice item review here',
                country: 'United States'
            }
        ]
    });
    assertStatus('POST /import/json - Bulk import list reviews', importRes, 200);

    // Clean up created reviews
    const deleteRes = await apiCall('DELETE', `/reviews/${testReviewID}`);
    assertStatus('DELETE /reviews/:reviewID - Delete test review', deleteRes, 200);

    const deleteBulkRes = await apiCall('DELETE', '/reviews/R99BULKIMPORT01');
    assertStatus('DELETE /reviews/:reviewID - Delete test bulk review', deleteBulkRes, 200);

    // DELETE /auth/account (Unregister test account)
    const delAccountRes = await apiCall('DELETE', '/auth/account', null, { 'Authorization': `Bearer ${jwtAccessToken}` });
    assertStatus('DELETE /auth/account - Delete registered test user account', delAccountRes, 200);

    console.log('\n======================================================');
    console.log('🎉 COMPREHENSIVE BACKEND API INTEGRATION SUITE FINISHED!');
    console.log('======================================================\n');
};

runAllTests();
