import { supabase } from './supabase'

const DEVICE_TYPES_BUCKET = 'device-types-images'
const ACCESSORIES_BUCKET = 'accessories-images'

export const storageService = {
  /**
   * Upload images to device types bucket
   */
  async uploadDeviceTypeImages(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = fileName

      // Upload file
      const { data, error } = await supabase.storage
        .from(DEVICE_TYPES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading image:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(DEVICE_TYPES_BUCKET)
        .getPublicUrl(data.path)

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl)
      }
    }

    return uploadedUrls
  },

  /**
   * Upload images to accessories bucket
   */
  async uploadAccessoryImages(files: File[]): Promise<string[]> {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = fileName

      // Upload file
      const { data, error } = await supabase.storage
        .from(ACCESSORIES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading image:', error)
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(ACCESSORIES_BUCKET)
        .getPublicUrl(data.path)

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl)
      }
    }

    return uploadedUrls
  },

  /**
   * Delete images from storage
   */
  async deleteImages(urls: string[], bucket: 'device-types' | 'accessories'): Promise<void> {
    const bucketName = bucket === 'device-types' ? DEVICE_TYPES_BUCKET : ACCESSORIES_BUCKET
    
    for (const url of urls) {
      // Extract file path from URL
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      if (fileName) {
        const { error } = await supabase.storage
          .from(bucketName)
          .remove([fileName])

        if (error) {
          console.error('Error deleting image:', error)
          // Don't throw, just log - continue with other deletions
        }
      }
    }
  },

  /**
   * Get public URL for an image path
   */
  getPublicUrl(path: string, bucket: 'device-types' | 'accessories'): string {
    const bucketName = bucket === 'device-types' ? DEVICE_TYPES_BUCKET : ACCESSORIES_BUCKET
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path)
    return data.publicUrl
  }
}

