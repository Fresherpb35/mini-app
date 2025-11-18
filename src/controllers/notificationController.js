const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { createClient } = require('@supabase/supabase-js');
const { RealtimeClient } = require('@supabase/realtime-js');

// @desc    Get all notifications (Admin only)
// @route   GET /api/notifications
// @access  Private/Admin
exports.getNotifications = async (req, res, next) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*');

    if (error) throw error;

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification to app users
// @route   POST /api/developers/apps/:appId/notifications
// @access  Private/Developer
exports.sendAppNotification = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { title, message, data = {} } = req.body;
    const developerId = req.user.id;

    // 1. Verify the app belongs to the developer
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, developer_id')
      .eq('id', appId)
      .eq('developer_id', developerId)
      .single();

    if (appError || !app) {
      return next(new ErrorResponse('App not found or you do not have permission', 404));
    }

    // 2. Get all users who downloaded the app
    const { data: downloads, error: downloadsError } = await supabase
      .from('downloads')
      .select('user_id')
      .eq('app_id', appId)

    if (downloadsError) {
      console.error('Error fetching app downloads:', downloadsError);
      return next(new ErrorResponse('Error fetching app users', 500));
    }

    if (!downloads || downloads.length === 0) {
      return next(new ErrorResponse('No users found for this app', 404));
    }

    const userIds = [...new Set(downloads.map(d => d.user_id))];

    // 3. Create notification record
    const notificationData = {
      title,
      message,
      type: 'app_update',
      app_id: appId,
      sent_by: developerId,
      sent_at: new Date().toISOString(),
      status: 'sent',
      target_audience: 'users',
      expires_at: data?.expires_at || null
    };

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return next(new ErrorResponse('Error creating notification', 500));
    }

    // 4. Create user notifications
    const userNotifications = userIds.map(userId => ({
      notification_id: notification.id,
      user_id: userId,
      read: false,
      created_at: new Date().toISOString()
    }));

    const { data: insertedNotifications, error: userNotificationError } = await supabase
      .from('user_notifications')
      .insert(userNotifications)
      .select('*');

    if (userNotificationError) {
      console.error('Error creating user notifications:', userNotificationError);
      return next(new ErrorResponse('Error sending notifications', 500));
    }

    // 5. Send real-time notifications
    await Promise.all(
      userIds.map(userId => 
        realtimeClient.channel(`user_${userId}`).send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            notification: {
              ...notification,
              user_notification_id: insertedNotifications.find(n => n.user_id === userId)?.id,
              read: false,
              metadata: data
            }
          }
        })
      )
    );

    res.status(200).json({
      success: true,
      message: `Notification sent to ${userIds.length} users`,
      data: notification
    });

  } catch (error) {
    console.error('Error in sendAppNotification:', error);
    next(error);
  }
};

// Initialize Realtime client
const realtimeClient = new RealtimeClient(process.env.SUPABASE_URL.replace('/rest/v1', ''), {
  params: {
    apikey: process.env.SUPABASE_ANON_KEY,
  },
  eventsPerSecond: 10,
});

// @desc    Send push notification to users
// @route   POST /api/notifications/push
// @access  Private/Admin
exports.sendPushNotification = async (req, res, next) => {
  try {
    const { title, message, userIds, type = 'general', appId, data = {} } = req.body;

    if (!title || !message) {
      return next(new ErrorResponse('Title and message are required', 400));
    }

    // Create notification record
    const notificationData = {
      title,
      message,
      type,
      app_id: appId || null,
      sent_by: req.user.id,
      sent_at: new Date().toISOString(),
      status: 'sent',
      target_audience: userIds && userIds.length > 0 ? 'specific' : 'all',
      expires_at: data?.expires_at || null
    };
    
    // Store any additional data in a separate table if needed
    const notificationMeta = {
      ...data,
      expires_at: undefined // Remove expires_at as it's already in the main table
    };
    
    // Remove any undefined values
    Object.keys(notificationMeta).forEach(key => 
      notificationMeta[key] === undefined && delete notificationMeta[key]
    );

    // First, log the data we're trying to insert for debugging
    console.log('Creating notification with data:', JSON.stringify(notificationData, null, 2));
    
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', {
        message: notificationError.message,
        details: notificationError.details,
        hint: notificationError.hint,
        code: notificationError.code
      });
      return next(new ErrorResponse(`Error creating notification: ${notificationError.message}`, 500));
    }

    // If specific user IDs provided, validate them first
    if (userIds && userIds.length > 0) {
      // Ensure userIds is an array of valid UUIDs
      if (!Array.isArray(userIds)) {
        return next(new ErrorResponse('userIds must be an array', 400));
      }
      
      // Validate each user ID
      const { data: validUsers, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .in('id', userIds);

      if (userCheckError) {
        console.error('Error validating user IDs:', userCheckError);
        return next(new ErrorResponse('Error validating user IDs', 400));
      }

      if (validUsers.length !== userIds.length) {
        return next(new ErrorResponse('One or more user IDs are invalid', 400));
      }
      const userNotifications = userIds.map(userId => ({
        notification_id: notification.id,
        user_id: userId,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { data: insertedNotifications, error: userNotificationError } = await supabase
        .from('user_notifications')
        .insert(userNotifications)
        .select('*, notification:notifications(*, app:apps(id, name, icon_url))');

      if (userNotificationError) {
        console.error('Error creating user notifications:', userNotificationError);
        return next(new ErrorResponse('Error sending notifications', 500));
      }

      // Store notification metadata if there's any
      if (Object.keys(notificationMeta).length > 0) {
        const metaRecords = Object.entries(notificationMeta).map(([key, value]) => ({
          notification_id: notification.id,
          meta_key: key,
          meta_value: value,
          created_at: new Date().toISOString()
        }));
        
        const { error: metaError } = await supabase
          .from('notification_metadata')
          .insert(metaRecords);
          
        if (metaError) {
          console.error('Error saving notification metadata:', metaError);
        }
      }

      // Send real-time notifications to specific users
      await Promise.all(
        userIds.map(userId => 
          realtimeClient.channel(`user_${userId}`).send({
            type: 'broadcast',
            event: 'new_notification',
            payload: {
              notification: {
                ...notification,
                metadata: notificationMeta,
                user_notification_id: insertedNotifications.find(n => n.user_id === userId)?.id,
                read: false
              }
            }
          })
        )
      );
    } else {
      // Send to all active users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'active');

      if (usersError) {
        console.error('Error fetching active users:', usersError);
        return next(new ErrorResponse('Error fetching users', 500));
      }

      if (users && users.length > 0) {
        const userNotifications = users.map(user => ({
          notification_id: notification.id,
          user_id: user.id,
          read: false,
          created_at: new Date().toISOString()
        }));

        const { data: insertedNotifications, error: userNotificationError } = await supabase
          .from('user_notifications')
          .insert(userNotifications)
          .select('*, notification:notifications(*, app:apps(id, name, icon_url))');

        if (userNotificationError) {
          console.error('Error creating user notifications:', userNotificationError);
          return next(new ErrorResponse('Error sending notifications', 500));
        }

        // Send real-time notification to all users
        await realtimeClient.channel('broadcast').send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            notification: {
              ...notification,
              user_notification_id: insertedNotifications[0]?.id,
              read: false
            }
          }
        });
      }
    }

    // Also send push notifications using Supabase Edge Functions (if configured)
    try {
      const { data: pushResponse, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          message,
          userIds: userIds || 'all',
          data: {
            ...data,
            notificationId: notification.id,
            type,
            appId: appId || null
          }
        }
      });

      if (pushError) {
        console.error('Error sending push notification:', pushError);
      } else {
        console.log('Push notification sent via Edge Function:', pushResponse);
      }
    } catch (pushError) {
      console.error('Push notification error (non-critical):', pushError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user notifications
// @route   GET /api/user/notifications
// @access  Private
exports.getUserNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const { data: notifications, error, count } = await supabase
      .from('user_notifications')
      .select(`
        *,
        notification:notifications (
          id,
          title,
          message,
          type,
          app:apps (id, name, icon_url),
          sent_at
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(startIndex, endIndex - 1);

    if (error) {
      return next(new ErrorResponse('Error fetching notifications', 500));
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
      count: notifications.length,
      pagination: {
        ...pagination,
        total: count,
        totalPages,
        currentPage: page,
      },
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/user/notifications/:id/read
// @access  Private
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First get the notification to check if it exists and belongs to the user
    const { data: existingNotification, error: fetchError } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('notification_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingNotification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // If already read, just return success
    if (existingNotification.read) {
      return res.status(200).json({
        success: true,
        data: existingNotification
      });
    }

    // Mark as read
    const { data: notification, error } = await supabase
      .from('user_notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('notification_id', id)
      .eq('user_id', req.user.id)
      .select('*, notification:notifications(*, app:apps(id, name, icon_url))')
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return next(new ErrorResponse('Error updating notification', 500));
    }

    // Emit real-time event that notification was read
    try {
      await realtimeClient.channel(`user_${req.user.id}`).send({
        type: 'broadcast',
        event: 'notification_read',
        payload: {
          notificationId: notification.id,
          readAt: notification.read_at
        }
      });
    } catch (realtimeError) {
      console.error('Error sending real-time update:', realtimeError);
      // Non-critical error, continue
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/user/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('read', false);

    if (error) {
      return next(new ErrorResponse('Error marking notifications as read', 500));
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification statistics
// @route   GET /api/admin/notifications/stats
// @access  Private/Admin
exports.getNotificationStats = async (req, res, next) => {
  try {
    // Get total notifications count
    const { count: totalCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error fetching notification count:', countError);
      throw countError;
    }

    // Get total notifications read
    const { count: totalRead, error: readError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', true);

    if (readError) {
      console.error('Error fetching read notifications:', readError);
      throw readError;
    }

    // Get total user notifications
    const { count: totalUserNotifications, error: userNotificationError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true });

    if (userNotificationError) {
      console.error('Error fetching user notifications:', userNotificationError);
      throw userNotificationError;
    }

    const readRate = totalUserNotifications > 0 
      ? ((totalRead / totalUserNotifications) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        total_notifications: totalCount || 0,
        total_delivered: totalUserNotifications || 0,
        total_read: totalRead || 0,
        read_rate: `${readRate}%`,
        unread: (totalUserNotifications || 0) - (totalRead || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};
