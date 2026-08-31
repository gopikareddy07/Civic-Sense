/**
 * Cloudinary Configuration
 * Handles image uploads for issue photos with fallback for local development
 */

const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  !process.env.CLOUDINARY_CLOUD_NAME.includes('your-')
);

let issueStorage;
let avatarStorage;
let proofStorage;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Configure storage for issue images
  issueStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'civicsense/issues',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
    }
  });

  // Configure storage for profile avatars
  avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'civicsense/avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 200, height: 200, crop: 'fill' }]
    }
  });

  // Configure storage for resolution proof images
  proofStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'civicsense/proofs',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
    }
  });
} else {
  // Use memory storage for local development
  const memStorage = multer.memoryStorage();
  issueStorage = memStorage;
  avatarStorage = memStorage;
  proofStorage = memStorage;
}

// Multer upload middleware
const uploadIssueImage = multer({ 
  storage: issueStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

const uploadProofImage = multer({ 
  storage: proofStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (imageUrl) => {
  if (!isCloudinaryConfigured || !imageUrl || !imageUrl.includes('cloudinary')) {
    return true;
  }
  
  try {
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = urlParts[urlParts.length - 2];
    
    await cloudinary.uploader.destroy(`civicsense/${folder}/${publicId}`);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  uploadIssueImage,
  uploadAvatar,
  uploadProofImage,
  deleteImage,
  isCloudinaryConfigured
};
