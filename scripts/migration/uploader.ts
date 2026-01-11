/**
 * File Uploader Module
 * 
 * Phase 2: Upload files to R2 storage.
 * This phase uploads files but keeps originals intact.
 */

import fs from 'fs';
import { R2Storage } from '../../src/storage/r2Storage';
import { FileMapping } from './types';
import { config } from './config';
import { getMimeType } from './utils';

/**
 * Upload files to R2 storage
 * 
 * @param mappings - File mappings from scanner
 */
export async function uploadFilesToR2(mappings: FileMapping[]): Promise<void> {
  console.log('\n[PHASE 2] Uploading files to R2...\n');
  
  if (config.dryRun) {
    console.log('[DRY RUN] Skipping actual uploads\n');
    
    // Simulate uploads in dry-run mode
    for (const mapping of mappings) {
      mapping.newUrl = `https://r2.example.com/${mapping.folder}/${mapping.filename}`;
      mapping.publicId = `${mapping.folder}/${mapping.filename}`;
      mapping.uploaded = true;
    }
    return;
  }
  
  const storage = new R2Storage();
  let uploadCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    
    try {
      console.log(`  [${i + 1}/${mappings.length}] Uploading: ${mapping.folder}/${mapping.filename}`);
      
      // Read file from disk
      const fileBuffer = await fs.promises.readFile(mapping.localPath);
      
      // Create Multer-like file object for R2Storage
      const multerFile: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: mapping.filename,
        mimetype: getMimeType(mapping.filename),
        size: fileBuffer.length,
        fieldname: 'file',
        encoding: '7bit',
        stream: null as any,
        destination: '',
        filename: mapping.filename,
        path: '',
      };
      
      // Upload to R2
      const result = await storage.save(multerFile, mapping.folder);
      
      // Store new URL and public ID
      mapping.newUrl = result.url;
      mapping.publicId = result.publicId;
      mapping.uploaded = true;
      
      uploadCount++;
      console.log(`    Success (${uploadCount}/${mappings.length})`);
      
    } catch (error) {
      console.error(`    Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      mapping.uploaded = false;
      failCount++;
    }
  }
  
  console.log(`\nUpload complete: ${uploadCount} succeeded, ${failCount} failed\n`);
}
