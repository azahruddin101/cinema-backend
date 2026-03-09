# Cinema MIS Backend

A Node.js backend using ES Modules that collects MIS dashboard data from an external reporting system and exposes APIs for a frontend analytics dashboard.

## Features

- **Authentication System:** JWT access & refresh tokens, password hashing with bcrypt, role-based access control.
- **MIS Data Scraper:** Scrapes HTML tables from an external MIS endpoint using Axios and Cheerio.
- **Automated Collection:** Node-cron jobs for daily scraping and a backfill API for historical data.
- **Date Range Logic:** Automatically adjusts exclusive end dates for the upstream MIS API.
- **Analytics Dashboard APIs:** Provides summary stats, screen-wise performance, and daily trends.
- **Database:** MongoDB with Mongoose, structured schemas.
- **Security:** Helmet, express-rate-limit, express-validator, morgan logging, centralized error handling.
- **API Documentation:** Swagger UI.

## Requirements

- Node.js (v18+)
- MongoDB (running locally or via Atlas)

## Setup & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory (you can copy `.env.example`) and fill in your details:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/cinema_mis
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   MIS_BASE_URL=http://your-mis-server.com/SRSMIS
   SCRAPER_DELAY_MS=3000
   CORS_ORIGIN=http://localhost:3000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   ```

3. **Seed Initial Admin User:**
   ```bash
   npm run seed
   ```
   Admin credentials:
   - Email: `admin@cinema.com`
   - Password: `admin123`

4. **Run the Server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## Documentation

Once the server is running, visit:
[http://localhost:5000/api/docs](http://localhost:5000/api/docs)

This provides interactive Swagger API documentation for all available endpoints.

## Folder Structure

\`\`\`
src
 ├── config
 │    ├── database.js
 │    └── swagger.js
 │
 ├── modules
 │    ├── auth
 │    ├── dashboard
 │    ├── reports
 │    └── scraper
 │
 ├── models
 │    ├── user.model.js
 │    └── report.model.js
 │
 ├── middleware
 │    ├── auth.middleware.js
 │    ├── error.middleware.js
 │    └── validate.middleware.js
 │
 ├── utils
 │    ├── date.utils.js
 │    └── parser.utils.js
 │
 ├── scripts
 │    └── seed.js
 │
 ├── app.js
 └── server.js
\`\`\`
