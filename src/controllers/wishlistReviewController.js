const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// ========================
// WISHLIST ENDPOINTS
// ========================

// @desc    Add app to wishlist
// @route   POST /api/user/wishlist/:appId
// @access  Private
exports.addToWishlist = async (req, res, next) => {
  try {
    const { appId } = req.params;

    // Check if app exists
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, name')
      .eq('id', appId)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Check if already in wishlist
    const { data: existing, error: checkError } = await supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('app_id', appId)
      .maybeSingle();

    if (existing) {
      return next(new ErrorResponse('App already in wishlist', 400));
    }

    // Add to wishlist
    const { data: wishlistItem, error: insertError } = await supabase
      .from('wishlists')
      .insert([
        {
          user_id: req.user.id,
          app_id: appId,
          added_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Wishlist insert error:', insertError);
      return next(new ErrorResponse('Error adding to wishlist', 500));
    }

    res.status(201).json({
      success: true,
      message: `${app.name} added to wishlist`,
      data: wishlistItem
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove app from wishlist
// @route   DELETE /api/user/wishlist/:appId
// @access  Private
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { appId } = req.params;

    // Delete from wishlist
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', req.user.id)
      .eq('app_id', appId);

    if (error) {
      console.error('Wishlist delete error:', error);
      return next(new ErrorResponse('Error removing from wishlist', 500));
    }

    res.status(200).json({
      success: true,
      message: 'App removed from wishlist',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's wishlist
// @route   GET /api/user/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Get wishlist items with app details
    const { data: wishlistItems, error, count } = await supabase
      .from('wishlists')
      .select('*, apps(*)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      console.error('Wishlist fetch error:', error);
      return next(new ErrorResponse('Error fetching wishlist', 500));
    }

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = { page: page + 1, limit };
    }

    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: wishlistItems.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page
      },
      data: wishlistItems
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if app is in wishlist
// @route   GET /api/user/wishlist/check/:appId
// @access  Private
exports.checkWishlist = async (req, res, next) => {
  try {
    const { appId } = req.params;

    const { data: wishlistItem, error } = await supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('app_id', appId)
      .maybeSingle();

    if (error) {
      console.error('Wishlist check error:', error);
      return next(new ErrorResponse('Error checking wishlist', 500));
    }

    res.status(200).json({
      success: true,
      data: {
        inWishlist: !!wishlistItem,
        wishlistItem: wishlistItem || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ========================
// REVIEW ENDPOINTS
// ========================

// @desc    Update user's review
// @route   PUT /api/user/reviews/:reviewId
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return next(new ErrorResponse('Rating must be between 1 and 5', 400));
    }

    // Check if review exists and belongs to user
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingReview) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Update review
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('Review update error:', updateError);
      return next(new ErrorResponse('Error updating review', 500));
    }

    // Update app rating if rating changed
    if (rating !== undefined) {
      await updateAppRating(existingReview.app_id);
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user's review
// @route   DELETE /api/user/reviews/:reviewId
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    // Check if review exists and belongs to user
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingReview) {
      return next(new ErrorResponse('Review not found', 404));
    }

    const appId = existingReview.app_id;

    // Delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Review delete error:', deleteError);
      return next(new ErrorResponse('Error deleting review', 500));
    }

    // Update app rating
    await updateAppRating(appId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reviews
// @route   GET /api/user/reviews
// @access  Private
exports.getUserReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Get user's reviews with app details
    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select('*, apps(id, name, icon_url, category)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      console.error('Reviews fetch error:', error);
      return next(new ErrorResponse('Error fetching reviews', 500));
    }

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = { page: page + 1, limit };
    }

    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page
      },
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/user/reviews/:reviewId/helpful
// @access  Private
exports.markReviewHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    // Check if review exists
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Check if user already marked as helpful
    const { data: existing, error: checkError } = await supabase
      .from('review_helpful')
      .select('*')
      .eq('review_id', reviewId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      // Remove helpful mark (toggle)
      const { error: deleteError } = await supabase
        .from('review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', req.user.id);

      if (deleteError) {
        console.error('Review helpful delete error:', deleteError);
        return next(new ErrorResponse('Error updating helpful status', 500));
      }

      // Update helpful count
      const { data: helpfulCount } = await supabase
        .from('review_helpful')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      await supabase
        .from('reviews')
        .update({ helpful_count: helpfulCount || 0 })
        .eq('id', reviewId);

      return res.status(200).json({
        success: true,
        message: 'Helpful mark removed',
        data: { isHelpful: false, helpfulCount: helpfulCount || 0 }
      });
    }

    // Add helpful mark
    const { error: insertError } = await supabase
      .from('review_helpful')
      .insert([
        {
          review_id: reviewId,
          user_id: req.user.id,
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      console.error('Review helpful insert error:', insertError);
      return next(new ErrorResponse('Error marking review as helpful', 500));
    }

    // Update helpful count
    const { count: helpfulCount } = await supabase
      .from('review_helpful')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    await supabase
      .from('reviews')
      .update({ helpful_count: helpfulCount || 0 })
      .eq('id', reviewId);

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: { isHelpful: true, helpfulCount: helpfulCount || 0 }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report review as inappropriate
// @route   POST /api/user/reviews/:reviewId/report
// @access  Private
exports.reportReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return next(new ErrorResponse('Please provide a reason for reporting', 400));
    }

    // Check if review exists
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Check if user already reported this review
    const { data: existing, error: checkError } = await supabase
      .from('review_reports')
      .select('*')
      .eq('review_id', reviewId)
      .eq('reported_by', req.user.id)
      .maybeSingle();

    if (existing) {
      return next(new ErrorResponse('You have already reported this review', 400));
    }

    // Create report
    const { data: report, error: insertError } = await supabase
      .from('review_reports')
      .insert([
        {
          review_id: reviewId,
          reported_by: req.user.id,
          reason,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Review report insert error:', insertError);
      return next(new ErrorResponse('Error reporting review', 500));
    }

    res.status(201).json({
      success: true,
      message: 'Review reported successfully. Our team will review it.',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to update app rating
const updateAppRating = async (appId) => {
  try {
    // Get average rating and review count
    const { data: ratingData, error: ratingError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('app_id', appId);

    if (ratingError) throw ratingError;

    if (!ratingData || ratingData.length === 0) {
      // No reviews, set rating to 0
      await supabase
        .from('apps')
        .update({
          average_rating: 0,
          review_count: 0
        })
        .eq('id', appId);
      return;
    }

    const ratings = ratingData.map((r) => r.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const reviewCount = ratings.length;

    // Update app with new rating
    const { error: updateError } = await supabase
      .from('apps')
      .update({
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        review_count: reviewCount
      })
      .eq('id', appId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating app rating:', error);
    throw error;
  }
};
