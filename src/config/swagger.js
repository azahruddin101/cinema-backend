import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Cinema MIS Dashboard API',
            version: '1.0.0',
            description:
                'Backend API for Cinema MIS Dashboard – scrapes MIS reports, stores analytics data, and exposes RESTful endpoints for a frontend analytics dashboard.',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5000}`,
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
            schemas: {
                Film: {
                    type: 'object',
                    properties: {
                        film: { type: 'string', example: 'THE KERALA STORY 2 : GOES BEYOND' },
                        shows: { type: 'number', example: 4 },
                        ticketsSold: { type: 'number', example: 132 },
                        grossAmount: { type: 'number', example: 12872 },
                        netAmount: { type: 'number', example: 10896 },
                        occupancyPercent: { type: 'number', example: 23.23 },
                    },
                },
                Screen: {
                    type: 'object',
                    properties: {
                        screen: { type: 'string', example: 'AUDI 1' },
                        shows: { type: 'number', example: 6 },
                        ticketsSold: { type: 'number', example: 250 },
                        grossAmount: { type: 'number', example: 11000.50 },
                        netAmount: { type: 'number', example: 9800.00 },
                    },
                },
                Concession: {
                    type: 'object',
                    properties: {
                        itemClass: { type: 'string', example: 'COMBO' },
                        transCount: { type: 'number', example: 15 },
                        qtySold: { type: 'number', example: 21 },
                        saleValue: { type: 'number', example: 2414.00 },
                        percentage: { type: 'number', example: 33.16 },
                    },
                },
                DailyReport: {
                    type: 'object',
                    properties: {
                        date: { type: 'string', example: '2026-03-05' },
                        films: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Film' },
                        },
                        screens: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Screen' },
                        },
                        concessions: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Concession' },
                        },
                        totals: {
                            type: 'object',
                            properties: {
                                shows: { type: 'number', example: 10 },
                                ticketsSold: { type: 'number', example: 288 },
                                grossAmount: { type: 'number', example: 28230.00 },
                                netAmount: { type: 'number', example: 23841.60 },
                                avgOccupancy: { type: 'number', example: 9.92 },
                                totalConcessionValue: { type: 'number', example: 6790.00 },
                            },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', example: 'Admin User' },
                        email: { type: 'string', example: 'admin@cinema.com' },
                        role: { type: 'string', enum: ['admin', 'viewer'], example: 'admin' },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'admin@cinema.com' },
                        password: { type: 'string', example: 'password123' },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: { type: 'string', example: 'Admin User' },
                        email: { type: 'string', example: 'admin@cinema.com' },
                        password: { type: 'string', example: 'password123' },
                        role: { type: 'string', enum: ['admin', 'viewer'], example: 'viewer' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                },
                BackfillRequest: {
                    type: 'object',
                    required: ['startDate', 'endDate'],
                    properties: {
                        startDate: { type: 'string', example: '2024-01-01' },
                        endDate: { type: 'string', example: '2024-12-31' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
