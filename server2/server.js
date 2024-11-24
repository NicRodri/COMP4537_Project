// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const { setCorsMiddleware } = require('./modules/utils');
const authRoutes = require('./authRoutes');
const swaggerDocs = require('./documentation/swagger');

const initializeDB = require('./modules/connection');
initializeDB();

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(setCorsMiddleware);

// Routes
app.use('/api/v1', authRoutes);

// Swagger documentation route
app.use('/COMP4537/project/api-docs', swaggerDocs.serve, swaggerDocs.setup);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});