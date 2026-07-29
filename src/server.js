const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Foodie Meter API listening on http://localhost:${env.port}`);
  console.log(`API docs: http://localhost:${env.port}/api/docs`);
});
