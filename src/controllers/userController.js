const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Get user's downloaded apps
// @route   GET /api/user/downloads
// @access  Private
exports.getUserDownloads = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching downloads for user: ${userId}`);

    // Get the user's downloads
    const { data: downloads, error: downloadsError } = await supabase
      .from('downloads')
      .select(`
        id,
        app_id,
        downloaded_at,
        version_downloaded
      `)
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false });

    if (downloadsError) {
      console.error('Error fetching downloads:', downloadsError);
      return next(new ErrorResponse('Error fetching downloads', 500));
    }

    if (!downloads || downloads.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    console.log(`Found ${downloads.length} download records`);
    const appIds = downloads.map(d => d.app_id);
    console.log('Fetching details for app IDs:', appIds);

    // Get app details for each download
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('*')
      .in('id', appIds);

    if (appsError) {
      console.error('Error fetching app details:', appsError);
      return next(new ErrorResponse('Error fetching app details', 500));
    }

    // Create a map of app_id to app details
    const appMap = apps.reduce((acc, app) => ({
      ...acc,
      [app.id]: app
    }), {});

    // Fetch developer details for each app
    const downloadsWithDetails = await Promise.all(
      downloads.map(async download => {
        const app = appMap[download.app_id];
        let developer = null;

        if (app && app.developer_id) {
          const { data: devData, error: devError } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', app.developer_id)
            .single();

          if (!devError) {
            developer = devData;
          } else {
            console.error(`Error fetching developer ${app.developer_id}:`, devError);
          }
        }

        return {
          id: download.id,
          downloaded_at: download.downloaded_at,
          version_downloaded: download.version_downloaded,
          app: app ? {
            id: app.id,
            name: app.name,
            version: app.version,
            icon_url: app.icon_url,
            package_name: app.package_name,
            file_size: app.file_size,
            status: app.status,
            developer
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      count: downloadsWithDetails.length,
      data: downloadsWithDetails
    });
  } catch (error) {
    console.error('Unexpected error in getUserDownloads:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Check for app updates
// @route   GET /api/user/updates
// @access  Private
exports.checkAppUpdates = async (req, res, next) => {
  try {
    // Get user's downloaded apps
    const { data: downloads, error: downloadsError } = await supabase
      .from('downloads')
      .select(`
        *,
        app:app_id (id, name, version, package_name, icon_url, updated_at)
      `)
      .eq('user_id', req.user.id);

    if (downloadsError) {
      return next(new ErrorResponse('Error fetching downloads', 500));
    }

    // Check for updates (apps with newer versions)
    const updatesAvailable = [];
    
    for (const download of downloads) {
      const { data: latestApp, error: appError } = await supabase
        .from('apps')
        .select('id, name, version, updated_at, icon_url')
        .eq('package_name', download.app.package_name)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!appError && latestApp) {
        // Compare versions or update dates
        const downloadDate = new Date(download.downloaded_at);
        const appUpdateDate = new Date(latestApp.updated_at);
        
        if (appUpdateDate > downloadDate) {
          updatesAvailable.push({
            downloadId: download.id,
            currentApp: download.app,
            latestApp: latestApp,
            updateAvailable: true
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: updatesAvailable.length,
      data: updatesAvailable,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an app (download latest version)
// @route   POST /api/user/update/:appId
// @access  Private
exports.updateApp = async (req, res, next) => {
  try {
    const { appId } = req.params;

    // Get the latest version of the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', appId)
      .eq('status', 'published')
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found or not available', 404));
    }

    // Check if user has previously downloaded this app
    const { data: existingDownload, error: downloadError } = await supabase
      .from('downloads')
      .select('*')
      .eq('app_id', appId)
      .eq('user_id', req.user.id)
      .single();

    if (downloadError && downloadError.code !== 'PGRST116') {
      return next(new ErrorResponse('Error checking download history', 500));
    }

    if (!existingDownload) {
      return next(new ErrorResponse('You must download the app first before updating', 400));
    }

    // Update the download record with new timestamp
    const { error: updateError } = await supabase
      .from('downloads')
      .update({ 
        downloaded_at: new Date().toISOString(),
        version_downloaded: app.version
      })
      .eq('id', existingDownload.id);

    if (updateError) {
      return next(new ErrorResponse('Error updating download record', 500));
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
      message: 'App update ready for download',
      data: {
        app: app,
        downloadUrl: signedUrl.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Uninstall app (remove from user's library)
// @route   DELETE /api/user/uninstall/:appId
// @access  Private
exports.uninstallApp = async (req, res, next) => {
  try {
    const { appId } = req.params;

    // Remove download record
    const { error: deleteError } = await supabase
      .from('downloads')
      .delete()
      .eq('app_id', appId)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return next(new ErrorResponse('Error uninstalling app', 500));
    }

    res.status(200).json({
      success: true,
      message: 'App uninstalled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile with app statistics
// @route   GET /api/user/profile
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    // Get user details from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, role')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('Error fetching user details:', userError);
      return next(new ErrorResponse('Error fetching user profile', 500));
    }

    // Get download count
    const { count: downloadCount, error: downloadError } = await supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (downloadError) {
      console.error('Error fetching download count:', downloadError);
    }

    // Get review count
    const { count: reviewCount, error: reviewError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (reviewError) {
      console.error('Error fetching review count:', reviewError);
    }

    // Get recent reviews
    const { data: recentReviews, error: recentReviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        app:apps (id, name, icon_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentReviewsError) {
      console.error('Error fetching recent reviews:', recentReviewsError);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role || 'user',
        },
        stats: {
          downloads: downloadCount || 0,
          reviews: reviewCount || 0,
        },
        recent_reviews: recentReviews || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
