/**
 * Report Generator Module
 * 
 * Generates and saves detailed migration reports.
 */

import fs from 'fs';
import path from 'path';
import { MigrationReport, FileMapping } from './types';
import { config } from './config';
import { formatDuration } from './utils';

/**
 * Save migration report to JSON file
 * 
 * @param mappings - File mappings from migration
 * @param report - Migration report data
 */
export async function saveMigrationReport(
  mappings: FileMapping[],
  report: MigrationReport
): Promise<void> {
  const reportPath = path.join(__dirname, '../migration-report.json');
  
  const reportData = {
    ...report,
    config,
    mappings,
  };
  
  await fs.promises.writeFile(
    reportPath,
    JSON.stringify(reportData, null, 2)
  );
  
  console.log(`\nMigration report saved to: ${reportPath}\n`);
}

/**
 * Print migration summary
 * 
 * @param report - Migration report data
 */
export function printSummary(report: MigrationReport): void {
  const duration = report.endTime && report.startTime
    ? report.endTime.getTime() - report.startTime.getTime()
    : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Duration: ${formatDuration(duration)}`);
  console.log(`Total files: ${report.totalFiles}`);
  console.log(`Uploaded: ${report.uploadedFiles}/${report.totalFiles}`);
  console.log(`Database records updated: ${report.dbRecordsUpdated}/${report.totalFiles}`);
  
  if (report.failedUploads.length > 0) {
    console.log(`\nFailed uploads (${report.failedUploads.length}):`);
    report.failedUploads.forEach(f => console.log(`  - ${f}`));
  }
  
  if (report.failedDbUpdates.length > 0) {
    console.log(`\nFailed database updates (${report.failedDbUpdates.length}):`);
    report.failedDbUpdates.forEach(f => console.log(`  - ${f}`));
  }
  
  console.log('='.repeat(60) + '\n');
}
