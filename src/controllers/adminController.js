const { ErrorResponse } = require('../middleware/errorMiddleware');
const { supabase } = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const { validationResult } = require('express-validator');

// Helper function to get admin client
const getAdminClient = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const adminClient = getAdminClient();
    const { data: users, error } = await adminClient
      .from('users')
      .select('*');

    if (error) throw error;

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const adminClient = getAdminClient();
    const { data: user, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { email, password, name, role = 'user', phone } = req.body;

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) throw authError;

    // Create user in users table using admin client
    const adminClient = getAdminClient();
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .insert([
        {
          id: authUser.user.id,
          email: authUser.user.email,
          phone: authUser.user.phone,
          name,
          role,
          email_confirmed: !!authUser.user.email_confirmed_at,
          phone_confirmed: !!authUser.user.phone_confirmed_at,
          created_at: authUser.user.created_at,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Error creating user in users table:', dbError);
      // Don't fail the response, but log the error
    }

    res.status(201).json({
      success: true,
      data: dbUser || {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: authUser.user.phone,
        name,
        role,
        email_confirmed: !!authUser.user.email_confirmed_at,
        phone_confirmed: !!authUser.user.phone_confirmed_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, status, bio } = req.body;
    const userId = req.params.id;

    // Update user in users table
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (bio !== undefined) updateData.bio = bio;

    const adminClient = getAdminClient();
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (dbError) throw dbError;
    if (!dbUser) {
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
    }

    // Also update Supabase Auth metadata if needed
    if (email || name) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          email: email || undefined,
          raw_user_metadata: name ? { name } : undefined
        }
      );

      if (authError) {
        console.error('Error updating auth user:', authError);
      }
    }

    res.status(200).json({
      success: true,
      data: dbUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // First delete from users table
    const adminClient = getAdminClient();
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    // Also delete from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError);
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const adminClient = getAdminClient();
    const { data: user, error } = await adminClient
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending apps
// @route   GET /api/admin/apps/pending
// @access  Private/Admin
exports.getPendingApps = async (req, res, next) => {
  try {
    const adminClient = getAdminClient();

    // First get all pending apps
    const { data: pendingApps, error: appsError } = await adminClient
      .from('apps')
      .select('*')
      .eq('status', 'pending');

    if (appsError) throw appsError;

    // If no apps found, return empty array
    if (!pendingApps || pendingApps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get all developer IDs from the pending apps
    const developerIds = [...new Set(pendingApps.map(app => app.developer_id))];

    // Get developer details for these apps
    const { data: developers, error: devError } = await adminClient
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', developerIds);

    if (devError) throw devError;

    // Create a map of developer_id to developer details
    const developerMap = developers.reduce((acc, dev) => {
      acc[dev.id] = dev;
      return acc;
    }, {});

    // Combine app data with developer details
    const appsWithDevelopers = pendingApps.map(app => ({
      ...app,
      developer: developerMap[app.developer_id] || null
    }));

    res.status(200).json({
      success: true,
      count: appsWithDevelopers.length,
      data: appsWithDevelopers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all apps (any status)
// @route   GET /api/admin/apps
// @access  Private/Admin
exports.getAllApps = async (req, res, next) => {
  try {
    const adminClient = getAdminClient();

    const { data: apps, error: appsError } = await adminClient
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (appsError) throw appsError;

    if (!apps || apps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const developerIds = [...new Set(apps.map((app) => app.developer_id).filter(Boolean))];

    let developerMap = {};
    if (developerIds.length > 0) {
      const { data: developers, error: devError } = await adminClient
        .from('users')
        .select('id, name, email, avatar_url')
        .in('id', developerIds);

      if (devError) throw devError;

      developerMap = developers.reduce((acc, dev) => {
        acc[dev.id] = dev;
        return acc;
      }, {});
    }

    const appsWithDevelopers = apps.map((app) => ({
      ...app,
      developer: developerMap[app.developer_id] || null,
    }));

    res.status(200).json({
      success: true,
      count: appsWithDevelopers.length,
      data: appsWithDevelopers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update app status
// @route   PUT /api/admin/apps/:id/status
// @access  Private/Admin
exports.updateAppStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!status) {
      return next(new ErrorResponse('Status is required', 400));
    }

    const adminClient = getAdminClient(); // ✅ USE ADMIN CLIENT

    const { data: app, error } = await adminClient
      .from('apps')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!app) {
      return next(new ErrorResponse(`App not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: app,
    });
  } catch (error) {
    console.error('Update app status error:', error);
    next(error);
  }
};


// @desc    Update app (admin can edit any app)
// @route   PUT /api/admin/apps/:id
// @access  Private/Admin
exports.updateApp = async (req, res, next) => {
  try {
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');

    // Get app by ID
    const adminClient = getAdminClient();
    const { data: existingApp, error: fetchError } = await adminClient
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingApp) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Parse request body
    const {
      name,
      description,
      short_description,
      version,
      mini_android_version,
      min_sdk_version,
      target_sdk_version,
      package_name,
      category,
      price = 0,
      is_premium = 'false',
      changelog = '',
      phone_permission,
      camera_permission,
      storage_permission,
      contacts_permission,
      location_permission,
      microphone_permission,
    } = req.body;

    // Build update data
    const updateData = {
      name: name || existingApp.name,
      description: description || existingApp.description,
      short_description: short_description || existingApp.short_description,
      version: version || existingApp.version,
      mini_android_version: mini_android_version || existingApp.mini_android_version,
      min_sdk_version: min_sdk_version ? parseInt(min_sdk_version) : existingApp.min_sdk_version,
      target_sdk_version: target_sdk_version ? parseInt(target_sdk_version) : existingApp.target_sdk_version,
      package_name: package_name || existingApp.package_name,
      category: category || existingApp.category,
      price: price ? parseFloat(price) : existingApp.price,
      is_premium: is_premium === 'true' || is_premium === true,
      changelog: changelog || existingApp.changelog,
      updated_at: new Date().toISOString()
    };

    // Handle permissions
    const permissions = existingApp.permissions || {};
    if (phone_permission !== undefined) permissions.phone = phone_permission === true || phone_permission === 'true';
    if (camera_permission !== undefined) permissions.camera = camera_permission === true || camera_permission === 'true';
    if (storage_permission !== undefined) permissions.storage = storage_permission === true || storage_permission === 'true';
    if (contacts_permission !== undefined) permissions.contacts = contacts_permission === true || contacts_permission === 'true';
    if (location_permission !== undefined) permissions.location = location_permission === true || location_permission === 'true';
    if (microphone_permission !== undefined) permissions.microphone = microphone_permission === true || microphone_permission === 'true';
    
    updateData.permissions = permissions;

    // Handle file uploads
    const filesToCleanup = [];

    try {
      // Handle APK update
      if (req.files && req.files.apk && req.files.apk[0]) {
        const apkFile = req.files.apk[0];
        const apkFileName = `${uuidv4()}${path.extname(apkFile.originalname)}`;
        const apkFilePath = `${existingApp.developer_id}/${apkFileName}`;

        const { error: apkUploadError } = await supabase.storage
          .from('apps')
          .upload(apkFilePath, apkFile.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: apkFile.mimetype,
          });

        if (apkUploadError) {
          throw new Error(`Error uploading APK: ${apkUploadError.message}`);
        }

        const { data: { publicUrl: apkUrl } } = supabase.storage
          .from('apps')
          .getPublicUrl(apkFilePath);

        updateData.file_path = apkFilePath;
        updateData.download_url = apkUrl;
        updateData.file_size = apkFile.size;

        if (existingApp.file_path) {
          filesToCleanup.push({ bucket: 'apps', path: existingApp.file_path });
        }
      }

      // Handle app icon update
      if (req.files && req.files.app_icon && req.files.app_icon[0]) {
        const iconFile = req.files.app_icon[0];
        const iconFileName = `${uuidv4()}${path.extname(iconFile.originalname)}`;
        const iconFilePath = `app_icons/${existingApp.developer_id}/${iconFileName}`;

        const { error: iconUploadError } = await supabase.storage
          .from('app_icons')
          .upload(iconFilePath, iconFile.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: iconFile.mimetype,
          });

        if (iconUploadError) {
          throw new Error(`Error uploading app icon: ${iconUploadError.message}`);
        }

        const { data: { publicUrl: iconUrl } } = supabase.storage
          .from('app_icons')
          .getPublicUrl(iconFilePath);

        // Only set icon_url, not icon_path (doesn't exist in schema)
        updateData.icon_url = iconUrl;

        // Clean up OLD icon if it exists (extract path from URL)
        if (existingApp.icon_url) {
          try {
            // Extract the storage path from the public URL
            // URL format: https://[project].supabase.co/storage/v1/object/public/app_icons/[path]
            const urlParts = existingApp.icon_url.split('/app_icons/');
            if (urlParts.length > 1) {
              const oldIconPath = `app_icons/${urlParts[1]}`;
              filesToCleanup.push({ bucket: 'app_icons', path: oldIconPath });
            }
          } catch (err) {
            console.error('Error extracting old icon path:', err);
          }
        }
      }

      // Handle screenshots update
      if (req.files && req.files.screenshots && req.files.screenshots.length > 0) {
        const screenshotFiles = Array.isArray(req.files.screenshots) 
          ? req.files.screenshots 
          : [req.files.screenshots];
        
        const screenshotUrls = [];
        
        for (const screenshot of screenshotFiles) {
          const screenshotFileName = `${uuidv4()}${path.extname(screenshot.originalname)}`;
          const screenshotFilePath = `app_screenshots/${existingApp.developer_id}/${screenshotFileName}`;
          
          const { error: screenshotError } = await supabase.storage
            .from('app_screenshots')
            .upload(screenshotFilePath, screenshot.buffer, {
              cacheControl: '3600',
              upsert: false,
              contentType: screenshot.mimetype,
            });
          
          if (screenshotError) {
            throw new Error(`Error uploading screenshot: ${screenshotError.message}`);
          }
          
          const { data: { publicUrl: screenshotUrl } } = supabase.storage
            .from('app_screenshots')
            .getPublicUrl(screenshotFilePath);
          
          screenshotUrls.push(screenshotUrl);
        }

        // Add new screenshots to existing ones or replace them
        updateData.screenshots = screenshotUrls;
      }

      // Update the app in the database
      const { data: updatedApp, error: updateError } = await adminClient
        .from('apps')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Clean up old files after successful update
      if (filesToCleanup.length > 0) {
        for (const file of filesToCleanup) {
          await supabase.storage.from(file.bucket).remove([file.path]);
        }
      }

      res.status(200).json({
        success: true,
        data: updatedApp
      });

    } catch (fileError) {
      return next(new ErrorResponse(fileError.message, 500));
    }
  } catch (error) {
    console.error('Error updating app:', error);
    next(error);
  }
};

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getPlatformAnalytics = async (req, res, next) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total apps
    const { count: totalApps } = await supabase
      .from('apps')
      .select('*', { count: 'exact', head: true });

    // Get total downloads
    const { data: downloads } = await supabase
      .from('downloads')
      .select('*');

    const totalDownloads = downloads ? downloads.length : 0;

    // Get recent signups
    const { data: recentSignups } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent apps
    const { data: recentApps } = await supabase
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalApps,
        totalDownloads,
        recentSignups: recentSignups || [],
        recentApps: recentApps || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activities
// @route   GET /api/admin/activities
// @access  Private/Admin
exports.getRecentActivities = async (req, res, next) => {
  try {
    // This would typically come from an activities/audit log table
    // For now, we'll return a placeholder
    res.status(200).json({
      success: true,
      data: [
        { id: 1, action: 'User logged in', user: 'admin@example.com', timestamp: new Date().toISOString() },
        { id: 2, action: 'App approved', user: 'admin@example.com', timestamp: new Date().toISOString() },
        { id: 3, action: 'New user registered', user: 'user@example.com', timestamp: new Date().toISOString() }
      ]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Private/Admin
exports.getCategories = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');

    if (error) throw error;

    // Get app counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        // Count total apps in this category
        const { count: totalApps, error: countError } = await supabase
          .from('apps')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.name);

        // Count published apps in this category
        const { count: publishedApps, error: publishedCountError } = await supabase
          .from('apps')
          .select('*', { count: 'exact', head: true })
          .eq('category', category.name)
          .eq('status', 'published');

        if (countError) throw countError;
        if (publishedCountError) throw publishedCountError;

        return {
          ...category,
          total_apps: totalApps || 0,
          published_apps: publishedApps || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCounts.length,
      data: categoriesWithCounts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, icon_url } = req.body;

    const { data: category, error } = await supabase
      .from('categories')
      .insert([{ name, description, icon_url }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, icon_url } = req.body;

    const { data: category, error } = await supabase
      .from('categories')
      .update({ name, description, icon_url, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Feature an app
// @route   POST /api/admin/featured-apps
// @access  Private/Admin
exports.featureApp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { app_id, feature_type = 'homepage', sort_order = 0, start_date, end_date } = req.body;
    
    // Check if app exists
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id')
      .eq('id', app_id)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Check for existing feature
    const { data: existingFeature, error: existingError } = await supabase
      .from('featured_apps')
      .select('id')
      .eq('app_id', app_id)
      .eq('feature_type', feature_type)
      .eq('is_active', true);

    if (existingError) throw existingError;
    if (existingFeature && existingFeature.length > 0) {
      return next(new ErrorResponse('This app is already featured in this category', 400));
    }

    // Create new feature
    const { data: featuredApp, error } = await supabase
      .from('featured_apps')
      .insert([{
        app_id,
        feature_type,
        sort_order,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        is_active: true,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: featuredApp
    });
  } catch (error) {
    console.error('Error featuring app:', error);
    next(error);
  }
};

// @desc    Get all featured apps (admin view)
// @route   GET /api/admin/featured-apps
// @access  Private/Admin
exports.getFeaturedApps = async (req, res, next) => {
  try {
    const { feature_type, is_active } = req.query;
    
    // First, get the featured apps with basic app info
    let query = supabase
      .from('featured_apps')
      .select(`
        *,
        apps (*)
      `);

    if (feature_type) query = query.eq('feature_type', feature_type);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data: featuredApps, error } = await query.order('sort_order', { ascending: true });

    if (error) throw error;

    // If no featured apps found, return empty array
    if (!featuredApps || featuredApps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get unique user IDs from created_by
    const userIds = [...new Set(featuredApps.map(fa => fa.created_by).filter(Boolean))];
    let users = {};

    // If there are users to fetch, get their details
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds);

      if (!usersError && usersData) {
        // Create a map of user ID to user data for easy lookup
        users = usersData.reduce((acc, user) => ({
          ...acc,
          [user.id]: user
        }), {});
      }
    }

    // Combine the data
    const featuredAppsWithUsers = featuredApps.map(featured => ({
      ...featured,
      created_by_user: users[featured.created_by] || null
    }));

    res.status(200).json({
      success: true,
      count: featuredAppsWithUsers.length,
      data: featuredAppsWithUsers
    });
  } catch (error) {
    console.error('Error fetching featured apps:', error);
    next(error);
  }
};

// @desc    Update featured app
// @route   PUT /api/admin/featured-apps/:id
// @access  Private/Admin
exports.updateFeaturedApp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sort_order, is_active, end_date, feature_type } = req.body;

    const updates = {};
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;
    if (end_date !== undefined) updates.end_date = end_date;
    if (feature_type) updates.feature_type = feature_type;

    const { data: featuredApp, error } = await supabase
      .from('featured_apps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!featuredApp) {
      return next(new ErrorResponse('Featured app not found', 404));
    }

    res.status(200).json({
      success: true,
      data: featuredApp
    });
  } catch (error) {
    console.error('Error updating featured app:', error);
    next(error);
  }
};

// @desc    Remove app from featured
// @route   DELETE /api/admin/featured-apps/:id
// @access  Private/Admin
exports.removeFeaturedApp = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('featured_apps')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error removing featured app:', error);
    next(error);
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    // This would typically update settings in a database
    // For now, we'll just return the updated settings
    res.status(200).json({
      success: true,
      data: {
        ...req.body,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate report
// @route   POST /api/admin/reports
// @access  Private/Admin
exports.generateReport = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.body;

    // This would typically generate a report based on the type and date range
    // For now, we'll return a placeholder
    res.status(200).json({
      success: true,
      data: {
        type,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        data: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all backups
// @route   GET /api/admin/backups
// @access  Private/Admin
exports.listBackups = async (req, res, next) => {
  try {
    // List all files in the backups bucket
    const { data: files, error } = await supabase.storage
      .from('backups')
      .list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });
    
    if (error) throw error;

    // Get public URLs and metadata for each file
    const backups = await Promise.all(
      files.map(async (file) => {
        const { data: { publicUrl } } = supabase.storage
          .from('backups')
          .getPublicUrl(file.name);
        
        return {
          id: file.id,
          name: file.name,
          size: file.metadata.size,
          lastModified: file.metadata.lastModified,
          createdAt: file.created_at,
          downloadUrl: publicUrl
        };
      })
    );

    res.status(200).json({
      success: true,
      count: backups.length,
      data: backups
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    next(new ErrorResponse('Failed to list backups', 500));
  }
};

// @desc    Create backup
// @route   POST /api/admin/backup
// @access  Private/Admin
exports.createBackup = async (req, res, next) => {
  try {
    // Get all tables data
    const tables = ['apps', 'reviews', 'categories', 'app_analytics', 'downloads', 'featured_apps'];
    const backupData = {};
    
    // Fetch data from each table
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) throw error;
      backupData[table] = data;
    }
    
    // Create a backup file in Supabase storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(backupFileName, JSON.stringify(backupData, null, 2), {
        contentType: 'application/json',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL for the backup file
    const { data: { publicUrl } } = supabase.storage
      .from('backups')
      .getPublicUrl(backupFileName);
    
    res.status(200).json({
      success: true,
      data: {
        id: backupFileName,
        status: 'completed',
        createdAt: new Date().toISOString(),
        downloadUrl: publicUrl,
        tables: tables,
        recordCount: Object.values(backupData).reduce((sum, records) => sum + records.length, 0)
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    next(new ErrorResponse(`Failed to create backup: ${error.message}`, 500));
  }
};

// @desc    Restore from backup
// @route   POST /api/admin/restore
// @access  Private/Admin
exports.restoreBackup = async (req, res, next) => {
  try {
    const { backupId } = req.body;
    
    if (!backupId) {
      return next(new ErrorResponse('Backup ID is required', 400));
    }
    
    // Download the backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('backups')
      .download(backupId);
    
    if (downloadError) throw downloadError;
    
    // Parse the backup data
    const backupData = JSON.parse(await fileData.text());
    const results = {};
    
    // Restore each table's data
    for (const [table, records] of Object.entries(backupData)) {
      // Delete existing data
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', ''); // Delete all records
      
      if (deleteError) {
        results[table] = { success: false, error: deleteError.message };
        continue;
      }
      
      // Insert backup data in chunks to avoid hitting limits
      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from(table)
          .insert(chunk);
        
        if (insertError) {
          results[table] = { success: false, error: insertError.message };
          break;
        }
      }
      
      if (!results[table]) {
        results[table] = { success: true, recordsRestored: records.length };
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        status: 'completed',
        restoredAt: new Date().toISOString(),
        results: results
      }
    });
  } catch (error) {
    console.error('Restore error:', error);
    next(new ErrorResponse(`Failed to restore from backup: ${error.message}`, 500));
  }
};

// @desc    Monitor reviews for abuse
// @route   GET /api/admin/reviews/flagged
// @access  Private/Admin
exports.getFlaggedReviews = async (req, res, next) => {
  try {
    // First, get all reviews with their related data
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        app:apps (id, name, icon_url)
      `)
      .or('is_flagged.eq.true,rating.eq.1')
      .order('created_at', { ascending: false });

    // Get user data separately since the relationship is with auth.users
    if (reviews && reviews.length > 0) {
      const userIds = [...new Set(reviews.map(review => review.user_id))];
      const { data: usersData } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      
      const usersMap = new Map();
      if (usersData && usersData.users) {
        usersData.users.forEach(user => {
          usersMap.set(user.id, {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0]
          });
        });
      }

      // Combine the data
      reviews.forEach(review => {
        review.user = usersMap.get(review.user_id) || { id: review.user_id };
      });
    }

    if (error) {
      console.error('Error fetching flagged reviews:', error);
      return next(new ErrorResponse('Error fetching flagged reviews: ' + error.message, 500));
    }

    // Additional filtering for suspicious patterns
    const flaggedReviews = reviews.filter(review => {
      const comment = review.comment?.toLowerCase() || '';
      const suspiciousPatterns = [
        'spam', 'fake', 'bot', 'terrible app', 'worst app',
        'don\'t download', 'virus', 'malware', 'scam'
      ];

      return review.rating === 1 ||
        suspiciousPatterns.some(pattern => comment.includes(pattern)) ||
        (comment.length < 10 && review.rating <= 2);
    });

    res.status(200).json({
      success: true,
      count: flaggedReviews.length,
      data: flaggedReviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete abusive review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the review first to update app rating later
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('app_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return next(new ErrorResponse('Error deleting review', 500));
    }

    // Update app rating after review deletion
    await updateAppRating(review.app_id);

    // Log the action (in a real app, you'd store this in an audit log)
    console.log(`Admin ${req.user.id} deleted review ${id}. Reason: ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
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

    if (ratingData.length === 0) {
      // No reviews left, reset rating
      await supabase
        .from('apps')
        .update({
          average_rating: 0,
          review_count: 0,
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
        average_rating: Math.round(averageRating * 10) / 10,
        review_count: reviewCount,
      })
      .eq('id', appId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error updating app rating:', error);
    throw error;
  }
};
