const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ErrorResponse } = require('./errorMiddleware');

// Configure storage for uploaded files
const storage = multer.memoryStorage();

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedFileTypes = {
    'application/vnd.android.package-archive': 'apk',
    'application/octet-stream': 'apk', 
    'application/x-apk': 'apk', // Alternative APK MIME type
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  // Check if the file type is allowed
  if (allowedFileTypes[file.mimetype]) {
    return cb(null, true);
  }

  // Reject file if type is not allowed
  cb(
    new ErrorResponse(
      `Invalid file type. Only ${Object.values(allowedFileTypes).join(
        ', '
      )} files are allowed.`,
      400
    ),
    false
  );
};

// Configure multer upload with specific limits for different file types
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size for APK
    files: 7, // Max 7 files (1 APK + 1 icon + 5 screenshots)
  },
});

// Custom error handler for multer
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ErrorResponse('File too large. Maximum size is 100MB for APK and 5MB for images', 413));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ErrorResponse('Too many files uploaded', 413));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ErrorResponse('Unexpected file field', 400));
    }
  } else if (err) {
    return next(err);
  }
  next();
};

// Middleware to handle file uploads
const handleFileUpload = (fieldName, maxCount = 1) => {
  return (req, res, next) => {
    const uploadHandler = upload.array(fieldName, maxCount);

    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ErrorResponse('File size too large. Maximum 100MB allowed.', 400));
        }
        return next(new ErrorResponse(err.message, 400));
      } else if (err) {
        // An unknown error occurred
        return next(err);
      }

      // If no files were uploaded
      if (!req.files || req.files.length === 0) {
        return next(new ErrorResponse(`No ${fieldName} uploaded`, 400));
      }

      // Add file metadata to request object
      req.uploadedFiles = req.files.map((file) => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        fieldname: file.fieldname,
      }));

      next();
    });
  };
};

// Middleware to handle single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);

    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ErrorResponse('File size too large. Maximum 100MB allowed.', 400));
        }
        return next(new ErrorResponse(err.message, 400));
      } else if (err) {
        // An unknown error occurred
        return next(err);
      }

      // If no file was uploaded
      if (!req.file) {
        return next(new ErrorResponse(`No ${fieldName} uploaded`, 400));
      }

      // Add file metadata to request object
      req.uploadedFile = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
        fieldname: req.file.fieldname,
      };

      next();
    });
  };
};

// Middleware to handle multiple file uploads
const uploadMultiple = (fieldName, maxCount) => {
  return handleFileUpload(fieldName, maxCount);
};

// Middleware to validate file type
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.uploadedFile && (!req.uploadedFiles || req.uploadedFiles.length === 0)) {
      return next(new ErrorResponse('No files uploaded', 400));
    }

    const files = req.uploadedFile ? [req.uploadedFile] : req.uploadedFiles;
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return next(
          new ErrorResponse(
            `Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`,
            400
          )
        );
      }
    }

    next();
  };
};

// Middleware to validate file size
const validateFileSize = (maxSizeInBytes) => {
  return (req, res, next) => {
    if (!req.uploadedFile && (!req.uploadedFiles || req.uploadedFiles.length === 0)) {
      return next(new ErrorResponse('No files uploaded', 400));
    }

    const files = req.uploadedFile ? [req.uploadedFile] : req.uploadedFiles;
    
    for (const file of files) {
      if (file.size > maxSizeInBytes) {
        return next(
          new ErrorResponse(
            `File ${file.originalname} is too large. Maximum size allowed is ${maxSizeInBytes / (1024 * 1024)}MB.`,
            400
          )
        );
      }
    }

    next();
  };
};

// Avatar upload middleware (single image file, 5MB max)
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Allowed image types for avatar
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse('Invalid file type. Only JPEG, PNG, and WebP images are allowed for avatars.', 400), false);
    }
  }
});

// Export all upload middleware
const uploadMiddleware = {
  single: upload.single.bind(upload),
  array: upload.array.bind(upload),
  fields: upload.fields.bind(upload),
  none: upload.none.bind(upload),
  handleFileUpload,
  uploadSingle,
  uploadMultiple,
  validateFileType,
  validateFileSize,
  handleMulterErrors,
  uploadAvatar: uploadAvatar.single.bind(uploadAvatar),
};

module.exports = uploadMiddleware;
