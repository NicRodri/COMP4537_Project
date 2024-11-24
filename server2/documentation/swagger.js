// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Authentication and Management API',
      version: '1.0.0',
      description: 'API documentation for user authentication, management, and image processing system',
      contact: {
        name: 'API Support',
        email: 'homura@homura.ca'
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Development server'
      },
      {
        url: 'https://homura.ca/COMP4537/project',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'authToken'
        }
      }
    }
  },
  apis: [path.resolve(__dirname, '../authRoutes.js')], // Resolve relative to the current file
};

// Log the API file paths
console.log('Swagger API files:', options.apis.map(file => path.resolve(file)));

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      //basePath: '/COMP4537/project/api-docs', // Explicitly set base path
    }
  })
};
