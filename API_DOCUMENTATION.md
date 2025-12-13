# Mini App Store Backend - API Documentation

Base URL: `http://localhost:5000/api`

## Table of Contents
- [Authentication](#authentication)
- [Apps](#apps)
- [User](#user)
  - [Profile & Downloads](#get-user-profile)
  - [Wishlist Management](#add-app-to-wishlist)
  - [Review Management](#update-users-review)
  - [Notifications](#get-user-notifications)
- [Developer](#developer)
- [Analytics](#analytics)
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

### Add App to Wishlist

**Endpoint:** `POST /api/user/wishlist/:appId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `appId` (integer) - The ID of the app to add to wishlist

**Response (201):**
```json
{
  "success": true,
  "message": "Amazing Game added to wishlist",
  "data": {
    "id": 1,
    "user_id": "uuid",
    "app_id": 123,
    "added_at": "2025-12-13T05:00:00.000Z"
  }
}
```

**Error Responses:**
- `404` - App not found
- `400` - App already in wishlist

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/user/wishlist/123 \
  -H "Authorization: Bearer {access_token}"
```

---

### Remove App from Wishlist

**Endpoint:** `DELETE /api/user/wishlist/:appId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `appId` (integer) - The ID of the app to remove from wishlist

**Response (200):**
```json
{
  "success": true,
  "message": "App removed from wishlist",
  "data": {}
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/user/wishlist/123 \
  -H "Authorization: Bearer {access_token}"
```

---

### Get User's Wishlist

**Endpoint:** `GET /api/user/wishlist`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "pagination": {
    "next": { "page": 2, "limit": 20 },
    "prev": { "page": 1, "limit": 20 },
    "total": 25,
    "totalPages": 2,
    "currentPage": 1
  },
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "app_id": 123,
      "added_at": "2025-12-13T05:00:00.000Z",
      "apps": {
        "id": 123,
        "name": "Amazing Game",
        "icon_url": "https://...",
        "category": "Games",
        "average_rating": 4.5,
        "price": 0,
        "status": "published",
        "downloads": 10000,
        "review_count": 150
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/user/wishlist?page=1&limit=20" \
  -H "Authorization: Bearer {access_token}"
```

---

### Check if App is in Wishlist

**Endpoint:** `GET /api/user/wishlist/check/:appId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `appId` (integer) - The ID of the app to check

**Response (200):**
```json
{
  "success": true,
  "data": {
    "inWishlist": true,
    "wishlistItem": {
      "id": 1,
      "user_id": "uuid",
      "app_id": 123,
      "added_at": "2025-12-13T05:00:00.000Z"
    }
  }
}
```

**When not in wishlist:**
```json
{
  "success": true,
  "data": {
    "inWishlist": false,
    "wishlistItem": null
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/user/wishlist/check/123 \
  -H "Authorization: Bearer {access_token}"
```

---

### Create App Review

**Endpoint:** `POST /api/apps/:id/reviews`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `id` (uuid) - The ID of the app to review

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Great app! Very useful and well-designed."
}
```

**Validation:**
- `rating` is required and must be between 1 and 5
- `comment` is optional but recommended
- User must have downloaded the app before reviewing
- User can only submit one review per app

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "app_id": "uuid",
    "user_id": "uuid",
    "rating": 5,
    "comment": "Great app! Very useful and well-designed.",
    "created_at": "2025-12-13T05:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - User must download the app before reviewing
- `400` - User has already reviewed this app
- `400` - Invalid rating value

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/apps/123/reviews \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Great app!"
  }'
```

---

### Update User's Review

**Endpoint:** `PUT /api/user/reviews/:reviewId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `reviewId` (integer) - The ID of the review to update

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated review comment - great app with minor issues"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "id": 1,
    "app_id": 123,
    "user_id": "uuid",
    "rating": 4,
    "comment": "Updated review comment - great app with minor issues",
    "created_at": "2025-12-01T10:00:00.000Z",
    "updated_at": "2025-12-13T05:00:00.000Z",
    "helpful_count": 5
  }
}
```

**Error Responses:**
- `400` - Invalid rating (must be 1-5)
- `404` - Review not found or doesn't belong to user

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/user/reviews/1 \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "comment": "Updated review comment"
  }'
```

---

### Delete User's Review

**Endpoint:** `DELETE /api/user/reviews/:reviewId`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `reviewId` (integer) - The ID of the review to delete

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {}
}
```

**Error Responses:**
- `404` - Review not found or doesn't belong to user

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/user/reviews/1 \
  -H "Authorization: Bearer {access_token}"
```

---

### Get User's Reviews

**Endpoint:** `GET /api/user/reviews`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "pagination": {
    "total": 15,
    "totalPages": 2,
    "currentPage": 1,
    "next": { "page": 2, "limit": 10 }
  },
  "data": [
    {
      "id": 1,
      "app_id": 123,
      "user_id": "uuid",
      "rating": 5,
      "comment": "Great app!",
      "created_at": "2025-12-10T10:00:00.000Z",
      "updated_at": "2025-12-10T10:00:00.000Z",
      "helpful_count": 10,
      "apps": {
        "id": 123,
        "name": "Amazing Game",
        "icon_url": "https://...",
        "category": "Games"
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/user/reviews?page=1&limit=10" \
  -H "Authorization: Bearer {access_token}"
```

---

### Mark Review as Helpful

**Endpoint:** `POST /api/user/reviews/:reviewId/helpful`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `reviewId` (integer) - The ID of the review to mark as helpful

**Note:** This endpoint acts as a toggle. If already marked, it will remove the mark.

**Response (200) - Marked as helpful:**
```json
{
  "success": true,
  "message": "Review marked as helpful",
  "data": {
    "isHelpful": true,
    "helpfulCount": 15
  }
}
```

**Response (200) - Removed helpful mark:**
```json
{
  "success": true,
  "message": "Helpful mark removed",
  "data": {
    "isHelpful": false,
    "helpfulCount": 14
  }
}
```

**Error Responses:**
- `404` - Review not found

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/user/reviews/1/helpful \
  -H "Authorization: Bearer {access_token}"
```

---

### Report Review

**Endpoint:** `POST /api/user/reviews/:reviewId/report`  
**Access:** Private

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `reviewId` (integer) - The ID of the review to report

**Request Body:**
```json
{
  "reason": "Spam or inappropriate content"
}
```

**Common Report Reasons:**
- "Spam or inappropriate content"
- "Offensive language"
- "False or misleading information"
- "Irrelevant to the app"
- "Hate speech or harassment"

**Response (201):**
```json
{
  "success": true,
  "message": "Review reported successfully. Our team will review it.",
  "data": {
    "id": 1,
    "review_id": 123,
    "reported_by": "uuid",
    "reason": "Spam or inappropriate content",
    "status": "pending",
    "created_at": "2025-12-13T05:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing reason or already reported
- `404` - Review not found

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/user/reviews/123/report \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Spam or inappropriate content"
  }'
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

## Analytics

Base path: `/api/developers/analytics`

All analytics endpoints require authentication with `developer` or `admin` role.

### Get App Analytics

Get comprehensive analytics for a specific app including performance metrics, downloads over time, and revenue data.

**Endpoint:** `GET /api/developers/analytics/app/:appId`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `appId` (uuid) - ID of the app

**Query Parameters:**
- `period` (number, optional, default: 30) - Number of days to fetch data for

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appName": "My Awesome App",
    "performance": {
      "totalDownloads": 1200,
      "activeUsers30d": 890,
      "retentionRate": 68.0,
      "crashRate": 0.2
    },
    "revenue": {
      "total": "125.50",
      "thisMonth": "45.20"
    },
    "downloadsOverTime": [
      {
        "date": "2025-01-15",
        "downloads": 45,
        "views": 120,
        "revenue": "5.50"
      },
      {
        "date": "2025-01-16",
        "downloads": 52,
        "views": 135,
        "revenue": "6.20"
      }
    ],
    "metadata": {
      "views": 5000,
      "rating": "4.5",
      "reviewCount": 230,
      "createdAt": "2024-12-01T00:00:00Z"
    }
  }
}
```

**Response Fields:**
- `appName` - Name of the app
- `performance` - Key performance metrics
  - `totalDownloads` - Total number of downloads
  - `activeUsers30d` - Number of unique active users in the last 30 days
  - `retentionRate` - Percentage of downloaders who are still active (0-100)
  - `crashRate` - Percentage of sessions that resulted in crashes (0-100)
- `revenue` - Revenue information
  - `total` - Total revenue from all time
  - `thisMonth` - Revenue in the current month
- `downloadsOverTime` - Array of daily statistics for the specified period
- `metadata` - Additional app information (views, rating, reviews, creation date)

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/developers/analytics/app/550e8400-e29b-41d4-a716-446655440000?period=30" \
  -H "Authorization: Bearer {access_token}"
```

**Error Responses:**
- `403 Forbidden` - User is not the owner of the app
- `404 Not Found` - App not found

---

### Get Developer Analytics Overview

Get analytics overview for all apps owned by the developer. Includes aggregate metrics and top performing apps.

**Endpoint:** `GET /api/developers/analytics/overview`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (number, optional, default: 30) - Number of days to fetch data for

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalApps": 5,
    "totalDownloads": 5000,
    "totalRevenue": "500.50",
    "averageRating": "4.3",
    "apps": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "My App 1",
        "downloads": 1200,
        "periodDownloads": 350,
        "rating": "4.5",
        "reviewCount": 230,
        "status": "published",
        "createdAt": "2024-12-01T00:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "My App 2",
        "downloads": 900,
        "periodDownloads": 280,
        "rating": "4.2",
        "reviewCount": 180,
        "status": "published",
        "createdAt": "2024-11-15T00:00:00Z"
      }
    ]
  }
}
```

**Response Fields:**
- `totalApps` - Total number of apps owned by developer
- `totalDownloads` - Sum of all downloads across all apps
- `totalRevenue` - Total revenue across all apps
- `averageRating` - Average rating across all apps (0-5)
- `apps` - Array of top 10 apps (sorted by downloads)
  - `periodDownloads` - Downloads in the specified period

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/developers/analytics/overview?period=30" \
  -H "Authorization: Bearer {access_token}"
```

---

### Get Revenue Analytics

Get detailed revenue breakdown and trends. Can be filtered by specific app or view all apps.

**Endpoint:** `GET /api/developers/analytics/revenue`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `period` (number, optional, default: 30) - Number of days to fetch data for
- `appId` (uuid, optional) - Filter by specific app

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": "125.50",
    "breakdown": [
      {
        "appName": "My App 1",
        "revenue": "75.50"
      },
      {
        "appName": "My App 2",
        "revenue": "50.00"
      }
    ],
    "trend": [
      {
        "date": "2025-01-15",
        "revenue": "5.50"
      },
      {
        "date": "2025-01-16",
        "revenue": "6.20"
      }
    ]
  }
}
```

**Response Fields:**
- `total` - Total revenue for the period
- `breakdown` - Revenue breakdown by app
- `trend` - Daily revenue trend

**cURL Example:**
```bash
# All apps
curl -X GET "http://localhost:5000/api/developers/analytics/revenue?period=30" \
  -H "Authorization: Bearer {access_token}"

# Specific app
curl -X GET "http://localhost:5000/api/developers/analytics/revenue?period=30&appId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {access_token}"
```

---

### Report App Usage

Endpoint for mobile apps to report usage data including sessions, crashes, and usage time. This data is used to calculate active users and crash rates.

**Endpoint:** `POST /api/developers/analytics/usage`  
**Access:** Private (Any authenticated user)

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "app_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "session_started": true,
  "crash_occurred": false,
  "usage_minutes": 15
}
```

**Request Fields:**
- `app_id` (uuid, required) - ID of the app
- `user_id` (uuid, required) - ID of the user
- `session_started` (boolean, optional, default: false) - Whether a new session started
- `crash_occurred` (boolean, optional, default: false) - Whether a crash occurred
- `usage_minutes` (number, optional, default: 0) - Number of minutes the app was used

**Response (200):**
```json
{
  "success": true,
  "message": "Usage data recorded successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/developers/analytics/usage \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "660e8400-e29b-41d4-a716-446655440001",
    "session_started": true,
    "crash_occurred": false,
    "usage_minutes": 5
  }'
```

**Usage Notes:**
- Call this endpoint when:
  - User opens the app (`session_started: true`)
  - App crashes (`crash_occurred: true`)
  - Periodically to report usage time (e.g., every 5 minutes)
- Data is automatically aggregated for analytics dashboards
- Creates or updates daily usage records per user per app

**Error Responses:**
- `400 Bad Request` - Missing required fields (app_id or user_id)
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Error recording usage data

---

### Analytics Metrics Explained

#### Retention Rate
The percentage of users who downloaded the app and are still actively using it.

**Formula:**
```
(Active Users in Last 30 Days / Total Unique Downloaders) × 100
```

**Example:**
- Total downloaders: 1000
- Active users (30d): 680
- Retention rate: 68%

#### Crash Rate
The percentage of app sessions that resulted in a crash.

**Formula:**
```
(Total Crashes / Total Sessions) × 100
```

**Example:**
- Total sessions: 10,000
- Total crashes: 20
- Crash rate: 0.2%

#### Active Users (30d)
The number of unique users who have used the app in the last 30 days. A user is considered active if they have any usage activity (session, crash, or usage time) in the period.

---

### Get Recent Activity

Get recent activity (downloads and reviews) across all developer's apps in chronological order.

**Endpoint:** `GET /api/developers/recent-activity`  
**Access:** Private (Developer/Admin)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `limit` (number, optional, default: 20) - Number of activities to return
- `type` (string, optional) - Filter by activity type: `downloads`, `reviews`, or `all` (default)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "type": "download",
        "app_id": "uuid",
        "app_name": "My Awesome App",
        "app_icon": "https://...",
        "user_id": "uuid",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "version": "1.0.0",
        "timestamp": "2025-01-16T10:30:00Z",
        "created_at": "2025-01-16T10:30:00Z"
      },
      {
        "id": "uuid",
        "type": "review",
        "app_id": "uuid",
        "app_name": "My Awesome App",
        "app_icon": "https://...",
        "user_id": "uuid",
        "user_name": "Jane Smith",
        "user_email": "jane@example.com",
        "rating": 5,
        "comment": "Great app!",
        "timestamp": "2025-01-16T09:15:00Z",
        "created_at": "2025-01-16T09:15:00Z",
        "updated_at": "2025-01-16T09:15:00Z"
      }
    ],
    "total": 20,
    "filter": "all"
  }
}
```

**Response Fields:**
- `activities` - Array of activity objects sorted by timestamp (most recent first)
- `total` - Number of activities returned
- `filter` - The applied filter type

**Activity Types:**

**Download Activity:**
- `type` - Always `"download"`
- `version` - Version of the app that was downloaded
- `timestamp` - When the download occurred

**Review Activity:**
- `type` - Always `"review"`
- `rating` - Rating from 1-5 stars
- `comment` - Optional review comment
- `timestamp` - When the review was created
- `updated_at` - When the review was last updated

**cURL Examples:**
```bash
# Get all recent activities (downloads and reviews)
curl -X GET "http://localhost:5000/api/developers/recent-activity?limit=20" \
  -H "Authorization: Bearer {access_token}"

# Get only downloads
curl -X GET "http://localhost:5000/api/developers/recent-activity?type=downloads&limit=10" \
  -H "Authorization: Bearer {access_token}"

# Get only reviews
curl -X GET "http://localhost:5000/api/developers/recent-activity?type=reviews&limit=15" \
  -H "Authorization: Bearer {access_token}"
```

**Use Cases:**
- Display recent activity feed in developer dashboard
- Monitor download trends across all apps
- Track incoming reviews in real-time
- Identify active users and engagement patterns

**Notes:**
- Activities are automatically logged when users download apps or submit reviews
- Download data comes from the `downloads` table with `downloaded_at` timestamp
- Review data comes from the `reviews` table with `created_at` timestamp
- Only non-flagged reviews are included
- Results are sorted by most recent activity first

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
