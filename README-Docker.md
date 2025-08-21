# Docker Deployment Guide

## 🐳 Docker Compose Deployment

### Quick Start

1. **Clone and prepare the project:**
   ```bash
   cd /path/to/phajay-file-backup
   ```

2. **Configure environment:**
   ```bash
   cp .env.docker .env
   # Edit .env with your AWS credentials
   nano .env
   ```

3. **Start the service:**
   ```bash
   ./docker-manage.sh start
   ```

### Using the Management Script

The `docker-manage.sh` script provides easy management of the Docker deployment:

```bash
# Build the Docker image
./docker-manage.sh build

# Start the service
./docker-manage.sh start

# Check status
./docker-manage.sh status

# View logs
./docker-manage.sh logs
./docker-manage.sh logs -f  # Follow logs

# Run manual backup
./docker-manage.sh backup-now

# Check backup status
./docker-manage.sh backup-status

# Stop the service
./docker-manage.sh stop

# Clean up everything
./docker-manage.sh cleanup
```

### Alternative: Using npm scripts

```bash
npm run docker:start
npm run docker:status
npm run docker:logs
npm run docker:backup
npm run docker:stop
```

### Alternative: Direct docker-compose commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Manual backup
docker-compose exec s3-backup npm run backup
```

## 📁 Directory Structure

When deployed with Docker, the following structure is created:

```
phajay-file-backup/
├── docker-data/
│   ├── backup/          # Persistent backup files
│   └── data/            # Sync tracking data
├── logs/                # Application logs
├── docker-compose.yml
├── Dockerfile
└── docker-manage.sh
```

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```env
# Required AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1

# Required S3 Configuration
S3_BUCKET_NAME=lailaopayment-bucket
S3_PREFIX=images/

# Optional: Backup Schedule (cron format)
BACKUP_SCHEDULE=0 */6 * * *

# Optional: Log Level
LOG_LEVEL=info
```

### Volume Mounts

- `docker-data/backup` - Stores downloaded backup files
- `docker-data/data` - Stores sync tracking information
- `logs/` - Application logs (optional)

## 🔍 Monitoring

### Health Checks

The container includes health checks that test S3 connectivity:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' phajay-s3-backup
```

### Log Monitoring

```bash
# Follow logs in real-time
./docker-manage.sh logs -f

# Check recent logs
./docker-manage.sh logs
```

### Status Monitoring

```bash
# Check service status
./docker-manage.sh status

# Check backup status
./docker-manage.sh backup-status
```

## 🚨 Troubleshooting

### Common Issues

1. **Container won't start:**
   ```bash
   # Check logs
   ./docker-manage.sh logs
   
   # Check if .env is configured
   cat .env
   ```

2. **AWS connection errors:**
   ```bash
   # Test connection manually
   docker-compose exec s3-backup node -e "
   const S3BackupService = require('./S3BackupService');
   const service = new S3BackupService();
   service.testConnection();
   "
   ```

3. **Permission issues:**
   ```bash
   # Check directory permissions
   ls -la docker-data/
   
   # Fix permissions if needed
   sudo chown -R $(id -u):$(id -g) docker-data/
   ```

4. **Space issues:**
   ```bash
   # Check disk usage
   df -h
   du -sh docker-data/backup/
   ```

### Reset Everything

If you need to start fresh:

```bash
# Stop and remove everything
./docker-manage.sh cleanup

# Remove data directories
rm -rf docker-data/ logs/

# Start again
./docker-manage.sh start
```

## 🔐 Security Considerations

1. **Environment Variables:** Never commit `.env` to git
2. **File Permissions:** The container runs as non-root user
3. **Network:** Uses isolated Docker network
4. **Volumes:** Data persists in host directories with appropriate permissions

## 📊 Production Deployment

### Systemd Service (Optional)

Create a systemd service for auto-start:

```bash
sudo nano /etc/systemd/system/s3-backup.service
```

```ini
[Unit]
Description=S3 Backup Docker Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/phajay-file-backup
ExecStart=/path/to/phajay-file-backup/docker-manage.sh start
ExecStop=/path/to/phajay-file-backup/docker-manage.sh stop
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable s3-backup
sudo systemctl start s3-backup
```

### Backup Monitoring

Set up monitoring alerts for backup failures:

```bash
# Add to crontab for daily backup status check
0 9 * * * cd /path/to/phajay-file-backup && ./docker-manage.sh backup-status
```

## 📝 Logs

Logs are configured with rotation to prevent disk space issues:
- Maximum file size: 10MB
- Maximum files: 3
- Location: Container logs via `docker-compose logs`
