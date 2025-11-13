# Mini App Store Backend

A full-featured backend for a Mini App Store built with Node.js, Express, and Supabase. This project provides a complete API for user authentication, app management, and admin functionalities.

## Features

- **User Authentication**: Register, login, and manage user accounts with JWT
- **Role-Based Access Control**: Users, Developers, and Admin roles
- **App Management**: Upload, update, and manage applications
- **Reviews & Ratings**: Users can rate and review apps
- **Search & Filtering**: Advanced search with filters and pagination
- **Admin Dashboard**: Comprehensive admin panel for platform management
- **File Uploads**: Secure file storage for APKs and images
- **API Documentation**: Auto-generated with Swagger/OpenAPI

## Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT, Supabase Auth
- **File Storage**: Supabase Storage
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Linting/Formatting**: ESLint, Prettier

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Environment variables (see `.env.example`)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/mini-app-store-backend.git
cd mini-app-store-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory and add the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# File Uploads
MAX_FILE_UPLOAD=10000000 # 10MB
FILE_UPLOAD_PATH=./public/uploads

# Email Configuration (for future use)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=no-reply@miniappstore.com
FROM_NAME="Mini App Store"
```

### 4. Set up Supabase

1. Create a new project in [Supabase](https://supabase.com/)
2. Run the SQL scripts from `database/schema.sql` in the Supabase SQL editor
3. Set up storage buckets for app files, icons, and screenshots

### 5. Start the development server

```bash
npm run dev
```

The server will start on `http://localhost:5000` by default.

### 6. Access API Documentation

Visit `http://localhost:5000/api-docs` to view the interactive API documentation.

## Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── app.js            # Express app configuration
│   └── server.js         # Server entry point
├── .env.example          # Example environment variables
├── .eslintrc.js          # ESLint configuration
├── .prettierrc           # Prettier configuration
├── package.json
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `POST /api/auth/forgotpassword` - Forgot password
- `PUT /api/auth/resetpassword/:resettoken` - Reset password
- `GET /api/auth/logout` - Logout user

### Apps

- `GET /api/apps` - Get all apps
- `GET /api/apps/:id` - Get single app
- `GET /api/apps/category/:category` - Get apps by category
- `GET /api/apps/search` - Search apps
- `GET /api/apps/top` - Get top rated apps
- `GET /api/apps/new` - Get new releases

### Developer

- `GET /api/developer/apps` - Get developer's apps
- `POST /api/developer/apps/upload` - Upload new app
- `PUT /api/developer/apps/:id` - Update app
- `DELETE /api/developer/apps/:id` - Delete app
- `PUT /api/developer/apps/:id/icon` - Upload app icon
- `PUT /api/developer/apps/:id/screenshots` - Upload app screenshots
- `GET /api/developer/analytics/:appId` - Get app analytics
- `GET /api/developer/dashboard` - Get developer dashboard

### Admin

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get single user
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/apps/pending` - Get pending apps
- `PUT /api/admin/apps/:id/status` - Update app status
- `GET /api/admin/analytics` - Get platform analytics
- `GET /api/admin/activities` - Get recent activities

## Database Schema

### Users
- id (uuid)
- name (string)
- email (string, unique)
- password (string, hashed)
- role (enum: 'user', 'developer', 'admin')
- status (enum: 'active', 'suspended', 'banned')
- avatar_url (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### Apps
- id (uuid)
- name (string)
- description (text)
- short_description (string)
- version (string)
- package_name (string)
- category (string)
- icon_url (string)
- screenshots (text[])
- file_path (string)
- download_url (string)
- file_size (integer)
- downloads (integer, default: 0)
- average_rating (float, default: 0)
- review_count (integer, default: 0)
- status (enum: 'pending', 'published', 'rejected', 'suspended')
- rejection_reason (text, nullable)
- developer_id (uuid, foreign key to users.id)
- created_at (timestamp)
- updated_at (timestamp)
- reviewed_at (timestamp, nullable)
- reviewed_by (uuid, nullable, foreign key to users.id)

### Reviews
- id (uuid)
- rating (integer, 1-5)
- comment (text, nullable)
- user_id (uuid, foreign key to users.id)
- app_id (uuid, foreign key to apps.id)
- created_at (timestamp)
- updated_at (timestamp)

### Downloads
- id (uuid)
- user_id (uuid, foreign key to users.id)
- app_id (uuid, foreign key to apps.id)
- downloaded_at (timestamp)
- ip_address (string, nullable)
- user_agent (string, nullable)

## Testing

Run tests with:

```bash
npm test
```

## Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

## Deployment

### Production

1. Set `NODE_ENV=production` in your environment variables
2. Install production dependencies:
   ```bash
   npm install --production
   ```
3. Start the server:
   ```bash
   npm start
   ```

### PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name "mini-app-store"

# View logs
pm2 logs mini-app-store

# Restart application
pm2 restart mini-app-store

# Stop application
pm2 stop mini-app-store

# Delete application
pm2 delete mini-app-store
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Application environment | development |
| PORT | Port to run the server | 5000 |
| SUPABASE_URL | Supabase project URL | - |
| SUPABASE_ANON_KEY | Supabase anonymous key | - |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | - |
| JWT_SECRET | Secret for JWT | - |
| JWT_EXPIRE | JWT expiration time | 30d |
| JWT_COOKIE_EXPIRE | Cookie expiration in days | 30 |
| MAX_FILE_UPLOAD | Maximum file upload size in bytes | 10000000 (10MB) |
| FILE_UPLOAD_PATH | Path to store uploaded files | ./public/uploads |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [Supabase](https://supabase.com/)
- [JWT](https://jwt.io/)
- [Swagger](https://swagger.io/)

## Support

For support, please open an issue in the GitHub repository.
