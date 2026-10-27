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
const aiMealsRoutes = require('./modules/aiMeals/aiMeals.routes');
const recommendationsRoutes = require('./modules/aiMeals/recommendations.routes');
const gamificationRoutes = require('./modules/gamification/gamification.routes');
const userProfileRoutes = require('./modules/userProfile/userProfile.routes');
const recipeReviewsRoutes = require('./modules/recipeReviews/recipeReviews.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const nutritionistApplicationsRoutes = require('./modules/nutritionistApplications/nutritionistApplications.routes');
const nutritionCategoriesRoutes = require('./modules/nutritionContent/categories.routes');
const nutritionContentsRoutes = require('./modules/nutritionContent/content.routes');
const recipeModerationRoutes = require('./modules/recipeModeration/recipeModeration.routes');
const weightLogRoutes = require('./modules/weightLog/weightLog.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');

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
app.use('/api/ai-meals', aiMealsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/profile', userProfileRoutes);
app.use('/api/recipe-reviews', recipeReviewsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/nutritionist-applications', nutritionistApplicationsRoutes);
app.use('/api/nutrition-categories', nutritionCategoriesRoutes);
app.use('/api/nutrition-contents', nutritionContentsRoutes);
app.use('/api/recipe-moderation', recipeModerationRoutes);
app.use('/api/weight-log', weightLogRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
