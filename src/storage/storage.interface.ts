
export interface StorageProvider {
  // Save file to storage and return metadata
  save(file: Express.Multer.File, folder: string): Promise<StorageResult>;

  // Delete file by identifier
  delete(publicId: string): Promise<void>;
}

export interface StorageResult {
  url: string;
  
  // File identifier for deletion 
  publicId: string;
  //  File extension (e.g., 'jpg', 'pdf') 
  format: string;
  
  bytes: number;
  
  /** Image width in pixels */
  width?: number;
  
  /** Image height in pixels */
  height?: number;
}
