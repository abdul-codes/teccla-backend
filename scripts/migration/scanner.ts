/**
 * File Scanner Module
 * 
 * Phase 1: Scan local uploads directory and build file mappings.
 * This phase is read-only and safe - it makes no changes.
 */

import fs from 'fs';
import path from 'path';
import { FileMapping } from './types';
import { config } from './config';

/**
 * Recursively scan directory for files
 */
async function scanDirectory(
  dir: string,
  baseDir: string,
  mappings: FileMapping[]
): Promise<void> {
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recurse into subdirectories
      await scanDirectory(fullPath, baseDir, mappings);
    } else if (item.isFile()) {
      // Calculate relative path from uploads dir
      const relativePath = path.relative(baseDir, fullPath);
      const folder = path.dirname(relativePath);
      
      // Construct old URL (what's currently in database)
      const oldUrl = `http://localhost:8000/uploads/${relativePath.replace(/\\/g, '/')}`;
      
      mappings.push({
        localPath: fullPath,
        folder,
        filename: item.name,
        oldUrl,
        uploaded: false,
        dbUpdated: false,
      });
      
      if (config.verbose) {
        console.log(`  Found: ${relativePath}`);
      }
    }
  }
}

/**
 * Scan local files and build migration mappings
 * 
 * @returns Array of file mappings (old URL -> file info)
 */
export async function scanLocalFiles(): Promise<FileMapping[]> {
  console.log('\n[PHASE 1] Scanning local files...\n');
  
  const mappings: FileMapping[] = [];
  await scanDirectory(config.uploadsDir, config.uploadsDir, mappings);
  
  console.log(`\nFound ${mappings.length} files to migrate\n`);
  
  return mappings;
}
