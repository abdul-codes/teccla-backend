/**
 * Migration Verifier Module
 * 
 * Phase 4: Verify migration success.
 * This phase checks that everything completed correctly.
 */

import { prisma } from '../../src/utils/db';
import { FileMapping } from './types';
import { config } from './config';

/**
 * Verify migration success
 * 
 * @param mappings - File mappings after all phases
 * @returns True if migration was successful
 */
export async function verifyMigration(mappings: FileMapping[]): Promise<boolean> {
  console.log('\n[PHASE 4] Verifying migration...\n');
  
  // Calculate upload success rate
  const uploadedCount = mappings.filter(m => m.uploaded).length;
  const uploadRate = (uploadedCount / mappings.length) * 100;
  
  console.log(`  Files uploaded: ${uploadedCount}/${mappings.length} (${uploadRate.toFixed(1)}%)`);
  
  if (config.dryRun) {
    console.log('\n[DRY RUN] Verification skipped\n');
    return true;
  }
  
  // Calculate database update success rate
  const dbUpdatedCount = mappings.filter(m => m.dbUpdated).length;
  const dbUpdateRate = (dbUpdatedCount / mappings.length) * 100;
  
  console.log(`  Database records updated: ${dbUpdatedCount}/${mappings.length} (${dbUpdateRate.toFixed(1)}%)`);
  
  // Check for remaining old URLs in database
  const remainingMessages = await prisma.message.count({
    where: {
      attachmentUrl: {
        startsWith: 'http://localhost:8000/uploads/',
      },
    },
  });
  
  const remainingAssets = await prisma.asset.count({
    where: {
      url: {
        startsWith: 'http://localhost:8000/uploads/',
      },
    },
  });
  
  console.log(`\n  Remaining old URLs in database:`);
  console.log(`    Messages: ${remainingMessages}`);
  console.log(`    Assets: ${remainingAssets}`);
  
  // Determine overall success
  const allUploaded = uploadRate === 100;
  const allUpdated = dbUpdateRate === 100;
  const noRemainingUrls = remainingMessages === 0 && remainingAssets === 0;
  
  const success = allUploaded && allUpdated && noRemainingUrls;
  
  if (success) {
    console.log('\n[SUCCESS] Migration completed successfully\n');
  } else {
    console.log('\n[WARNING] Migration incomplete - review errors above\n');
    
    // List failed files
    const failedUploads = mappings.filter(m => !m.uploaded);
    const failedUpdates = mappings.filter(m => m.uploaded && !m.dbUpdated);
    
    if (failedUploads.length > 0) {
      console.log('Failed uploads:');
      failedUploads.forEach(m => console.log(`  - ${m.filename}`));
      console.log();
    }
    
    if (failedUpdates.length > 0) {
      console.log('Failed database updates:');
      failedUpdates.forEach(m => console.log(`  - ${m.filename}`));
      console.log();
    }
  }
  
  return success;
}
