// Migration Script: Local Storage to Cloudflare R2
//
// This script migrates files from local uploads/ directory to R2 storage
// and updates database URLs accordingly.
//
// PHASES:
// 1. Scan local files
// 2. Upload to R2
// 3. Update database
// 4. Verify

import fs from 'fs';
import path from 'path';
import { R2Storage } from '../src/storage/r2Storage';
import { prisma } from '../src/utils/db';

// Configuration
interface MigrationConfig {
  uploadsDir: string;
  dryRun: boolean;
  verbose: boolean;
}

const config: MigrationConfig = {
  uploadsDir: '/home/abdul/Documents/Projects/MERN/teccla/teccla-app/backend/uploads',
  dryRun: false,  // Set to false to execute actual migration
  verbose: true,
};

// Data structures
interface FileMapping {
  localPath: string;
  folder: string;
  filename: string;
  oldUrl: string;
  newUrl?: string;
  publicId?: string;
  uploaded: boolean;
  dbUpdated: boolean;
}

interface MigrationReport {
  totalFiles: number;
  uploadedFiles: number;
  failedUploads: string[];
  dbRecordsUpdated: number;
  failedDbUpdates: string[];
  startTime: Date;
  endTime?: Date;
}

// Phase 1: Scan local files
async function scanLocalFiles(): Promise<FileMapping[]> {
  console.log('\n[PHASE 1] Scanning local files...\n');

  const mappings: FileMapping[] = [];

  const scanDirectory = async (dir: string, baseDir: string) => {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        await scanDirectory(fullPath, baseDir);
      } else if (item.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        const folder = path.dirname(relativePath);
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
          console.log(`Found: ${relativePath}`);
        }
      }
    }
  };

  await scanDirectory(config.uploadsDir, config.uploadsDir);
  console.log(`\nFound ${mappings.length} files to migrate\n`);

  return mappings;
}

// Phase 2: Upload to R2
async function uploadFilesToR2(mappings: FileMapping[]): Promise<void> {
  console.log('\n[PHASE 2] Uploading files to R2...\n');

  if (config.dryRun) {
    console.log('[DRY RUN] Skipping actual uploads\n');
    for (const mapping of mappings) {
      mapping.newUrl = `https://r2.example.com/${mapping.folder}/${mapping.filename}`;
      mapping.publicId = `${mapping.folder}/${mapping.filename}`;
      mapping.uploaded = true;
    }
    return;
  }

  const storage = new R2Storage();
  let uploadCount = 0;

  for (const mapping of mappings) {
    try {
      console.log(`  Uploading: ${mapping.folder}/${mapping.filename}`);

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

      const result = await storage.save(multerFile, mapping.folder);

      mapping.newUrl = result.url;
      mapping.publicId = result.publicId;
      mapping.uploaded = true;

      uploadCount++;
      console.log(` Success (${uploadCount}/${mappings.length})`);

    } catch (error) {
      console.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      mapping.uploaded = false;
    }
  }

  console.log(`\nUpload complete: ${uploadCount}/${mappings.length} files\n`);
}

// Phase 3: Update database
async function updateDatabase(mappings: FileMapping[]): Promise<void> {
  console.log('\n[PHASE 3] Updating database...\n');

  if (config.dryRun) {
    console.log('[DRY RUN] Showing what would be updated\n');
    for (const mapping of mappings) {
      if (mapping.uploaded && mapping.newUrl) {
        console.log(`Would update: ${mapping.oldUrl}`);
        console.log(`to: ${mapping.newUrl}\n`);
      }
    }
    return;
  }

  let updatedCount = 0;

  for (const mapping of mappings) {
    if (!mapping.uploaded || !mapping.newUrl) {
      console.log(`  Skipping ${mapping.filename} (not uploaded)`);
      continue;
    }

    try {
      // Update Message table (chat attachments)
      const messageResult = await prisma.message.updateMany({
        where: { attachmentUrl: mapping.oldUrl },
        data: { attachmentUrl: mapping.newUrl },
      });

      // Update Asset table (project files)
      const assetResult = await prisma.asset.updateMany({
        where: { url: mapping.oldUrl },
        data: { url: mapping.newUrl },
      });

      const totalUpdated = messageResult.count + assetResult.count;

      if (totalUpdated > 0) {
        console.log(`  Updated ${totalUpdated} record(s) for ${mapping.filename}`);
        mapping.dbUpdated = true;
        updatedCount++;
      } else {
        console.log(`  No database records found for ${mapping.filename}`);
      }

    } catch (error) {
      console.error(`  Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      mapping.dbUpdated = false;
    }
  }

  console.log(`\nDatabase update complete: ${updatedCount}/${mappings.length} files\n`);
}

// Phase 4: Verify migration
async function verifyMigration(mappings: FileMapping[]): Promise<boolean> {
  console.log('\n[PHASE 4] Verifying migration...\n');

  const uploadedCount = mappings.filter(m => m.uploaded).length;
  const uploadRate = (uploadedCount / mappings.length) * 100;

  console.log(`  Files uploaded: ${uploadedCount}/${mappings.length} (${uploadRate.toFixed(1)}%)`);

  if (config.dryRun) {
    console.log('\n[DRY RUN] Verification skipped\n');
    return true;
  }

  const dbUpdatedCount = mappings.filter(m => m.dbUpdated).length;
  const dbUpdateRate = (dbUpdatedCount / mappings.length) * 100;

  console.log(`  Database records updated: ${dbUpdatedCount}/${mappings.length} (${dbUpdateRate.toFixed(1)}%)`);

  // Check for remaining old URLs
  const remainingMessages = await prisma.message.count({
    where: { attachmentUrl: { startsWith: 'http://localhost:8000/uploads/' } },
  });

  const remainingAssets = await prisma.asset.count({
    where: { url: { startsWith: 'http://localhost:8000/uploads/' } },
  });

  console.log(`\n  Remaining old URLs in database:`);
  console.log(` Messages: ${remainingMessages}`);
  console.log(` Assets: ${remainingAssets}`);

  const success = uploadRate === 100 && dbUpdateRate === 100 &&
    remainingMessages === 0 && remainingAssets === 0;

  if (success) {
    console.log('\n[SUCCESS] Migration completed successfully\n');
  } else {
    console.log('\n[WARNING] Migration incomplete - review errors above\n');
  }

  return success;
}

// Save migration report
async function saveMigrationReport(mappings: FileMapping[], report: MigrationReport): Promise<void> {
  const reportPath = '/home/abdul/Documents/Projects/MERN/teccla/teccla-app/backend/scripts/migration-report.json';

  const reportData = {
    ...report,
    mappings,
    config,
  };

  await fs.promises.writeFile(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\nMigration report saved to: ${reportPath}\n`);
}

// Helper: Get MIME type from filename
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

// Main execution
async function main() {
  console.log('MIGRATION: Local Storage -> Cloudflare R2');
  console.log(`Mode: ${config.dryRun ? 'DRY RUN (Preview Only)' : 'LIVE MIGRATION'}`);

  const report: MigrationReport = {
    totalFiles: 0,
    uploadedFiles: 0,
    failedUploads: [],
    dbRecordsUpdated: 0,
    failedDbUpdates: [],
    startTime: new Date(),
  };

  try {
    // Phase 1: Scan
    const mappings = await scanLocalFiles();
    report.totalFiles = mappings.length;

    if (mappings.length === 0) {
      console.log('[WARNING] No files found to migrate\n');
      return;
    }

    // Phase 2: Upload
    await uploadFilesToR2(mappings);
    report.uploadedFiles = mappings.filter(m => m.uploaded).length;
    report.failedUploads = mappings.filter(m => !m.uploaded).map(m => m.filename);

    // Phase 3: Update Database
    await updateDatabase(mappings);
    report.dbRecordsUpdated = mappings.filter(m => m.dbUpdated).length;
    report.failedDbUpdates = mappings.filter(m => !m.dbUpdated).map(m => m.filename);

    // Phase 4: Verify
    const verified = await verifyMigration(mappings);

    // Save report
    report.endTime = new Date();
    await saveMigrationReport(mappings, report);

    if (config.dryRun) {
      console.log('[DRY RUN COMPLETE]');
      console.log('\nTo execute the actual migration:');
      console.log('1. Edit this file and set dryRun: false');
      console.log('2. Run: npm run migrate:execute\n');
    } else {
      console.log('[MIGRATION COMPLETE]');
      if (verified) {
        console.log('\nNext steps:');
        console.log('1. Test the application - verify files load correctly');
        console.log('2. Keep uploads/ folder as backup for 1-2 weeks');
        console.log('3. After verification, archive or delete local files\n');
      }
    }

  } catch (error) {
    console.error('\n[ERROR] Migration failed:', error);
    report.endTime = new Date();
    await saveMigrationReport([], report);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main();

export { main, scanLocalFiles, uploadFilesToR2, updateDatabase };

