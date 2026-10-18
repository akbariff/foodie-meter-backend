const app = require('./app');
const env = require('./config/env');
const { recoverJobs } = require('./modules/aiMeals/aiMeals.service');

recoverJobs().then(() => {
  app.listen(env.port, () => {
    console.log(`Foodie Meter API listening on http://localhost:${env.port}`);
    console.log(`API docs: http://localhost:${env.port}/api/docs`);
  });
}).catch(error => {
  console.error('Could not connect to the database:', error);
  process.exitCode = 1;
});
