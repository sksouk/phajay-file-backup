# Quick Reference - Phajay File Backup

## 📁 Backup Location
All backup files are saved to: `/Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup`

## 🚀 Quick Commands

### Docker Management
```bash
# Start backup service
./docker-manage.sh start
npm run docker:start

# Stop backup service  
./docker-manage.sh stop
npm run docker:stop

# View service status
./docker-manage.sh status
npm run docker:status

# View logs
./docker-manage.sh logs
./docker-manage.sh logs -f  # Follow logs
npm run docker:logs
```

### Backup Operations
```bash
# Run manual backup
./docker-manage.sh backup-now
npm run docker:backup

# Check backup status
./docker-manage.sh backup-status

# List backup files on host
./docker-manage.sh list-files
npm run docker:list-files
```

### Debug & Maintenance
```bash
# Open shell in container
./docker-manage.sh shell

# Rebuild Docker image
./docker-manage.sh build
npm run docker:build

# Clean up everything
./docker-manage.sh cleanup
```

### Direct Access to Backup Files
```bash
# Navigate to backup directory
cd /Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup

# List all backup files
ls -la /Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup

# Check backup size
du -sh /Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup

# Find specific files
find /Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup -name "*phapay*"
```

## 📊 Current Status
- **Total Files**: 52 files
- **Total Size**: 28MB
- **Backup Schedule**: Daily at 00:00, 06:00, 12:00, 18:00
- **Container Status**: Running with health checks
- **Volume Mount**: Host directory `/Users/sksouk/Documents/LailaolabDocuments/phajay-file-backup`

## 🔧 Configuration Files
- **Docker Compose**: `docker-compose.yml`
- **Environment**: `.env`
- **Management Script**: `docker-manage.sh`
- **Node.js Scripts**: `package.json`

## 📝 Log Locations
- **Container Logs**: `docker-compose logs`
- **Host Logs**: `./logs/` (if enabled)
- **Sync Data**: `docker-data/data/last_sync.json`

## 🚨 Troubleshooting
```bash
# Check if container is healthy
docker inspect --format='{{.State.Health.Status}}' phajay-s3-backup

# Check container resources
docker stats phajay-s3-backup

# View recent errors
./docker-manage.sh logs | tail -20

# Test S3 connection
./docker-manage.sh backup-status
```

## 🔄 Automatic Features
- ✅ **Auto restart** if container stops
- ✅ **Health checks** every 30 seconds
- ✅ **Log rotation** (max 10MB, 3 files)
- ✅ **Missing file detection** and re-download
- ✅ **Incremental backup** (only new/missing files)
- ✅ **Persistent storage** outside container
