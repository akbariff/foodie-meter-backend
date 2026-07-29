const swaggerJsdoc = require('swagger-jsdoc');
const env = require('../config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Foodie Meter API',
      version: '1.0.0',
      description: 'Backend API for the Foodie Meter school project: auth, profile, daily calorie intake, and recipes.',
    },
    servers: [{ url: `http://localhost:${env.port}`, description: 'Local dev' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.js'],
};

module.exports = swaggerJsdoc(options);
