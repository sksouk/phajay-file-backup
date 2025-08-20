const S3BackupService = require('./S3BackupService');

async function main() {
    try {
        console.log('🚀 Starting Manual S3 Backup...');
        console.log('='.repeat(50));
        
        // Initialize backup service
        const backupService = new S3BackupService();
        
        // Test connection first
        console.log('🔍 Testing S3 connection...');
        const connectionOk = await backupService.testConnection();
        if (!connectionOk) {
            console.error('❌ Failed to connect to S3. Please check your credentials and configuration.');
            process.exit(1);
        }
        
        // Show current status before backup
        console.log('\n📊 Status Before Backup:');
        console.log('-'.repeat(30));
        try {
            const statusBefore = await backupService.getStatus();
            console.log(`Last Sync: ${statusBefore.lastSync || 'Never'}`);
            console.log(`Total Files in S3: ${statusBefore.totalFilesInS3}`);
            console.log(`Files Already Downloaded: ${statusBefore.totalDownloaded}`);
            console.log(`Pending Files: ${statusBefore.pendingFiles}`);
            console.log(`Local Backup Path: ${statusBefore.localBackupPath}`);
        } catch (error) {
            console.log('Status unavailable (first run)');
        }
        
        // Perform backup
        console.log('\n🔄 Starting Backup Process...');
        console.log('-'.repeat(30));
        
        const startTime = Date.now();
        await backupService.performBackup();
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        // Show status after backup
        console.log('\n📊 Status After Backup:');
        console.log('-'.repeat(30));
        const statusAfter = await backupService.getStatus();
        console.log(`Last Sync: ${statusAfter.lastSync}`);
        console.log(`Total Files in S3: ${statusAfter.totalFilesInS3}`);
        console.log(`Files Downloaded: ${statusAfter.totalDownloaded}`);
        console.log(`Pending Files: ${statusAfter.pendingFiles}`);
        console.log(`Backup Duration: ${duration} seconds`);
        
        if (statusAfter.stats && statusAfter.stats.newFilesInThisSync !== undefined) {
            console.log(`New Files Downloaded: ${statusAfter.stats.newFilesInThisSync}`);
        }
        
        console.log('\n✅ Manual Backup Completed Successfully!');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Manual Backup Failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the manual backup
main();
