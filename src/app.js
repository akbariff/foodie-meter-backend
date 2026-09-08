const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const authRateLimit = require('./middleware/authRateLimit');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const calorieGoalRoutes = require('./modules/calorieGoal/calorieGoal.routes');
const calorieIntakeRoutes = require('./modules/calorieIntake/calorieIntake.routes');
const recipesRoutes = require('./modules/recipes/recipes.routes');
const nutritionistRecipesRoutes = require('./modules/nutritionistRecipes/nutritionistRecipes.routes');
const reviewsRoutes = require('./modules/reviews/reviews.routes');
const nutritionistApplicationsRoutes = require('./modules/nutritionistApplications/nutritionistApplications.routes');
const siteContentRoutes = require('./modules/siteContent/siteContent.routes');
const adminUsersRoutes = require('./modules/admin/adminUsers.routes');
const adminApplicationsRoutes = require('./modules/admin/adminApplications.routes');
const adminReviewsRoutes = require('./modules/admin/adminReviews.routes');
const adminAnalyticsRoutes = require('./modules/admin/adminAnalytics.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/calorie-goal', calorieGoalRoutes);
app.use('/api/calorie-intake', calorieIntakeRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/nutritionist-recipes', nutritionistRecipesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/nutritionist-applications', nutritionistApplicationsRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/nutritionist-applications', adminApplicationsRoutes);
app.use('/api/admin/reviews', adminReviewsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
