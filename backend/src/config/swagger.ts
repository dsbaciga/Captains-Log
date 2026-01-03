import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "Captain's Log API Documentation",
      version: '1.0.0',
      description: 'API documentation for Travel Life travel documentation application',
      contact: {
        name: 'API Support',
        url: 'https://github.com/dsbac/Captains-Log',
      },
    },
    servers: [
      {
        url: config.baseUrl,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/types/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Application) {
  // Type assertion to work around Express type conflicts
  app.use('/api-docs', ...(swaggerUi.serve as any[]));
  app.get('/api-docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }) as any);

  console.log(`Swagger documentation available at ${config.baseUrl}/api-docs`);
}

