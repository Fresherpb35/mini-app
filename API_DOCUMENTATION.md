# Mini App Store Backend - API Documentation

Base URL: `http://localhost:5000/api`

## Table of Contents
- [Authentication](#authentication)
- [Apps](#apps)
- [User](#user)
- [Developer](#developer)
- [Admin](#admin)
- [Notifications](#notifications)

## Common Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {},
  "count": 0,
  "pagination": {}
}
```

## Error Response Format

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication

Base path: `/api/auth`

### Register User

**Endpoint:** `POST /api/auth/register`  
**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "email_confirmed": false
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### Login User

**Endpoint:** `POST /api/auth/login`  
**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar_url": null
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### Get Current User

**Endpoint:** `GET /api/auth/me`  
**Access:** Private  
**Auth Required:** Bearer Token

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "avatar_url": null,
    "bio": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Update User Details

**Endpoint:** `PUT /api/auth/updatedetails`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com",
  "phone": "+1234567890",
  "bio": "Software developer",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "name": "John Smith",
    "email": "johnsmith@example.com",
    "phone": "+1234567890",
    "bio": "Software developer",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

---

### Update Password

**Endpoint:** `PUT /api/auth/updatepassword`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### Upload Avatar

**Endpoint:** `PUT /api/auth/avatar/upload`  
**Access:** Private  
**Content-Type:** multipart/form-data

**Headers:**
```
Authorization: Bearer {access_token}
```

**Form Data:**
- `avatar`: Image file (jpg, png, gif)

**Response (200):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "avatar_url": "https://storage.supabase.co/..."
}
```

---

### Forgot Password

**Endpoint:** `POST /api/auth/forgotpassword`  
**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent. Please check your inbox."
}
```

---

### Reset Password

**Endpoint:** `PUT /api/auth/resetpassword`  
**Access:** Public

**Request Body:**
```json
{
  "access_token": "token_from_email",
  "refresh_token": "refresh_token_from_email",
  "new_password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "session": {
    "access_token": "new_jwt_token",
    "refresh_token": "new_refresh_token"
  }
}
```

---

### Google OAuth Login

**Endpoint:** `POST /api/auth/google` or `GET /api/auth/google`  
**Access:** Public

**Request Body (POST):**
```json
{
  "redirectTo": "http://localhost:3000/auth/callback"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Google OAuth initiated",
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### Send OTP to Email

**Endpoint:** `POST /api/auth/otp/send`  
**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

---

### Verify OTP

**Endpoint:** `POST /api/auth/otp/verify`  
**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_access_token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatar_url": null
  }
}
```

---

### Register with Phone

**Endpoint:** `POST /api/auth/register-phone`  
**Access:** Public

**Request Body:**
```json
{
  "phone": "+1234567890",
  "password": "password123",
  "name": "John Doe",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your phone number.",
  "user": {
    "id": "uuid",
    "phone": "+1234567890",
    "name": "John Doe",
    "role": "user",
    "phone_confirmed": false
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

---

### Login with Phone

**Endpoint:** `POST /api/auth/login-phone`  
**Access:** Public

**Request Body:**
```json
{
  "phone": "+1234567890",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "phone": "+1234567890",
    "name": "John Doe",
    "role": "user"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

---

### Logout

**Endpoint:** `GET /api/auth/logout`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Apps

Base path: `/api/apps`

### Get All Apps

**Endpoint:** `GET /api/apps`  
**Access:** Public

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `category` (string, optional)
- `developerId` (uuid, optional)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "total": 100,
    "totalPages": 10,
    "currentPage": 1,
    "next": {
      "page": 2,
      "limit": 10
    }
  },
  "data": [
    {
      "id": "uuid",
      "name": "Amazing App",
      "description": "Full description",
      "short_description": "Brief description",
      "version": "1.0.0",
      "package_name": "com.example.app",
      "category": "productivity",
      "icon_url": "https://...",
      "screenshots": ["https://..."],
      "file_size": 5242880,
      "downloads": 1000,
      "average_rating": 4.5,
      "review_count": 50,
      "status": "published",
      "developer_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/apps?page=1&limit=10&category=productivity"
```

---

### Get Single App

**Endpoint:** `GET /api/apps/:id`  
**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Amazing App",
    "description": "Full description",
    "short_description": "Brief description",
    "version": "1.0.0",
    "package_name": "com.example.app",
    "category": "productivity",
    "icon_url": "https://...",
    "screenshots": ["https://..."],
    "file_size": 5242880,
    "downloads": 1000,
    "average_rating": 4.5,
    "review_count": 50,
    "status": "published",
    "developer": {
      "id": "uuid",
      "name": "Developer Name",
      "email": "dev@example.com",
      "avatar_url": "https://..."
    }
  }
}
```

---

### Get Top Rated Apps

**Endpoint:** `GET /api/apps/top`  
**Access:** Public

**Query Parameters:**
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

---

### Get New Releases

**Endpoint:** `GET /api/apps/new`  
**Access:** Public

**Query Parameters:**
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

---

### Get Featured Apps

**Endpoint:** `GET /api/apps/featured`  
**Access:** Public

**Query Parameters:**
- `feature_type` (string, optional)
- `is_active` (boolean, optional)

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "app_id": "uuid",
      "feature_type": "banner",
      "is_active": true,
      "sort_order": 1,
      "apps": {
        "id": "uuid",
        "name": "Featured App",
        "icon_url": "https://..."
      }
    }
  ]
}
```

---

### Get Categories

**Endpoint:** `GET /api/apps/categories`  
**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "name": "Productivity",
      "slug": "productivity",
      "icon": "📱"
    }
  ]
}
```

---

### Get Apps by Category

**Endpoint:** `GET /api/apps/category/:category`  
**Access:** Public

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "pagination": {},
  "data": [...]
}
```

---

### Search Apps

**Endpoint:** `GET /api/apps/search`  
**Access:** Public

**Query Parameters:**
- `q` (string) - Search query
- `category` (string, optional)
- `minRating` (number, optional)
- `maxPrice` (number, optional)
- `sortBy` (string, optional) - Values: `relevance`, `newest`, `rating`, `downloads`, `price_asc`, `price_desc`
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "pagination": {},
  "data": [...]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/apps/search?q=photo&category=media&minRating=4&sortBy=rating"
```

---

### Download App

**Endpoint:** `GET /api/apps/:id/download`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.supabase.co/...",
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

---

### Create App Review

**Endpoint:** `POST /api/apps/:id/reviews`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great app!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "app_id": "uuid",
    "user_id": "uuid",
    "rating": 5,
    "comment": "Great app!",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Get App Reviews

**Endpoint:** `GET /api/apps/:id/reviews`  
**Access:** Public

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "pagination": {},
  "data": [
    {
      "id": "uuid",
      "app_id": "uuid",
      "user_id": "uuid",
      "rating": 5,
      "comment": "Great app!",
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

---

### Update Multiple Apps (Admin)

**Endpoint:** `PUT /api/apps/update-multiple`  
**Access:** Private (Admin only)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "updates": [
    {
      "id": "uuid1",
      "status": "published"
    },
    {
      "id": "uuid2",
      "featured": true
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Batch update completed",
  "updatedCount": 2
}
```

---

## User

Base path: `/api/user`

All user endpoints require authentication.

### Get User Profile

**Endpoint:** `GET /api/user/profile`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatar_url": "https://...",
    "stats": {
      "totalDownloads": 15,
      "totalReviews": 5
    }
  }
}
```

---

### Get User Downloads

**Endpoint:** `GET /api/user/downloads`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "uuid",
      "app_id": "uuid",
      "downloaded_at": "2024-01-01T00:00:00Z",
      "version_downloaded": "1.0.0",
      "app": {
        "id": "uuid",
        "name": "Amazing App",
        "icon_url": "https://...",
        "version": "1.2.0"
      }
    }
  ]
}
```

---

### Check for App Updates

**Endpoint:** `GET /api/user/updates`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "app_id": "uuid",
      "app_name": "Amazing App",
      "current_version": "1.0.0",
      "new_version": "1.2.0",
      "update_available": true
    }
  ]
}
```

---

### Update App

**Endpoint:** `POST /api/user/update/:appId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App updated successfully",
  "data": {
    "downloadUrl": "https://...",
    "version": "1.2.0"
  }
}
```

---

### Uninstall App

**Endpoint:** `DELETE /api/user/uninstall/:appId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App uninstalled successfully"
}
```

---

### Get User Notifications

**Endpoint:** `GET /api/user/notifications`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "title": "New App Update Available",
      "message": "Amazing App has a new version",
      "type": "app_update",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Mark Notification as Read

**Endpoint:** `PUT /api/user/notifications/:id/read`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Mark All Notifications as Read

**Endpoint:** `PUT /api/user/notifications/read-all`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## Developer

Base path: `/api/developers`

All developer endpoints require authentication with `developer` or `admin` role.

### Get Developer Dashboard

**Endpoint:** `GET /api/developers/dashboard`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalApps": 10,
    "publishedApps": 8,
    "pendingApps": 2,
    "totalDownloads": 5000,
    "totalRevenue": 1250.50,
    "averageRating": 4.5,
    "recentActivity": []
  }
}
```

---

### Get Developer Apps

**Endpoint:** `GET /api/developers/apps`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "name": "My App",
      "version": "1.0.0",
      "status": "published",
      "downloads": 500,
      "average_rating": 4.5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Upload New App

**Endpoint:** `POST /api/developers/apps/upload`  
**Access:** Private (Developer/Admin)  
**Content-Type:** multipart/form-data

**Headers:**
```
Authorization: Bearer {access_token}
```

**Form Data:**
- `apk`: APK file (required)
- `app_icon`: Icon image file (required)
- `screenshots`: Array of screenshot images (up to 5)
- `name`: App name (string, required)
- `description`: Full description (string, required)
- `short_description`: Brief description (string, required)
- `version`: Version number (string, required)
- `package_name`: Package identifier (string, required)
- `category`: Category (string, required)
- `price`: Price (number, default: 0)

**Response (201):**
```json
{
  "success": true,
  "message": "App uploaded successfully",
  "data": {
    "id": "uuid",
    "name": "My App",
    "version": "1.0.0",
    "status": "pending",
    "icon_url": "https://...",
    "file_path": "path/to/apk"
  }
}
```

---

### Update App

**Endpoint:** `PUT /api/developers/apps/:id`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Updated App Name",
  "description": "Updated description",
  "short_description": "Updated brief",
  "version": "1.1.0",
  "category": "productivity",
  "price": 4.99
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App updated successfully",
  "data": {
    "id": "uuid",
    "name": "Updated App Name",
    "version": "1.1.0"
  }
}
```

---

### Delete App

**Endpoint:** `DELETE /api/developers/apps/:id`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App deleted successfully"
}
```

---

### Upload App Icon

**Endpoint:** `PUT /api/developers/apps/:id/icon`  
**Access:** Private (Developer/Admin)  
**Content-Type:** multipart/form-data

**Headers:**
```
Authorization: Bearer {access_token}
```

**Form Data:**
- `icon`: Icon image file

**Response (200):**
```json
{
  "success": true,
  "message": "App icon updated successfully",
  "icon_url": "https://..."
}
```

---

### Upload App Screenshots

**Endpoint:** `PUT /api/developers/apps/:id/screenshots`  
**Access:** Private (Developer/Admin)  
**Content-Type:** multipart/form-data

**Headers:**
```
Authorization: Bearer {access_token}
```

**Form Data:**
- `screenshots`: Array of screenshot images (up to 5)

**Response (200):**
```json
{
  "success": true,
  "message": "Screenshots uploaded successfully",
  "screenshots": ["https://...", "https://..."]
}
```

---

### Get App Analytics

**Endpoint:** `GET /api/developers/analytics/:appId`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appId": "uuid",
    "totalDownloads": 1000,
    "dailyDownloads": [
      { "date": "2024-01-01", "count": 50 }
    ],
    "averageRating": 4.5,
    "ratingDistribution": {
      "5": 100,
      "4": 50,
      "3": 20,
      "2": 10,
      "1": 5
    },
    "revenue": 250.00
  }
}
```

---

### Send App Notification

**Endpoint:** `POST /api/developers/apps/:appId/notifications`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "title": "New Update Available",
  "message": "Version 2.0 is now live!",
  "type": "app_update"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification sent to all app users",
  "sentCount": 500
}
```

---

## Admin

Base path: `/api/admin`

All admin endpoints require authentication with `admin` role.

### User Management

#### Get All Users

**Endpoint:** `GET /api/admin/users`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `role` (string, optional)
- `status` (string, optional)

**Response (200):**
```json
{
  "success": true,
  "count": 100,
  "pagination": {},
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Get Single User

**Endpoint:** `GET /api/admin/users/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "status": "active",
    "stats": {
      "totalDownloads": 15,
      "totalReviews": 5
    }
  }
}
```

---

#### Create User

**Endpoint:** `POST /api/admin/users`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "developer",
  "status": "active"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "developer"
  }
}
```

---

#### Update User

**Endpoint:** `PUT /api/admin/users/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "role": "admin",
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Smith",
    "role": "admin"
  }
}
```

---

#### Delete User

**Endpoint:** `DELETE /api/admin/users/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

#### Update User Status

**Endpoint:** `PUT /api/admin/users/:id/status`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User status updated",
  "data": {
    "id": "uuid",
    "status": "suspended"
  }
}
```

---

### App Management

#### Get All Apps

**Endpoint:** `GET /api/admin/apps`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string, optional)
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 50,
  "pagination": {},
  "data": [
    {
      "id": "uuid",
      "name": "App Name",
      "status": "published",
      "developer": {
        "id": "uuid",
        "name": "Developer Name"
      }
    }
  ]
}
```

---

#### Get Pending Apps

**Endpoint:** `GET /api/admin/apps/pending`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "name": "Pending App",
      "status": "pending",
      "submitted_at": "2024-01-01T00:00:00Z",
      "developer": {
        "id": "uuid",
        "name": "Developer Name"
      }
    }
  ]
}
```

---

#### Update App Status

**Endpoint:** `PUT /api/admin/apps/:id/status`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "status": "published",
  "rejection_reason": "Optional reason if rejected"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App status updated",
  "data": {
    "id": "uuid",
    "status": "published"
  }
}
```

---

### Featured Apps Management

#### Get Featured Apps

**Endpoint:** `GET /api/admin/featured-apps`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "app_id": "uuid",
      "feature_type": "banner",
      "is_active": true,
      "sort_order": 1
    }
  ]
}
```

---

#### Feature an App

**Endpoint:** `POST /api/admin/featured-apps`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "app_id": "uuid",
  "feature_type": "banner",
  "sort_order": 1,
  "is_active": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "App featured successfully",
  "data": {
    "id": "uuid",
    "app_id": "uuid",
    "feature_type": "banner"
  }
}
```

---

#### Update Featured App

**Endpoint:** `PUT /api/admin/featured-apps/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "feature_type": "carousel",
  "sort_order": 2,
  "is_active": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Featured app updated"
}
```

---

#### Remove Featured App

**Endpoint:** `DELETE /api/admin/featured-apps/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "App removed from featured list"
}
```

---

### Platform Analytics

**Endpoint:** `GET /api/admin/analytics`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalApps": 500,
    "totalDownloads": 50000,
    "totalRevenue": 10000.00,
    "newUsersToday": 50,
    "newAppsToday": 5,
    "downloadsToday": 500
  }
}
```

---

### Recent Activities

**Endpoint:** `GET /api/admin/activities`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id": "uuid",
      "type": "app_published",
      "description": "App 'Amazing App' was published",
      "user_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Categories Management

#### Get All Categories

**Endpoint:** `GET /api/admin/categories`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "name": "Productivity",
      "slug": "productivity",
      "icon": "📱",
      "app_count": 50
    }
  ]
}
```

---

#### Create Category

**Endpoint:** `POST /api/admin/categories`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Education",
  "slug": "education",
  "icon": "📚",
  "description": "Educational apps"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Education",
    "slug": "education"
  }
}
```

---

#### Update Category

**Endpoint:** `PUT /api/admin/categories/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "name": "Education & Learning",
  "icon": "🎓"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully"
}
```

---

#### Delete Category

**Endpoint:** `DELETE /api/admin/categories/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### System Settings

**Endpoint:** `PUT /api/admin/settings`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "maintenance_mode": false,
  "allow_new_registrations": true,
  "max_upload_size": 10485760,
  "featured_apps_limit": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

### Reports

**Endpoint:** `POST /api/admin/reports`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "report_type": "downloads",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "format": "csv"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "download_url": "https://..."
}
```

---

### Backup & Restore

#### Create Backup

**Endpoint:** `POST /api/admin/backup`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "backup_id": "uuid",
  "backup_url": "https://..."
}
```

---

#### List Backups

**Endpoint:** `GET /api/admin/backups`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "size": 5242880,
      "status": "completed"
    }
  ]
}
```

---

#### Restore Backup

**Endpoint:** `POST /api/admin/restore`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "backup_id": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Backup restoration initiated"
}
```

---

### Review Monitoring

#### Get Flagged Reviews

**Endpoint:** `GET /api/admin/reviews/flagged`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "uuid",
      "app_id": "uuid",
      "user_id": "uuid",
      "rating": 1,
      "comment": "Inappropriate content",
      "flagged": true,
      "flag_reason": "spam"
    }
  ]
}
```

---

#### Delete Review

**Endpoint:** `DELETE /api/admin/reviews/:id`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### Admin Notifications

**Endpoint:** `GET /api/admin/notifications`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "uuid",
      "title": "New App Submission",
      "message": "Developer submitted a new app for review",
      "type": "app_submission",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Notifications

Base path: `/api/notifications`

All notification endpoints require admin authentication.

### Send Push Notification

**Endpoint:** `POST /api/notifications/push`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "title": "System Announcement",
  "message": "Platform will be under maintenance",
  "target": "all",
  "user_ids": ["uuid1", "uuid2"],
  "type": "system"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Push notification sent",
  "sentCount": 1000
}
```

---

### Get Notification Stats

**Endpoint:** `GET /api/notifications/stats`  
**Access:** Private (Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSent": 10000,
    "totalRead": 7500,
    "readRate": 0.75,
    "byType": {
      "app_update": 5000,
      "system": 3000,
      "promotion": 2000
    }
  }
}
```

---

## Authentication Flow

### Standard Email/Password Flow

1. **Register**: `POST /api/auth/register` with name, email, password
2. **Verify Email**: User clicks link in email (handled by Supabase)
3. **Login**: `POST /api/auth/login` with email, password
4. **Use Token**: Include `Authorization: Bearer {access_token}` in subsequent requests
5. **Logout**: `GET /api/auth/logout`

### Phone Authentication Flow

1. **Register**: `POST /api/auth/register-phone` with phone, password, name
2. **Verify Phone**: User receives SMS verification (handled by Supabase)
3. **Login**: `POST /api/auth/login-phone` with phone, password

### Google OAuth Flow

1. **Initiate**: `POST /api/auth/google` - Returns OAuth URL
2. **Redirect User**: Frontend redirects to the OAuth URL
3. **Callback**: Supabase handles callback and returns to your redirect URL with tokens

### OTP Email Flow

1. **Send OTP**: `POST /api/auth/otp/send` with email
2. **Verify OTP**: `POST /api/auth/otp/verify` with email and token
3. **Use Token**: Include token in subsequent requests

---

## Rate Limiting

- Public endpoints: 100 requests per 15 minutes per IP
- Authenticated endpoints: 1000 requests per 15 minutes per user
- File upload endpoints: 10 requests per hour per user

---

## File Upload Requirements

### App APK
- Max size: 100MB
- Formats: .apk
- Required fields in multipart form

### App Icon
- Max size: 2MB
- Formats: .jpg, .png, .gif
- Recommended: 512x512px

### Screenshots
- Max size: 5MB each
- Max count: 5 images
- Formats: .jpg, .png
- Recommended: 1080x1920px

### Avatar
- Max size: 2MB
- Formats: .jpg, .png, .gif
- Recommended: 256x256px

---

## Pagination

All paginated endpoints support:
- `page`: Current page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes:
```json
{
  "pagination": {
    "total": 100,
    "totalPages": 10,
    "currentPage": 1,
    "next": { "page": 2, "limit": 10 },
    "prev": null
  }
}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Support

For API support or questions:
- Email: api-support@miniappstore.com
- Documentation: http://localhost:5000/api-docs
- GitHub Issues: [Repository Issues](https://github.com/yourusername/mini-app-store-backend/issues)
