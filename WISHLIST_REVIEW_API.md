# Wishlist & Review API Documentation

## Overview
This document provides comprehensive documentation for the wishlist and review management APIs added to the mini app store backend.

---

## Wishlist APIs

### 1. Add App to Wishlist
Add an app to the user's wishlist.

**Endpoint:** `POST /api/user/wishlist/:appId`  
**Authentication:** Required  
**Parameters:**
- `appId` (path parameter) - The ID of the app to add

**Success Response (201):**
```json
{
  "success": true,
  "message": "App Name added to wishlist",
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
- `500` - Server error

---

### 2. Remove App from Wishlist
Remove an app from the user's wishlist.

**Endpoint:** `DELETE /api/user/wishlist/:appId`  
**Authentication:** Required  
**Parameters:**
- `appId` (path parameter) - The ID of the app to remove

**Success Response (200):**
```json
{
  "success": true,
  "message": "App removed from wishlist",
  "data": {}
}
```

**Error Responses:**
- `500` - Server error

---

### 3. Get User's Wishlist
Retrieve all apps in the user's wishlist with pagination.

**Endpoint:** `GET /api/user/wishlist`  
**Authentication:** Required  
**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Success Response (200):**
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
        "status": "published"
      }
    }
  ]
}
```

---

### 4. Check if App is in Wishlist
Check whether a specific app is in the user's wishlist.

**Endpoint:** `GET /api/user/wishlist/check/:appId`  
**Authentication:** Required  
**Parameters:**
- `appId` (path parameter) - The ID of the app to check

**Success Response (200):**
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

---

## Review Management APIs

### 5. Update User's Review
Update an existing review (rating and/or comment).

**Endpoint:** `PUT /api/user/reviews/:reviewId`  
**Authentication:** Required  
**Parameters:**
- `reviewId` (path parameter) - The ID of the review to update

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated review comment"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "id": 1,
    "app_id": 123,
    "user_id": "uuid",
    "rating": 4,
    "comment": "Updated review comment",
    "created_at": "2025-12-01T10:00:00.000Z",
    "updated_at": "2025-12-13T05:00:00.000Z",
    "helpful_count": 5
  }
}
```

**Error Responses:**
- `400` - Invalid rating (must be 1-5)
- `404` - Review not found or doesn't belong to user
- `500` - Server error

---

### 6. Delete User's Review
Delete a review created by the user.

**Endpoint:** `DELETE /api/user/reviews/:reviewId`  
**Authentication:** Required  
**Parameters:**
- `reviewId` (path parameter) - The ID of the review to delete

**Success Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {}
}
```

**Error Responses:**
- `404` - Review not found or doesn't belong to user
- `500` - Server error

---

### 7. Get User's Reviews
Get all reviews created by the authenticated user with pagination.

**Endpoint:** `GET /api/user/reviews`  
**Authentication:** Required  
**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "pagination": {
    "total": 15,
    "totalPages": 2,
    "currentPage": 1
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

---

### 8. Mark Review as Helpful
Mark or unmark a review as helpful (toggle functionality).

**Endpoint:** `POST /api/user/reviews/:reviewId/helpful`  
**Authentication:** Required  
**Parameters:**
- `reviewId` (path parameter) - The ID of the review to mark

**Success Response (200):**
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

**If already marked (removes the mark):**
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
- `500` - Server error

---

### 9. Report Review
Report a review as inappropriate.

**Endpoint:** `POST /api/user/reviews/:reviewId/report`  
**Authentication:** Required  
**Parameters:**
- `reviewId` (path parameter) - The ID of the review to report

**Request Body:**
```json
{
  "reason": "Spam or inappropriate content"
}
```

**Success Response (201):**
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
- `500` - Server error

---

## Database Schema

### Wishlists Table
```sql
CREATE TABLE wishlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_id)
);
```

### Review Helpful Table
```sql
CREATE TABLE review_helpful (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);
```

### Review Reports Table
```sql
CREATE TABLE review_reports (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Reviews Table (Updated)
```sql
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

---

## Usage Examples

### JavaScript/Axios Example

#### Adding to Wishlist
```javascript
const addToWishlist = async (appId) => {
  try {
    const response = await axios.post(
      `/api/user/wishlist/${appId}`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

#### Updating a Review
```javascript
const updateReview = async (reviewId, rating, comment) => {
  try {
    const response = await axios.put(
      `/api/user/reviews/${reviewId}`,
      { rating, comment },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

#### Marking Review as Helpful
```javascript
const markHelpful = async (reviewId) => {
  try {
    const response = await axios.post(
      `/api/user/reviews/${reviewId}/helpful`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

---

## Security Notes

1. **Authentication Required**: All endpoints require valid JWT authentication
2. **User Ownership**: Users can only update/delete their own reviews
3. **Rate Limiting**: Consider implementing rate limiting for review reports to prevent abuse
4. **Input Validation**: All inputs are validated (ratings 1-5, required fields, etc.)
5. **RLS Policies**: Row-level security policies are enabled on all tables

---

## Testing

To run the migration and create the necessary tables:

```bash
# Execute the SQL migration file in your Supabase database
psql -h [host] -U [user] -d [database] -f migrations/wishlist_and_reviews.sql
```

Or execute the SQL directly in Supabase SQL Editor.

---

## Next Steps

1. **Execute the migration** to create the new tables
2. **Test all endpoints** using Postman or similar tool
3. **Update frontend** to integrate with these new APIs
4. **Add admin endpoints** for managing reported reviews (optional)
