const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Get all apps
// @route   GET /api/apps
// @access  Public
exports.getApps = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Base query
    let query = supabase
      .from('apps')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (req.query.category) {
      query = query.eq('category', req.query.category);
    }

    if (req.query.developerId) {
      query = query.eq('developer_id', req.query.developerId);
    }

    // Execute query
    const { data: apps, error, count } = await query.range(startIndex, endIndex - 1);

    if (error) {
      return next(new ErrorResponse('Error fetching apps', 500));
    }

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: apps.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page,
      },
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single app
// @route   GET /api/apps/:id
// @access  Public
exports.getApp = async (req, res, next) => {
  try {
    // First get the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (appError || !app) {
      console.error('App not found:', appError);
      return next(new ErrorResponse(`App not found with id of ${req.params.id}`, 404));
    }

    // Check if app is published
    if (app.status !== 'published') {
      return next(new ErrorResponse(
        `App with id ${req.params.id} exists but is not published. Current status: ${app.status}`,
        403
      ));
    }

    let developer = null;
    // Only try to fetch developer if developer_id exists
    if (app.developer_id) {
      const { data: devData, error: devError } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('id', app.developer_id)
        .single();

      if (!devError) {
        developer = devData;
      } else {
        console.error('Error fetching developer:', devError);
      }
    }

    // Increment view count (non-blocking)
    supabase
      .from('apps')
      .update({ views: (app.views || 0) + 1 })
      .eq('id', req.params.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('Error updating view count:', updateError);
        }
      })
      .catch(console.error);

    res.status(200).json({
      success: true,
      data: {
        ...app,
        developer: developer || null
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download app
// @route   GET /api/apps/:id/download
// @access  Private
exports.downloadApp = async (req, res, next) => {
  try {
    // Get app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse(`App not found with id of ${req.params.id}`, 404));
    }

    // Check if user has already downloaded this app
    const { data: existingDownload, error: downloadError } = await supabase
      .from('downloads')
      .select('*')
      .eq('app_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    // If not, create a new download record
    if (!existingDownload) {
      const { error: createError } = await supabase
        .from('downloads')
        .insert([
          {
            app_id: req.params.id,
            user_id: req.user.id,
            downloaded_at: new Date().toISOString(),
            version_downloaded: app.version
          },
        ]);

      if (createError) {
        return next(new ErrorResponse('Error recording download', 500));
      }

      // Increment download count
      await supabase
        .from('apps')
        .update({ downloads: (app.downloads || 0) + 1 })
        .eq('id', req.params.id);
    }

    // Generate signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('apps')
      .createSignedUrl(app.file_path, 3600); // 1 hour expiration

    if (urlError || !signedUrl) {
      return next(new ErrorResponse('Error generating download URL', 500));
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: signedUrl.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create app review
// @route   POST /api/apps/:id/reviews
// @access  Private
exports.createAppReview = async (req, res, next) => {
  try {
    // Check if user has downloaded the app
    const { data: download, error: downloadError } = await supabase
      .from('downloads')
      .select('*')
      .eq('app_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (downloadError || !download) {
      return next(new ErrorResponse('You must download the app before reviewing', 400));
    }

    // Check if user has already reviewed this app
    const { data: existingReview, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('app_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (existingReview) {
      return next(new ErrorResponse('You have already reviewed this app', 400));
    }

    // Create review
    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert([
        {
          app_id: req.params.id,
          user_id: req.user.id,
          rating: req.body.rating,
          comment: req.body.comment,
        },
      ])
      .select()
      .single();

    if (createError) {
      return next(new ErrorResponse('Error creating review', 500));
    }

    // Update app rating
    await updateAppRating(req.params.id);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get app reviews
// @route   GET /api/apps/:id/reviews
// @access  Public
exports.getAppReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // First, get the reviews
    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('app_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      console.error('Error fetching reviews:', error);
      return next(new ErrorResponse('Error fetching reviews', 500));
    }

    // If no reviews found, return empty array
    if (!reviews || reviews.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        pagination: {}
      });
    }

    // Get user details for each review
    const reviewsWithUsers = await Promise.all(reviews.map(async (review) => {
      let user = null;
      if (review.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', review.user_id)
          .single();
        
        if (!userError) {
          user = userData;
        } else {
          console.error('Error fetching user:', userError);
        }
      }
      
      return {
        ...review,
        user: user || null
      };
    }));

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: reviewsWithUsers.length,
      total: count,
      pagination: {
        ...pagination,
        totalPages,
        currentPage: page,
      },
      data: reviewsWithUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top rated apps
// @route   GET /api/apps/top
// @access  Public
exports.getTopRatedApps = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const { data: apps, error } = await supabase
      .from('apps')
      .select('*')
      .order('average_rating', { ascending: false })
      .order('downloads', { ascending: false })
      .limit(limit);

    if (error) {
      return next(new ErrorResponse('Error fetching top rated apps', 500));
    }

    res.status(200).json({
      success: true,
      count: apps.length,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get new releases
// @route   GET /api/apps/new
// @access  Public
exports.getNewReleases = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 30); // Last 30 days

    const { data: apps, error } = await supabase
      .from('apps')
      .select('*')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return next(new ErrorResponse('Error fetching new releases', 500));
    }

    res.status(200).json({
      success: true,
      count: apps.length,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get apps by category
// @route   GET /api/apps/category/:category
// @access  Public
exports.getAppsByCategory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const { category } = req.params;

    // Get apps by category
    const { data: apps, error, count } = await supabase
      .from('apps')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .eq('status', 'published')
      .order('average_rating', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      return next(new ErrorResponse('Error fetching apps by category', 500));
    }

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: apps.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page,
      },
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search apps
// @route   GET /api/apps/search
// @access  Public
exports.searchApps = async (req, res, next) => {
  try {
    const { q, category, minRating, maxPrice, sortBy = 'relevance' } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Start building the query
    let query = supabase
      .from('apps')
      .select('*', { count: 'exact' })
      .eq('status', 'published');

    // Add text search if query is provided
    if (q) {
      query = query.textSearch('name_description_tsv', q, {
        type: 'websearch',
        config: 'english',
      });
    }

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (minRating) {
      query = query.gte('average_rating', parseFloat(minRating));
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'downloads':
        query = query.order('downloads', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      default: // relevance
        if (q) {
          query = query.order('name', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }
    }

    // Add pagination
    query = query.range(startIndex, endIndex - 1);

    // Execute query
    const { data: apps, error, count } = await query;

    if (error) {
      return next(new ErrorResponse('Error searching apps', 500));
    }

    // Pagination result
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (endIndex < count) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: apps.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page,
      },
      data: apps,
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

    const ratings = ratingData.map((r) => r.rating);
    const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const reviewCount = ratings.length;

    // Update app with new rating
    const { error: updateError } = await supabase
      .from('apps')
      .update({
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        review_count: reviewCount,
      })
      .eq('id', appId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating app rating:', error);
    throw error;
  }
};
