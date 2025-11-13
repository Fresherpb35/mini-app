const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Send push notification to users
// @route   POST /api/admin/notifications/push
// @access  Private/Admin
exports.sendPushNotification = async (req, res, next) => {
  try {
    const { title, message, userIds, type = 'general', appId } = req.body;

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
      status: 'sent'
    };

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (notificationError) {
      return next(new ErrorResponse('Error creating notification', 500));
    }

    // If specific user IDs provided, send to those users
    if (userIds && userIds.length > 0) {
      const userNotifications = userIds.map(userId => ({
        notification_id: notification.id,
        user_id: userId,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error: userNotificationError } = await supabase
        .from('user_notifications')
        .insert(userNotifications);

      if (userNotificationError) {
        console.error('Error creating user notifications:', userNotificationError);
      }
    } else {
      // Send to all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'active');

      if (!usersError && users) {
        const userNotifications = users.map(user => ({
          notification_id: notification.id,
          user_id: user.id,
          read: false,
          created_at: new Date().toISOString()
        }));

        const { error: userNotificationError } = await supabase
          .from('user_notifications')
          .insert(userNotifications);

        if (userNotificationError) {
          console.error('Error creating user notifications:', userNotificationError);
        }
      }
    }

    // In a real implementation, you would integrate with a push notification service
    // like Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs)
    console.log(`Push notification sent: ${title} - ${message}`);

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

    const { data: notification, error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !notification) {
      return next(new ErrorResponse('Notification not found', 404));
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
    // Get total notifications sent
    const { count: totalSent, error: sentError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    if (sentError) {
      console.error('Error fetching sent notifications:', sentError);
    }

    // Get total notifications read
    const { count: totalRead, error: readError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', true);

    if (readError) {
      console.error('Error fetching read notifications:', readError);
    }

    // Get total user notifications
    const { count: totalUserNotifications, error: userNotificationError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true });

    if (userNotificationError) {
      console.error('Error fetching user notifications:', userNotificationError);
    }

    const readRate = totalUserNotifications > 0 
      ? ((totalRead / totalUserNotifications) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        total_sent: totalSent || 0,
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
