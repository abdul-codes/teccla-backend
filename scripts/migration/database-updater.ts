/**
 * Database Updater Module
 * 
 * Phase 3: Update database URLs to point to R2 storage.
 * This phase modifies database records.
 */

import { prisma } from '../../src/utils/db';
import { FileMapping } from './types';
import { config } from './config';

/**
 * Update database records with new R2 URLs
 * 
 * @param mappings - File mappings with new URLs from uploader
 */
export async function updateDatabase(mappings: FileMapping[]): Promise<void> {
  console.log('\n[PHASE 3] Updating database...\n');
  
  if (config.dryRun) {
    console.log('[DRY RUN] Showing what would be updated\n');
    
    for (const mapping of mappings) {
      if (mapping.uploaded && mapping.newUrl) {
        console.log(`  Would update: ${mapping.oldUrl}`);
        console.log(`           to: ${mapping.newUrl}\n`);
      }
    }
    return;
  }
  
  let updatedCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    
    if (!mapping.uploaded || !mapping.newUrl) {
      console.log(`  [${i + 1}/${mappings.length}] Skipping ${mapping.filename} (not uploaded)`);
      skippedCount++;
      continue;
    }
    
    try {
      console.log(`  [${i + 1}/${mappings.length}] Updating ${mapping.filename}`);
      
      // Update Message table (chat attachments)
      const messageResult = await prisma.message.updateMany({
        where: {
          attachmentUrl: mapping.oldUrl,
        },
        data: {
          attachmentUrl: mapping.newUrl,
        },
      });
      
      // Update Asset table (project files)
      const assetResult = await prisma.asset.updateMany({
        where: {
          url: mapping.oldUrl,
        },
        data: {
          url: mapping.newUrl,
        },
      });
      
      const totalUpdated = messageResult.count + assetResult.count;
      
      if (totalUpdated > 0) {
        console.log(`    Updated ${totalUpdated} record(s)`);
        mapping.dbUpdated = true;
        updatedCount++;
      } else {
        console.log(`    No database records found for this file`);
        mapping.dbUpdated = false;
      }
      
    } catch (error) {
      console.error(`    Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      mapping.dbUpdated = false;
      failCount++;
    }
  }
  
  console.log(`\nDatabase update complete: ${updatedCount} updated, ${skippedCount} skipped, ${failCount} failed\n`);
}
