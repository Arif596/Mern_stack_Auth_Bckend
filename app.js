const express = require("express");
require('dotenv').config({ path: './config.env' });
const cookieParser = require("cookie-parser");
const connectionDb = require('./Database/dbConnection');
const cors = require('cors');
const { errorMiddleware } = require("./Middleware/ErrorMiddleware");
const UserRouter=require('./Routes/UserRoutes');
const removeUnverifiedUse = require("./Automation/RemoveUnverifiedUser");
const path = require("path");
const app = express();
removeUnverifiedUse()
// Database connection
connectionDb();

// Middlewares
app.use(cors({
    origin: [process.env.FRONTEND_URL],
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send('API is running');
});
app.use('/api/v1/user', UserRouter);
app.use('/uploads', express.static(path.join(__dirname, "uploads")));
app.use(errorMiddleware);

module.exports = app;
