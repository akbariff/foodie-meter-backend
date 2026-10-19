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
const recipeReviewsRoutes = require('./modules/recipeReviews/recipeReviews.routes');
const nutritionistRecipesRoutes = require('./modules/nutritionistRecipes/nutritionistRecipes.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');
const aiMealsRoutes = require('./modules/aiMeals/aiMeals.routes');
const recommendationsRoutes = require('./modules/aiMeals/recommendations.routes');

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
app.use('/api/recipes', recipeReviewsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/nutritionist-recipes', nutritionistRecipesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/ai-meals', aiMealsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
