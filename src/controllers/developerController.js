const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Get all apps for the logged in developer
// @route   GET /api/developer/apps
// @access  Private/Developer
exports.getDeveloperApps = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const { data: apps, error, count } = await supabase
      .from('apps')
      .select('*', { count: 'exact' })
      .eq('developer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      return next(new ErrorResponse('Error fetching developer apps', 500));
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

// @desc    Upload new app
// @route   POST /api/developer/apps/upload
// @access  Private/Developer
exports.uploadApp = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload an APK file', 400));
    }

    const {
      name,
      description,
      short_description,
      version,
      min_sdk_version,
      target_sdk_version,
      package_name,
      category,
      price = 0,
      is_premium = false,
      changelog = '',
    } = req.body;

    // Validate required fields
    if (!name || !description || !version || !package_name || !category) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }

    // Generate unique file name
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `apps/${req.user.id}/${fileName}`;

    console.log('Upload details:', {
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath: filePath,
      userId: req.user.id
    });

    // Upload file to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('apps')
      .upload(filePath, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return next(new ErrorResponse(`Error uploading APK file: ${uploadError.message}`, 500));
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('apps')
      .getPublicUrl(filePath);

    // Create app in database
    const { data: app, error: dbError } = await supabase
      .from('apps')
      .insert([
        {
          name,
          description,
          short_description: short_description || description.substring(0, 100) + '...',
          version,
          min_sdk_version,
          target_sdk_version,
          package_name,
          category,
          price: parseFloat(price),
          is_premium: is_premium === 'true',
          changelog,
          developer_id: req.user.id,
          file_path: filePath,
          download_url: publicUrl,
          file_size: req.file.size,
          status: 'pending', // Needs admin approval
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('apps').remove([filePath]);
      return next(new ErrorResponse('Error creating app', 500));
    }

    res.status(201).json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update app
// @route   PUT /api/developer/apps/:id
// @access  Private/Developer
exports.updateApp = async (req, res, next) => {
  try {
    const {
      name,
      description,
      short_description,
      version,
      min_sdk_version,
      target_sdk_version,
      package_name,
      category,
      price,
      is_premium,
      changelog,
    } = req.body;

    // Get existing app
    const { data: existingApp, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingApp) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Check if user is the owner of the app
    if (existingApp.developer_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this app', 401));
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (short_description) updateData.short_description = short_description;
    if (version) updateData.version = version;
    if (min_sdk_version) updateData.min_sdk_version = min_sdk_version;
    if (target_sdk_version) updateData.target_sdk_version = target_sdk_version;
    if (package_name) updateData.package_name = package_name;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (is_premium !== undefined) updateData.is_premium = is_premium === 'true';
    if (changelog) updateData.changelog = changelog;

    // If this is an update from a developer, set status to pending for admin review
    if (req.user.role === 'developer') {
      updateData.status = 'pending';
      updateData.updated_at = new Date().toISOString();
    }

    // Update app
    const { data: updatedApp, error: updateError } = await supabase
      .from('apps')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      return next(new ErrorResponse('Error updating app', 500));
    }

    res.status(200).json({
      success: true,
      data: updatedApp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete app
// @route   DELETE /api/developer/apps/:id
// @access  Private/Developer
exports.deleteApp = async (req, res, next) => {
  try {
    // Get app to delete
    const { data: app, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !app) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Check if user is the owner of the app or admin
    if (app.developer_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this app', 401));
    }

    // Delete file from storage
    if (app.file_path) {
      await supabase.storage.from('apps').remove([app.file_path]);
    }

    // Delete app from database
    const { error: deleteError } = await supabase
      .from('apps')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) {
      return next(new ErrorResponse('Error deleting app', 500));
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload app icon
// @route   PUT /api/developer/apps/:id/icon
// @access  Private/Developer
exports.uploadAppIcon = async (req, res, next) => {
  try {
    console.log('=== ICON UPLOAD START ===');
    console.log('Request params:', req.params);
    console.log('User info:', { id: req.user.id, role: req.user.role });
    console.log('File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    console.log('Step 1: Checking app ownership...');
    // Check if user is the owner of the app
    const { data: app, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !app) {
      console.error('App fetch error:', fetchError);
      return next(new ErrorResponse('App not found', 404));
    }

    console.log('App found:', { id: app.id, developer_id: app.developer_id });

    if (app.developer_id !== req.user.id && req.user.role !== 'admin') {
      console.log('Authorization failed - user not owner');
      return next(new ErrorResponse('Not authorized to update this app', 401));
    }

    console.log('Step 2: Authorization passed');

    // Generate unique file name
    const fileExt = path.extname(req.file.originalname);
    const fileName = `icon_${uuidv4()}${fileExt}`;
    const filePath = `icons/${req.user.id}/${fileName}`;

    console.log('Icon upload details:', {
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath: filePath,
      appId: req.params.id,
      userId: req.user.id
    });

    console.log('Step 3: Starting file upload to Supabase Storage...');
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app_icons')
      .upload(filePath, req.file.buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error('Supabase Storage icon upload error:', uploadError);
      return next(new ErrorResponse(`Error uploading icon: ${uploadError.message}`, 500));
    }

    console.log('Step 4: Upload successful:', uploadData);

    console.log('Step 5: Getting public URL...');
    // Get public URL
    const { data: urlData, error: urlError } = supabase.storage
      .from('app_icons')
      .getPublicUrl(filePath);

    console.log('URL response:', { urlData, urlError });

    if (urlError || !urlData?.publicUrl) {
      console.error('Error getting public URL:', urlError);
      return next(new ErrorResponse('Error generating icon URL', 500));
    }

    const publicUrl = urlData.publicUrl;
    console.log('Step 6: Got public URL:', publicUrl);

    console.log('Step 7: Updating app in database...'); 
    // Update app with new icon URL
    const { data: updatedApp, error: updateError } = await supabase
      .from('apps')
      .update({ icon_url: publicUrl })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return next(new ErrorResponse('Error updating app icon', 500));
    }

    console.log('Step 8: Database updated successfully:', updatedApp);

    console.log('Step 9: Sending success response');
    res.status(200).json({
      success: true,
      message: 'App icon updated successfully',
      data: {
        id: updatedApp.id,
        icon_url: updatedApp.icon_url
      }
    });
  } catch (error) {
    console.error('=== ICON UPLOAD ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

// @desc    Upload app screenshots
// @route   PUT /api/developer/apps/:id/screenshots
// @access  Private/Developer
exports.uploadAppScreenshots = async (req, res, next) => {
  try {
    console.log('=== SCREENSHOTS UPLOAD START ===');
    console.log('Request params:', req.params);
    console.log('User info:', { id: req.user.id, role: req.user.role });
    console.log('Files info:', req.files ? {
      count: req.files.length,
      files: req.files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype }))
    } : 'No files');

    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload at least one screenshot', 400));
    }

    console.log('Step 1: Checking app ownership...');
    // Check if user is the owner of the app
    const { data: app, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !app) {
      console.error('App fetch error:', fetchError);
      return next(new ErrorResponse('App not found', 404));
    }

    console.log('App found:', { id: app.id, developer_id: app.developer_id });

    if (app.developer_id !== req.user.id && req.user.role !== 'admin') {
      console.log('Authorization failed - user not owner');
      return next(new ErrorResponse('Not authorized to update this app', 401));
    }

    console.log('Step 2: Authorization passed');
    const screenshotUrls = [];

    console.log('Step 3: Testing bucket access...');
    // Test if we can access the app_screenshots bucket
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets?.map(b => ({ name: b.name, public: b.public })));
      
      if (listError) {
        console.error('Error listing buckets:', listError);
      }
    } catch (error) {
      console.error('Bucket access test failed:', error);
    }

    console.log('Step 4: Processing uploaded files...');
    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);
      
      // Generate unique file name
      const fileExt = path.extname(file.originalname);
      const fileName = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExt}`;
      const filePath = `screenshots/${req.user.id}/${fileName}`;

      console.log(`Upload details for ${file.originalname}:`, {
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: filePath
      });

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app_screenshots')
        .upload(filePath, file.buffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.error(`Error uploading ${file.originalname}:`, uploadError);
        continue; // Skip this file and continue with others
      }

      console.log(`Upload successful for ${file.originalname}:`, uploadData);

      // Get public URL
      const { data: urlData, error: urlError } = supabase.storage
        .from('app_screenshots')
        .getPublicUrl(filePath);

      if (urlError || !urlData?.publicUrl) {
        console.error(`Error getting URL for ${file.originalname}:`, urlError);
        continue;
      }

      console.log(`Got public URL for ${file.originalname}:`, urlData.publicUrl);
      screenshotUrls.push(urlData.publicUrl);
    }

    console.log(`Step 5: Successfully processed ${screenshotUrls.length} out of ${req.files.length} files`);

    if (screenshotUrls.length === 0) {
      console.log('No screenshots were successfully uploaded');
      return next(new ErrorResponse('Error uploading screenshots - no files processed successfully', 500));
    }

    console.log('Step 6: Updating app in database...');
    // Get existing screenshots
    const existingScreenshots = app.screenshots || [];
    const updatedScreenshots = [...existingScreenshots, ...screenshotUrls];

    console.log('Screenshot update details:', {
      existing: existingScreenshots.length,
      new: screenshotUrls.length,
      total: updatedScreenshots.length,
      final: updatedScreenshots.slice(0, 10).length
    });

    // Update app with new screenshots (limit to 10)
    const { data: updatedApp, error: updateError } = await supabase
      .from('apps')
      .update({ 
        screenshots: updatedScreenshots.slice(0, 10), // Keep only the 10 most recent
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return next(new ErrorResponse('Error updating app screenshots', 500));
    }

    console.log('Step 7: Database updated successfully');
    res.status(200).json({
      success: true,
      message: 'Screenshots uploaded successfully',
      data: {
        id: updatedApp.id,
        screenshots: updatedApp.screenshots,
        screenshots_count: updatedApp.screenshots?.length || 0
      }
    });
  } catch (error) {
    console.error('=== SCREENSHOTS UPLOAD ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

// @desc    Get app analytics
// @route   GET /api/developer/analytics/:appId
// @access  Private/Developer
exports.getAppAnalytics = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user is the owner of the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, developer_id')
      .eq('id', appId)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found', 404));
    }

    if (app.developer_id !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to view analytics for this app', 401));
    }

    // Set date range (default to last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - 30);

    // Get downloads count
    const { count: downloadsCount, error: downloadsError } = await supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .eq('app_id', appId)
      .gte('downloaded_at', start.toISOString())
      .lte('downloaded_at', end.toISOString());

    if (downloadsError) {
      console.error('Error fetching downloads count:', downloadsError);
    }

    // Get reviews count and average rating
    const { count: reviewsCount, data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact' })
      .eq('app_id', appId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (reviewsError) {
      console.error('Error fetching reviews data:', reviewsError);
    }

    // Calculate average rating
    let averageRating = 0;
    if (reviewsData && reviewsData.length > 0) {
      const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
      averageRating = totalRating / reviewsData.length;
    }

    // Get daily downloads for the period
    const { data: downloadsData, error: dailyDownloadsError } = await supabase
      .from('downloads')
      .select('downloaded_at')
      .eq('app_id', appId)
      .gte('downloaded_at', start.toISOString())
      .lte('downloaded_at', end.toISOString())
      .order('downloaded_at', { ascending: true });

    // Process daily downloads data
    let dailyDownloads = [];
    if (downloadsData && !dailyDownloadsError) {
      const dailyCounts = {};
      downloadsData.forEach(download => {
        const date = new Date(download.downloaded_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });
      
      dailyDownloads = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        downloads: count
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (dailyDownloadsError) {
      console.error('Error fetching daily downloads:', dailyDownloadsError);
    }

    // Get app versions and their download counts
    // Note: Since we don't have app_versions table, let's get version info from downloads
    const { data: versionsData, error: versionsError } = await supabase
      .from('downloads')
      .select('version_downloaded')
      .eq('app_id', appId)
      .gte('downloaded_at', start.toISOString())
      .lte('downloaded_at', end.toISOString());

    // Process versions data to count downloads per version
    let versionCounts = {};
    if (versionsData) {
      versionsData.forEach(download => {
        const version = download.version_downloaded || 'Unknown';
        versionCounts[version] = (versionCounts[version] || 0) + 1;
      });
    }

    // Convert to array format
    const processedVersionsData = Object.entries(versionCounts).map(([version, count]) => ({
      version,
      download_count: count
    })).sort((a, b) => b.download_count - a.download_count);

    if (versionsError) {
      console.error('Error fetching version data:', versionsError);
    }

    res.status(200).json({
      success: true,
      data: {
        downloads: {
          total: downloadsCount || 0,
          daily: dailyDownloads || [],
        },
        reviews: {
          total: reviewsCount || 0,
          average_rating: Math.round(averageRating * 10) / 10 || 0,
        },
        versions: processedVersionsData || [],
        date_range: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get developer dashboard data
// @route   GET /api/developer/dashboard
// @access  Private/Developer
exports.getDeveloperDashboard = async (req, res, next) => {
  try {
    // Get developer's apps
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('id, name, icon_url, downloads, average_rating, status')
      .eq('developer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (appsError) {
      return next(new ErrorResponse('Error fetching developer apps', 500));
    }

    // Get total downloads across all apps
    const { count: totalDownloads, error: downloadsError } = await supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .in('app_id', apps.map(app => app.id));

    if (downloadsError) {
      console.error('Error fetching total downloads:', downloadsError);
    }

    // Get total reviews and average rating across all apps
    const { count: totalReviews, data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating', { count: 'exact' })
      .in('app_id', apps.map(app => app.id));

    if (reviewsError) {
      console.error('Error fetching reviews data:', reviewsError);
    }

    // Calculate average rating
    let averageRating = 0;
    if (reviewsData && reviewsData.length > 0) {
      const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
      averageRating = totalRating / reviewsData.length;
    }

    // Get recent reviews
    const { data: recentReviews, error: recentReviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        app:apps (id, name, icon_url),
        user:users (id, name, avatar_url)
      `)
      .in('app_id', apps.map(app => app.id))
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentReviewsError) {
      console.error('Error fetching recent reviews:', recentReviewsError);
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total_apps: apps.length,
          total_downloads: totalDownloads || 0,
          total_reviews: totalReviews || 0,
          average_rating: Math.round(averageRating * 10) / 10 || 0,
        },
        apps: apps || [],
        recent_reviews: recentReviews || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
