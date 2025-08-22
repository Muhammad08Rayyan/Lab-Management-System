import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadToCloudinary = async (
  file: Buffer | string,
  folder: string = process.env.CLOUDINARY_FOLDER || 'Lab',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.upload(file as string, {
      folder,
      resource_type: resourceType,
      quality: 'auto:good',
      fetch_format: 'auto',
    });
    
    return {
      success: true,
      result: {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        resource_type: result.resource_type,
      },
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: true,
      result,
    };
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const generateSignedUrl = (publicId: string, transformation?: any): string => {
  return cloudinary.url(publicId, {
    sign_url: true,
    ...transformation,
  });
};

export default cloudinary;