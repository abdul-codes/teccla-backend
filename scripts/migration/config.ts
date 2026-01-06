/**
 * Migration Configuration
 * 
 * Central configuration for the migration process.
 * Modify these values to change migration behavior.
 */

import path from 'path';
import { MigrationConfig } from './types';

export const config: MigrationConfig = {
  // Path to uploads directory
  uploadsDir: path.join(__dirname, '../../uploads'),
  
  // Dry run mode - preview changes without executing
  // IMPORTANT: Set to false to execute actual migration
  dryRun: true,
  
  // Verbose logging - show detailed progress
  verbose: true,
};
