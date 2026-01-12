const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Get all apps for the logged in developer
// @route   GET /api/developer/apps
// @access  Private/Developer
// @desc    Get all apps for the logged in developer
// @route   GET /api/developer/apps
// @access  Private/Developer
exports.getDeveloperApps = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // First get the basic app data
    const { data: apps, error, count } = await supabase
      .from('apps')
      .select('id, name, version, status, average_rating, created_at, icon_url, screenshots, package_name, category, price, developer_id')
      .eq('developer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      return next(new ErrorResponse('Error fetching developer apps', 500));
    }

    if (!apps || apps.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        pagination: { total: 0, totalPages: 0, currentPage: 1 },
        data: [],
      });
    }

    // Get actual download counts from the downloads table
    const appIds = apps.map(app => app.id);

    const { data: downloadCounts, error: downloadError } = await supabase
      .from('downloads')
      .select('app_id')
      .in('app_id', appIds);

    if (downloadError) {
      console.error('Error fetching download counts:', downloadError);
    }

    // Create a map of app_id → download count
    const downloadMap = {};
    if (downloadCounts) {
      downloadCounts.forEach(row => {
        downloadMap[row.app_id] = (downloadMap[row.app_id] || 0) + 1;
      });
    }

    // Attach real download count to each app
    const appsWithDownloads = apps.map(app => ({
      ...app,
      downloads: downloadMap[app.id] || 0,
    }));

    // Pagination
    const pagination = {};
    const totalPages = Math.ceil(count / limit);

    if (page * limit < count) {
      pagination.next = { page: page + 1, limit };
    }
    if (page > 1) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({
      success: true,
      count: appsWithDownloads.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page,
      },
      data: appsWithDownloads,
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
    // Check if required files are present
    if (!req.files || !req.files.apk || !req.files.app_icon || !req.files.screenshots) {
      return next(new ErrorResponse('Please upload all required files (APK, app icon, and at least one screenshot)', 400));
    }

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
      is_premium = false,
      changelog = '',
      phone_permission = 'false',
      camera_permission = 'false',
      storage_permission = 'false',
      contacts_permission = 'false',
      location_permission = 'false',
      microphone_permission = 'false'
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'name', 'description', 'version', 'mini_android_version',
      'package_name', 'category'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return next(new ErrorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }

    // Convert string/boolean permissions to actual booleans
    const permissions = {
      phone: phone_permission === true || phone_permission === 'true',
      camera: camera_permission === true || camera_permission === 'true',
      storage: storage_permission === true || storage_permission === 'true',
      contacts: contacts_permission === true || contacts_permission === 'true',
      location: location_permission === true || location_permission === 'true',
      microphone: microphone_permission === true || microphone_permission === 'true'
    };
    
    console.log('Received permissions:', {
      phone_permission,
      camera_permission,
      storage_permission,
      contacts_permission,
      location_permission,
      microphone_permission,
      parsed: permissions
    });

    // Convert numeric fields to integers
    const numericFields = {
      min_sdk_version: parseInt(min_sdk_version) || null,
      target_sdk_version: parseInt(target_sdk_version) || null,
      price: parseFloat(price) || 0
    };

    // Check if package name already exists
    const { data: existingApp, error: packageCheckError } = await supabase
      .from('apps')
      .select('id')
      .eq('package_name', package_name)
      .single();

    if (existingApp && !packageCheckError) {
      return next(new ErrorResponse('An app with this package name already exists', 400));
    }

    // Upload APK file
    const apkFile = req.files.apk[0];
    const apkFileName = `${uuidv4()}${path.extname(apkFile.originalname)}`;
    const apkFilePath = `apps/${req.user.id}/${apkFileName}`;

    // Upload APK to Supabase Storage
    const { error: apkUploadError } = await supabase.storage
      .from('apps')
      .upload(apkFilePath, apkFile.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: apkFile.mimetype,
      });

    if (apkUploadError) {
      console.error('APK upload error:', apkUploadError);
      return next(new ErrorResponse(`Error uploading APK file: ${apkUploadError.message}`, 500));
    }

    // Upload App Icon
    const iconFile = req.files.app_icon[0];
    const iconFileName = `${uuidv4()}${path.extname(iconFile.originalname)}`;
    const iconFilePath = `app_icons/${req.user.id}/${iconFileName}`;

    const { error: iconUploadError } = await supabase.storage
      .from('app_icons')
      .upload(iconFilePath, iconFile.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: iconFile.mimetype,
      });

    if (iconUploadError) {
      // Clean up uploaded APK if icon upload fails
      await supabase.storage.from('apps').remove([apkFilePath]);
      return next(new ErrorResponse(`Error uploading app icon: ${iconUploadError.message}`, 500));
    }

    // Upload Screenshots
    const screenshotFiles = Array.isArray(req.files.screenshots) 
      ? req.files.screenshots 
      : [req.files.screenshots];
    
    const screenshotUrls = [];
    const screenshotPaths = []; // For cleanup on error
    
    for (const screenshot of screenshotFiles) {
      const screenshotFileName = `${uuidv4()}${path.extname(screenshot.originalname)}`;
      const screenshotFilePath = `app_screenshots/${req.user.id}/${screenshotFileName}`;
      
      const { error: screenshotError } = await supabase.storage
        .from('app_screenshots')
        .upload(screenshotFilePath, screenshot.buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: screenshot.mimetype,
        });
      
      if (screenshotError) {
        // Clean up previously uploaded files
        await Promise.all([
          supabase.storage.from('apps').remove([apkFilePath]),
          supabase.storage.from('app_icons').remove([iconFilePath]),
          supabase.storage.from('app_screenshots').remove(screenshotPaths)
        ]);
        
        return next(new ErrorResponse(`Error uploading screenshots: ${screenshotError.message}`, 500));
      }
      
      // Get public URL for screenshot
      const { data: { publicUrl: screenshotUrl } } = supabase.storage
        .from('app_screenshots')
        .getPublicUrl(screenshotFilePath);
      
      screenshotUrls.push(screenshotUrl);
      screenshotPaths.push(screenshotFilePath);
    }

    // Get public URLs
    const { data: { publicUrl: apkUrl } } = supabase.storage
      .from('apps')
      .getPublicUrl(apkFilePath);

    const { data: { publicUrl: iconUrl } } = supabase.storage
      .from('app_icons')
      .getPublicUrl(iconFilePath);

    // Create app in database
    const { data: app, error: dbError } = await supabase
      .from('apps')
      .insert([
        {
          name,
          description,
          short_description: short_description || description.substring(0, 100) + '...',
          version,
          mini_android_version,
          min_sdk_version: numericFields.min_sdk_version,
          target_sdk_version: numericFields.target_sdk_version,
          package_name,
          category,
          price: numericFields.price,
          is_premium: is_premium === 'true',
          changelog: changelog || `Initial release of ${name} v${version}`,
          icon_url: iconUrl,
          screenshots: screenshotUrls,
          file_path: apkFilePath,
          download_url: apkUrl,
          file_size: apkFile.size,
          downloads: 0,
          views: 0,
          average_rating: 0,
          review_count: 0,
          status: 'pending',
          rejection_reason: null,
          developer_id: req.user.id,
          reviewed_by: null,
          reviewed_at: null,
          permissions: permissions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ])
      .select()
      .single();

    if (dbError) {
      // Clean up all uploaded files if database insert fails
      await Promise.all([
        supabase.storage.from('apps').remove([apkFilePath]),
        supabase.storage.from('app_icons').remove([iconFilePath]),
        supabase.storage.from('app_screenshots').remove(screenshotPaths)
      ]);
      
      return next(new ErrorResponse(`Error creating app: ${dbError.message}`, 500));
    }

    res.status(201).json({
      success: true,
      data: app,
    });
  } catch (error) {
    console.error('Upload app error:', error);
    next(error);
  }
};

// @desc    Update app
// @route   PUT /api/developer/apps/:id
// @access  Private/Developer
exports.updateApp = async (req, res, next) => {
  try {
    // Get app by ID
    const { data: existingApp, error: fetchError } = await supabase
      .from('apps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existingApp) {
      return next(new ErrorResponse('App not found', 404));
    }

    // Check if the authenticated user is the owner of the app
    if (existingApp.developer_id !== req.user.id) {
      return next(new ErrorResponse('Not authorized to update this app', 403));
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
      remove_screenshots = '[]' // Expecting JSON string of screenshot indices to remove
    } = req.body;

    // Start building update data
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
      is_premium: is_premium === 'true',
      changelog: changelog || existingApp.changelog,
      status: 'pending', // Reset status to pending on update
      updated_at: new Date().toISOString()
    };

    // Handle permissions - support both string and boolean values
    const permissions = existingApp.permissions || {};
    if (phone_permission !== undefined) permissions.phone = phone_permission === true || phone_permission === 'true';
    if (camera_permission !== undefined) permissions.camera = camera_permission === true || camera_permission === 'true';
    if (storage_permission !== undefined) permissions.storage = storage_permission === true || storage_permission === 'true';
    if (contacts_permission !== undefined) permissions.contacts = contacts_permission === true || contacts_permission === 'true';
    if (location_permission !== undefined) permissions.location = location_permission === true || location_permission === 'true';
    if (microphone_permission !== undefined) permissions.microphone = microphone_permission === true || microphone_permission === 'true';
    
    console.log('Update - Received permissions:', {
      phone_permission,
      camera_permission,
      storage_permission,
      contacts_permission,
      location_permission,
      microphone_permission,
      parsed: permissions
    });
    
    updateData.permissions = permissions;

    // Handle file uploads
    const filesToCleanup = []; // Track files to clean up in case of errors

    try {
      // Handle APK update
      if (req.files && req.files.apk && req.files.apk[0]) {
        const apkFile = req.files.apk[0];
        const apkFileName = `${uuidv4()}${path.extname(apkFile.originalname)}`;
        const apkFilePath = `apps/${req.user.id}/${apkFileName}`;

        // Upload new APK
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

        // Get public URL for new APK
        const { data: { publicUrl: apkUrl } } = supabase.storage
          .from('apps')
          .getPublicUrl(apkFilePath);

        // Update app data with new APK info
        updateData.file_path = apkFilePath;
        updateData.download_url = apkUrl;
        updateData.file_size = apkFile.size;

        // Schedule old APK for cleanup
        if (existingApp.file_path) {
          filesToCleanup.push({ bucket: 'apps', path: existingApp.file_path });
        }
      }

      // Handle app icon update
      if (req.files && req.files.app_icon && req.files.app_icon[0]) {
        const iconFile = req.files.app_icon[0];
        const iconFileName = `${uuidv4()}${path.extname(iconFile.originalname)}`;
        const iconFilePath = `app_icons/${req.user.id}/${iconFileName}`;

        // Upload new icon
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

        // Get public URL for new icon
        const { data: { publicUrl: iconUrl } } = supabase.storage
          .from('app_icons')
          .getPublicUrl(iconFilePath);

        updateData.icon_url = iconUrl;

        // Schedule old icon for cleanup - extract path from URL correctly
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

      // Handle screenshots
      let screenshots = [...(existingApp.screenshots || [])];

      // Remove screenshots if specified
      if (remove_screenshots) {
        try {
          const indicesToRemove = JSON.parse(remove_screenshots);
          if (Array.isArray(indicesToRemove)) {
            // Remove screenshots in reverse order to avoid index shifting
            indicesToRemove
              .sort((a, b) => b - a) // Sort in descending order
              .forEach(index => {
                if (screenshots[index]) {
                  filesToCleanup.push({ 
                    bucket: 'app_screenshots', 
                    path: screenshots[index] 
                  });
                  screenshots.splice(index, 1);
                }
              });
          }
        } catch (e) {
          console.error('Error parsing remove_screenshots:', e);
        }
      }

      // Add new screenshots
      if (req.files && req.files.screenshots) {
        const screenshotFiles = Array.isArray(req.files.screenshots) 
          ? req.files.screenshots 
          : [req.files.screenshots];

        for (const screenshot of screenshotFiles) {
          const screenshotFileName = `${uuidv4()}${path.extname(screenshot.originalname)}`;
          const screenshotFilePath = `app_screenshots/${req.user.id}/${screenshotFileName}`;

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

          // Get public URL for screenshot
          const { data: { publicUrl: screenshotUrl } } = supabase.storage
            .from('app_screenshots')
            .getPublicUrl(screenshotFilePath);

          screenshots.push(screenshotUrl);
        }
      }

      // Update screenshots array if it was modified
      if (screenshots.length > 0) {
        updateData.screenshots = screenshots;
      }

      // Update app in database
      const { data: updatedApp, error: updateError } = await supabase
        .from('apps')
        .update(updateData)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }

      // Clean up old files if new ones were uploaded successfully
      if (filesToCleanup.length > 0) {
        await Promise.all(
          filesToCleanup.map(async ({ bucket, path }) => {
            try {
              await supabase.storage.from(bucket).remove([path]);
            } catch (cleanupError) {
              console.error(`Error cleaning up ${bucket}/${path}:`, cleanupError);
            }
          })
        );
      }

      res.status(200).json({
        success: true,
        data: updatedApp,
      });

    } catch (error) {
      // Clean up any uploaded files if there was an error
      if (filesToCleanup.length > 0) {
        await Promise.all(
          filesToCleanup.map(async ({ bucket, path }) => {
            try {
              await supabase.storage.from(bucket).remove([path]);
            } catch (cleanupError) {
              console.error(`Error cleaning up ${bucket}/${path} after error:`, cleanupError);
            }
          })
        );
      }
      throw error; // This will be caught by the outer catch block
    }

  } catch (error) {
    console.error('Update app error:', error);
    next(new ErrorResponse(error.message || 'Error updating app', 500));
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
    const filePath = `app_icons/${req.user.id}/${fileName}`;

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
      const filePath = `app_screenshots/${req.user.id}/${fileName}`;

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

// @desc    Get analytics overview for a specific app
// @route   GET /api/developers/analytics/app/:appId
// @access  Private/Developer
exports.getAppAnalytics = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { period = '30' } = req.query; // Default to 30 days

    // Verify app ownership
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, developer_id, name, downloads, views, average_rating, review_count, price, created_at')
      .eq('id', appId)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found', 404));
    }

    if (app.developer_id !== req.user.id) {
      return next(new ErrorResponse('Not authorized to view analytics for this app', 403));
    }

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get downloads over time
    const { data: downloadsOverTime, error: downloadsError } = await supabase
      .from('app_analytics')
      .select('date, downloads_count, views_count, revenue')
      .eq('app_id', appId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (downloadsError) {
      console.error('Downloads error:', downloadsError);
    }

    // Get active users count (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeUsersData, error: activeUsersError } = await supabase
      .from('app_usage_analytics')
      .select('user_id')
      .eq('app_id', appId)
      .gte('last_active_at', thirtyDaysAgo.toISOString());

    const activeUsers30d = activeUsersData 
      ? new Set(activeUsersData.map(u => u.user_id)).size 
      : 0;

    // Calculate retention rate
    const { data: totalDownloadsData, error: totalDownloadsError } = await supabase
      .from('downloads')
      .select('user_id, downloaded_at')
      .eq('app_id', appId);

    const totalUniqueDownloaders = totalDownloadsData 
      ? new Set(totalDownloadsData.map(d => d.user_id)).size 
      : 0;

    const retentionRate = totalUniqueDownloaders > 0 
      ? ((activeUsers30d / totalUniqueDownloaders) * 100).toFixed(1)
      : 0;

    // Calculate crash rate
    const { data: usageData, error: usageError } = await supabase
      .from('app_usage_analytics')
      .select('sessions_count, crash_count')
      .eq('app_id', appId)
      .gte('date', startDate.toISOString().split('T')[0]);

    let totalSessions = 0;
    let totalCrashes = 0;

    if (usageData) {
      usageData.forEach(record => {
        totalSessions += record.sessions_count || 0;
        totalCrashes += record.crash_count || 0;
      });
    }

    const crashRate = totalSessions > 0 
      ? ((totalCrashes / totalSessions) * 100).toFixed(2)
      : 0;

    // Calculate total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('app_analytics')
      .select('revenue')
      .eq('app_id', appId);

    const totalRevenue = revenueData 
      ? revenueData.reduce((sum, record) => sum + parseFloat(record.revenue || 0), 0)
      : 0;

    // Calculate this month's revenue
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthRevenueData, error: monthRevenueError } = await supabase
      .from('app_analytics')
      .select('revenue')
      .eq('app_id', appId)
      .gte('date', firstDayOfMonth.toISOString().split('T')[0]);

    const thisMonthRevenue = monthRevenueData 
      ? monthRevenueData.reduce((sum, record) => sum + parseFloat(record.revenue || 0), 0)
      : 0;

    // Format downloads over time data
    const downloadsChart = downloadsOverTime || [];

    res.status(200).json({
      success: true,
      data: {
        appName: app.name,
        performance: {
          totalDownloads: app.downloads || 0,
          activeUsers30d: activeUsers30d,
          retentionRate: parseFloat(retentionRate),
          crashRate: parseFloat(crashRate),
        },
        revenue: {
          total: parseFloat(totalRevenue).toFixed(2),
          thisMonth: parseFloat(thisMonthRevenue).toFixed(2),
        },
        downloadsOverTime: downloadsChart.map(item => ({
          date: item.date,
          downloads: item.downloads_count || 0,
          views: item.views_count || 0,
          revenue: parseFloat(item.revenue || 0).toFixed(2),
        })),
        metadata: {
          views: app.views || 0,
          rating: parseFloat(app.average_rating || 0).toFixed(1),
          reviewCount: app.review_count || 0,
          createdAt: app.created_at,
        }
      }
    });
  } catch (error) {
    console.error('Get app analytics error:', error);
    next(error);
  }
};

// @desc    Get analytics overview for all developer apps
// @route   GET /api/developers/analytics/overview
// @access  Private/Developer
exports.getDeveloperAnalyticsOverview = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;

    // Get all developer apps
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('id, name, downloads, average_rating, review_count, price, status, created_at')
      .eq('developer_id', req.user.id)
      .order('downloads', { ascending: false });

    if (appsError) {
      return next(new ErrorResponse('Error fetching developer apps', 500));
    }

    if (!apps || apps.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalApps: 0,
          totalDownloads: 0,
          totalRevenue: 0,
          averageRating: 0,
          apps: [],
        }
      });
    }

    const appIds = apps.map(app => app.id);

    // Calculate total downloads
    const totalDownloads = apps.reduce((sum, app) => sum + (app.downloads || 0), 0);

    // Calculate average rating
    const appsWithRatings = apps.filter(app => app.review_count > 0);
    const averageRating = appsWithRatings.length > 0
      ? (apps.reduce((sum, app) => sum + (parseFloat(app.average_rating) || 0), 0) / apps.length)
      : 0;

    // Get total revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('app_analytics')
      .select('revenue')
      .in('app_id', appIds);

    const totalRevenue = revenueData 
      ? revenueData.reduce((sum, record) => sum + parseFloat(record.revenue || 0), 0)
      : 0;

    // Get analytics for each app
    const appsWithAnalytics = await Promise.all(
      apps.slice(0, 10).map(async (app) => { // Limit to top 10 apps
        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        // Get downloads trend
        const { data: analytics, error: analyticsError } = await supabase
          .from('app_analytics')
          .select('downloads_count')
          .eq('app_id', app.id)
          .gte('date', startDate.toISOString().split('T')[0]);

        const periodDownloads = analytics 
          ? analytics.reduce((sum, record) => sum + (record.downloads_count || 0), 0)
          : 0;

        return {
          id: app.id,
          name: app.name,
          downloads: app.downloads || 0,
          periodDownloads,
          rating: parseFloat(app.average_rating || 0).toFixed(1),
          reviewCount: app.review_count || 0,
          status: app.status,
          createdAt: app.created_at,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalApps: apps.length,
        totalDownloads,
        totalRevenue: parseFloat(totalRevenue).toFixed(2),
        averageRating: averageRating.toFixed(1),
        apps: appsWithAnalytics,
      }
    });
  } catch (error) {
    console.error('Get developer analytics overview error:', error);
    next(error);
  }
};

// @desc    Report app usage (for mobile apps to track sessions and crashes)
// @route   POST /api/developers/analytics/usage
// @access  Public (with app authentication)
exports.reportAppUsage = async (req, res, next) => {
  try {
    const { 
      app_id, 
      user_id, 
      session_started = false,
      crash_occurred = false,
      usage_minutes = 0 
    } = req.body;

    if (!app_id || !user_id) {
      return next(new ErrorResponse('App ID and User ID are required', 400));
    }

    const today = new Date().toISOString().split('T')[0];

    // Get or create usage record for today
    const { data: existingUsage, error: fetchError } = await supabase
      .from('app_usage_analytics')
      .select('*')
      .eq('app_id', app_id)
      .eq('user_id', user_id)
      .eq('date', today)
      .single();

    if (existingUsage) {
      // Update existing record
      const { data: updatedUsage, error: updateError } = await supabase
        .from('app_usage_analytics')
        .update({
          sessions_count: session_started 
            ? (existingUsage.sessions_count || 0) + 1 
            : existingUsage.sessions_count,
          crash_count: crash_occurred 
            ? (existingUsage.crash_count || 0) + 1 
            : existingUsage.crash_count,
          total_usage_minutes: (existingUsage.total_usage_minutes || 0) + usage_minutes,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('app_id', app_id)
        .eq('user_id', user_id)
        .eq('date', today)
        .select()
        .single();

      if (updateError) {
        return next(new ErrorResponse('Error updating usage analytics', 500));
      }
    } else {
      // Create new record
      const { data: newUsage, error: insertError } = await supabase
        .from('app_usage_analytics')
        .insert([{
          app_id,
          user_id,
          date: today,
          sessions_count: session_started ? 1 : 0,
          crash_count: crash_occurred ? 1 : 0,
          total_usage_minutes: usage_minutes,
          last_active_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertError) {
        return next(new ErrorResponse('Error creating usage analytics', 500));
      }
    }

    // Update app_analytics daily summary
    const { data: dailyAnalytics, error: dailyError } = await supabase
      .from('app_analytics')
      .select('*')
      .eq('app_id', app_id)
      .eq('date', today)
      .single();

    if (dailyAnalytics) {
      await supabase
        .from('app_analytics')
        .update({
          session_count: session_started 
            ? (dailyAnalytics.session_count || 0) + 1 
            : dailyAnalytics.session_count,
          crash_count: crash_occurred 
            ? (dailyAnalytics.crash_count || 0) + 1 
            : dailyAnalytics.crash_count,
          updated_at: new Date().toISOString(),
        })
        .eq('app_id', app_id)
        .eq('date', today);
    } else {
      await supabase
        .from('app_analytics')
        .insert([{
          app_id,
          date: today,
          session_count: session_started ? 1 : 0,
          crash_count: crash_occurred ? 1 : 0,
        }]);
    }

    res.status(200).json({
      success: true,
      message: 'Usage data recorded successfully',
    });
  } catch (error) {
    console.error('Report app usage error:', error);
    next(error);
  }
};

// @desc    Get revenue breakdown
// @route   GET /api/developers/analytics/revenue
// @access  Private/Developer
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '30', appId } = req.query;

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    let query = supabase
      .from('app_analytics')
      .select('date, revenue, app_id, apps(name)')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // If appId provided, filter by app
    if (appId) {
      // Verify app ownership
      const { data: app, error: appError } = await supabase
        .from('apps')
        .select('developer_id')
        .eq('id', appId)
        .single();

      if (appError || !app || app.developer_id !== req.user.id) {
        return next(new ErrorResponse('App not found or not authorized', 403));
      }

      query = query.eq('app_id', appId);
    } else {
      // Get all developer apps
      const { data: apps, error: appsError } = await supabase
        .from('apps')
        .select('id')
        .eq('developer_id', req.user.id);

      if (appsError || !apps || apps.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            total: 0,
            breakdown: [],
            trend: [],
          }
        });
      }

      const appIds = apps.map(app => app.id);
      query = query.in('app_id', appIds);
    }

    const { data: revenueData, error: revenueError } = await query;

    if (revenueError) {
      return next(new ErrorResponse('Error fetching revenue data', 500));
    }

    const total = revenueData 
      ? revenueData.reduce((sum, record) => sum + parseFloat(record.revenue || 0), 0)
      : 0;

    // Group by date for trend
    const trendMap = {};
    revenueData?.forEach(record => {
      if (!trendMap[record.date]) {
        trendMap[record.date] = 0;
      }
      trendMap[record.date] += parseFloat(record.revenue || 0);
    });

    const trend = Object.keys(trendMap).map(date => ({
      date,
      revenue: parseFloat(trendMap[date]).toFixed(2),
    }));

    // Group by app for breakdown
    const breakdownMap = {};
    revenueData?.forEach(record => {
      const appName = record.apps?.name || 'Unknown';
      if (!breakdownMap[appName]) {
        breakdownMap[appName] = 0;
      }
      breakdownMap[appName] += parseFloat(record.revenue || 0);
    });

    const breakdown = Object.keys(breakdownMap).map(appName => ({
      appName,
      revenue: parseFloat(breakdownMap[appName]).toFixed(2),
    }));

    res.status(200).json({
      success: true,
      data: {
        total: parseFloat(total).toFixed(2),
        breakdown,
        trend,
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    next(error);
  }
};

// @desc    Get recent activity (downloads and reviews) for developer apps
// @route   GET /api/developers/recent-activity
// @access  Private/Developer
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = '20', type } = req.query; // type can be 'downloads', 'reviews', or 'all'
    const activityLimit = parseInt(limit);

    // Get all developer apps
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('id, name, icon_url')
      .eq('developer_id', req.user.id);

    if (appsError) {
      return next(new ErrorResponse('Error fetching developer apps', 500));
    }

    if (!apps || apps.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          activities: [],
          total: 0,
        }
      });
    }

    const appIds = apps.map(app => app.id);
    const appMap = {};
    apps.forEach(app => {
      appMap[app.id] = { name: app.name, icon_url: app.icon_url };
    });

    let activities = [];

    // Fetch recent downloads if type is 'downloads' or 'all'
    if (!type || type === 'all' || type === 'downloads') {
      const { data: downloads, error: downloadsError } = await supabase
        .from('downloads')
        .select(`
          id,
          app_id,
          user_id,
          version_downloaded,
          downloaded_at,
          users:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .in('app_id', appIds)
        .order('downloaded_at', { ascending: false })
        .limit(activityLimit);

      if (!downloadsError && downloads) {
        downloads.forEach(download => {
          activities.push({
            id: download.id,
            type: 'download',
            app_id: download.app_id,
            app_name: appMap[download.app_id]?.name || 'Unknown App',
            app_icon: appMap[download.app_id]?.icon_url,
            user_id: download.user_id,
            user_name: download.users?.raw_user_meta_data?.name || download.users?.email || 'Unknown User',
            user_email: download.users?.email,
            version: download.version_downloaded,
            timestamp: download.downloaded_at,
            created_at: download.downloaded_at,
          });
        });
      }
    }

    // Fetch recent reviews if type is 'reviews' or 'all'
    if (!type || type === 'all' || type === 'reviews') {
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          app_id,
          user_id,
          rating,
          comment,
          created_at,
          updated_at,
          users:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .in('app_id', appIds)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(activityLimit);

      if (!reviewsError && reviews) {
        reviews.forEach(review => {
          activities.push({
            id: review.id,
            type: 'review',
            app_id: review.app_id,
            app_name: appMap[review.app_id]?.name || 'Unknown App',
            app_icon: appMap[review.app_id]?.icon_url,
            user_id: review.user_id,
            user_name: review.users?.raw_user_meta_data?.name || review.users?.email || 'Unknown User',
            user_email: review.users?.email,
            rating: review.rating,
            comment: review.comment,
            timestamp: review.created_at,
            created_at: review.created_at,
            updated_at: review.updated_at,
          });
        });
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit the combined results
    activities = activities.slice(0, activityLimit);

    res.status(200).json({
      success: true,
      data: {
        activities,
        total: activities.length,
        filter: type || 'all',
      }
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    next(error);
  }
};
