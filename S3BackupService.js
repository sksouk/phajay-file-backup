const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');
const cron = require('cron');
require('dotenv').config();

class S3BackupService {
    constructor() {
        // Initialize AWS S3
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });

        // Configuration
        this.bucketName = process.env.S3_BUCKET_NAME;
        this.s3Prefix = process.env.S3_PREFIX;
        this.localBackupPath = process.env.LOCAL_BACKUP_PATH || './backup';
        this.lastSyncFile = process.env.LAST_SYNC_FILE || './last_sync.json';
        this.backupSchedule = process.env.BACKUP_SCHEDULE || '0 */6 * * *';

        // Ensure backup directory exists
        fs.ensureDirSync(this.localBackupPath);

        this.log('S3 Backup Service initialized');
        this.log(`Bucket: ${this.bucketName}/${this.s3Prefix}`);
        this.log(`Local backup path: ${this.localBackupPath}`);
        this.log(`Schedule: ${this.backupSchedule}`);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }

    async getLastSyncInfo() {
        try {
            if (await fs.pathExists(this.lastSyncFile)) {
                const data = await fs.readJson(this.lastSyncFile);
                return data;
            }
        } catch (error) {
            this.log(`Error reading last sync file: ${error.message}`);
        }
        
        return {
            lastSyncDate: null,
            downloadedFiles: []
        };
    }

    async saveLastSyncInfo(syncInfo) {
        try {
            await fs.writeJson(this.lastSyncFile, syncInfo, { spaces: 2 });
            this.log(`Last sync info saved: ${syncInfo.downloadedFiles.length} files tracked`);
        } catch (error) {
            this.log(`Error saving last sync file: ${error.message}`);
        }
    }

    async listS3Objects() {
        try {
            const params = {
                Bucket: this.bucketName,
                Prefix: this.s3Prefix
            };

            let allObjects = [];
            let continuationToken = null;

            do {
                if (continuationToken) {
                    params.ContinuationToken = continuationToken;
                }

                const response = await this.s3.listObjectsV2(params).promise();
                
                if (response.Contents) {
                    allObjects = allObjects.concat(response.Contents);
                }

                continuationToken = response.NextContinuationToken;
            } while (continuationToken);

            this.log(`Found ${allObjects.length} objects in S3`);
            return allObjects;
        } catch (error) {
            this.log(`Error listing S3 objects: ${error.message}`);
            throw error;
        }
    }

    async downloadFile(s3Key, localPath) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: s3Key
            };

            // Ensure the directory exists
            await fs.ensureDir(path.dirname(localPath));

            const fileStream = fs.createWriteStream(localPath);
            const s3Stream = this.s3.getObject(params).createReadStream();

            return new Promise((resolve, reject) => {
                s3Stream.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    this.log(`Downloaded: ${s3Key} -> ${localPath}`);
                    resolve();
                });

                fileStream.on('error', (error) => {
                    this.log(`Error downloading ${s3Key}: ${error.message}`);
                    reject(error);
                });

                s3Stream.on('error', (error) => {
                    this.log(`Error reading from S3 ${s3Key}: ${error.message}`);
                    reject(error);
                });
            });
        } catch (error) {
            this.log(`Error downloading file ${s3Key}: ${error.message}`);
            throw error;
        }
    }

    async performBackup() {
        try {
            this.log('Starting backup process...');
            
            // Get current sync info
            const lastSyncInfo = await this.getLastSyncInfo();
            
            // Get all objects from S3
            const s3Objects = await this.listS3Objects();
            
            // Filter out folders (objects ending with '/')
            const files = s3Objects.filter(obj => !obj.Key.endsWith('/'));
            
            // Find files that need to be downloaded
            // 1. Files not in last sync (new files)
            // 2. Files that were tracked but local file is missing
            const filesToDownload = [];
            
            for (const file of files) {
                const isTracked = lastSyncInfo.downloadedFiles.includes(file.Key);
                
                if (!isTracked) {
                    // New file - not tracked yet
                    filesToDownload.push({
                        file: file,
                        reason: 'new'
                    });
                } else {
                    // File is tracked, check if local file exists
                    const relativePath = file.Key.replace(this.s3Prefix, '');
                    const localFilePath = path.join(this.localBackupPath, relativePath);
                    
                    const localExists = await fs.pathExists(localFilePath);
                    if (!localExists) {
                        filesToDownload.push({
                            file: file,
                            reason: 'missing_local'
                        });
                    }
                }
            }

            if (filesToDownload.length === 0) {
                this.log('No files to download - all files are up to date');
                return;
            }

            const newFiles = filesToDownload.filter(item => item.reason === 'new').length;
            const missingFiles = filesToDownload.filter(item => item.reason === 'missing_local').length;
            
            this.log(`Found ${filesToDownload.length} files to download:`);
            if (newFiles > 0) this.log(`- ${newFiles} new files`);
            if (missingFiles > 0) this.log(`- ${missingFiles} missing local files`);

            let downloadedCount = 0;
            const newDownloadedFiles = [...lastSyncInfo.downloadedFiles];

            // Download files
            for (const item of filesToDownload) {
                try {
                    const file = item.file;
                    // Create local file path
                    const relativePath = file.Key.replace(this.s3Prefix, '');
                    const localFilePath = path.join(this.localBackupPath, relativePath);

                    await this.downloadFile(file.Key, localFilePath);
                    
                    // Add to tracking if it's a new file
                    if (item.reason === 'new' && !newDownloadedFiles.includes(file.Key)) {
                        newDownloadedFiles.push(file.Key);
                    }
                    
                    downloadedCount++;
                } catch (error) {
                    this.log(`Failed to download ${item.file.Key}: ${error.message}`);
                }
            }

            // Update sync info
            const newSyncInfo = {
                lastSyncDate: new Date().toISOString(),
                downloadedFiles: newDownloadedFiles,
                stats: {
                    totalFiles: files.length,
                    newFilesInThisSync: downloadedCount,
                    newFiles: newFiles,
                    missingLocalFiles: missingFiles,
                    totalDownloaded: newDownloadedFiles.length
                }
            };

            await this.saveLastSyncInfo(newSyncInfo);
            this.log(`Backup completed: ${downloadedCount} files downloaded`);

        } catch (error) {
            this.log(`Backup failed: ${error.message}`);
            throw error;
        }
    }

    async testConnection() {
        try {
            this.log('Testing AWS S3 connection...');
            
            const params = {
                Bucket: this.bucketName,
                Prefix: this.s3Prefix,
                MaxKeys: 1
            };

            await this.s3.listObjectsV2(params).promise();
            this.log('✓ S3 connection successful');
            return true;
        } catch (error) {
            this.log(`✗ S3 connection failed: ${error.message}`);
            return false;
        }
    }

    startScheduler() {
        this.log(`Starting backup scheduler with pattern: ${this.backupSchedule}`);
        
        const job = new cron.CronJob(
            this.backupSchedule,
            async () => {
                this.log('Scheduled backup triggered');
                try {
                    await this.performBackup();
                } catch (error) {
                    this.log(`Scheduled backup failed: ${error.message}`);
                }
            },
            null,
            true,
            'Asia/Bangkok'
        );

        this.log('Backup scheduler started');
        
        // Handle different cron library versions
        try {
            const nextDate = job.nextDate();
            if (nextDate && typeof nextDate.toISOString === 'function') {
                this.log(`Next backup scheduled for: ${nextDate.toISOString()}`);
            } else if (nextDate && typeof nextDate.toString === 'function') {
                this.log(`Next backup scheduled for: ${nextDate.toString()}`);
            } else {
                this.log('Next backup scheduled (time calculation unavailable)');
            }
        } catch (error) {
            this.log('Backup scheduler started (next time calculation unavailable)');
        }
        
        return job;
    }

    async getStatus() {
        const lastSyncInfo = await this.getLastSyncInfo();
        const s3Objects = await this.listS3Objects();
        const totalFiles = s3Objects.filter(obj => !obj.Key.endsWith('/')).length;
        
        return {
            lastSync: lastSyncInfo.lastSyncDate,
            totalFilesInS3: totalFiles,
            totalDownloaded: lastSyncInfo.downloadedFiles.length,
            pendingFiles: totalFiles - lastSyncInfo.downloadedFiles.length,
            localBackupPath: this.localBackupPath,
            stats: lastSyncInfo.stats || {}
        };
    }
}

module.exports = S3BackupService;
