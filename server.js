const S3BackupService = require('./S3BackupService');

async function main() {
    try {
        console.log('🚀 Starting S3 Backup Server...');
        console.log('='.repeat(50));
        
        // Initialize backup service
        const backupService = new S3BackupService();
        
        // Test connection first
        const connectionOk = await backupService.testConnection();
        if (!connectionOk) {
            console.error('❌ Failed to connect to S3. Please check your credentials and configuration.');
            process.exit(1);
        }
        
        // Show current status
        console.log('\n📊 Current Status:');
        console.log('-'.repeat(30));
        try {
            const status = await backupService.getStatus();
            console.log(`Last Sync: ${status.lastSync || 'Never'}`);
            console.log(`Total Files in S3: ${status.totalFilesInS3}`);
            console.log(`Files Downloaded: ${status.totalDownloaded}`);
            console.log(`Pending Files: ${status.pendingFiles}`);
            console.log(`Local Backup Path: ${status.localBackupPath}`);
        } catch (error) {
            console.log('Status unavailable (first run)');
        }
        
        // Start the scheduler
        console.log('\n⏰ Starting Backup Scheduler...');
        console.log('-'.repeat(30));
        const job = backupService.startScheduler();
        
        // Perform initial backup if requested
        if (process.argv.includes('--initial-backup')) {
            console.log('\n🔄 Performing initial backup...');
            console.log('-'.repeat(30));
            await backupService.performBackup();
        }
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n🛑 Shutting down backup server...');
            if (job) {
                job.stop();
            }
            console.log('✅ Server stopped gracefully');
            process.exit(0);
        });
        
        console.log('\n✅ S3 Backup Server is running!');
        console.log('Press Ctrl+C to stop the server');
        console.log('='.repeat(50));
        
        // Keep the process alive
        setInterval(() => {
            // Just to keep the process running
        }, 60000);
        
    } catch (error) {
        console.error('❌ Failed to start backup server:', error.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
main();
