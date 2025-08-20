# Phajay S3 File Backup Service

🚀 **Automated S3 file backup service** ที่ดาวน์โหลดไฟล์ใหม่จาก AWS S3 bucket โดยอัตโนมัติ และตรวจสอบไฟล์ที่หายไป

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- 🕐 **Scheduled Backup**: ทำงานอัตโนมัติทุกวันเวลา 00:00, 06:00, 12:00, 18:00
- 🔍 **Smart Detection**: ตรวจสอบเฉพาะไฟล์ใหม่และไฟล์ที่หายไป
- 📁 **Organized Storage**: จัดเก็บไฟล์ใน local ด้วยโครงสร้างเดียวกับ S3
- 🐳 **Docker Ready**: Deploy ง่ายด้วย Docker Compose
- 📊 **Status Tracking**: ติดตามสถานะการ backup และจำนวนไฟล์
- 🛡️ **Error Handling**: จัดการข้อผิดพลาดและ retry mechanism
- 🔒 **Security**: รัน container ด้วย non-root user
- 📝 **Health Checks**: ตรวจสอบสุขภาพ container อัตโนมัติ

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd phajay-file-backup
```

### 2. Configure Environment
```bash
cp .env.docker .env
# Edit .env with your AWS credentials
nano .env
```

### 3. Start with Docker
```bash
# Build and start
./docker-manage.sh start

# Or with npm
npm run docker:start
```

### 4. Run Manual Backup (Optional)
```bash
./docker-manage.sh backup-now
```

## 📖 Documentation

- 📚 **[Installation Guide](README.md#installation)** - Detailed setup instructions
- 🐳 **[Docker Guide](README-Docker.md)** - Docker deployment guide  
- ⚡ **[Quick Reference](QUICK-REFERENCE.md)** - Common commands and usage

## 🔧 Configuration

### Required Environment Variables
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1

# S3 Configuration
S3_BUCKET_NAME=your-bucket-name
S3_PREFIX=images/
```

### Optional Configuration
```env
# Schedule (cron format)
BACKUP_SCHEDULE=0 0,6,12,18 * * *

# Log Level
LOG_LEVEL=info
```

## 🐳 Docker Deployment

The recommended way to run this service is with Docker:

```bash
# Management commands
./docker-manage.sh start        # Start service
./docker-manage.sh stop         # Stop service
./docker-manage.sh status       # Check status
./docker-manage.sh backup-now   # Manual backup
./docker-manage.sh list-files   # List backup files
./docker-manage.sh logs -f      # Follow logs
```

### Quick Commands
```bash
# Via npm scripts
npm run docker:start
npm run docker:backup
npm run docker:status
npm run docker:logs
```

## 📁 File Structure

```
phajay-file-backup/
├── 📄 server.js              # Main application (with scheduler)
├── 📄 backup-now.js          # Manual backup script
├── 📄 S3BackupService.js     # Core backup service
├── 🐳 Dockerfile             # Docker image configuration
├── 🐳 docker-compose.yml     # Docker Compose setup
├── 🔧 docker-manage.sh       # Management script
├── 📦 package.json           # Dependencies and scripts
├── 🔐 .env.example          # Environment template
├── 📚 README-Docker.md       # Docker guide
├── ⚡ QUICK-REFERENCE.md     # Quick commands
└── 📁 backup/               # Local backup directory (auto-created)
```

## 💻 Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS S3 access credentials

### Local Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Run locally (without Docker)
npm start

# Run manual backup
npm run backup
```

### Available Scripts
```bash
# Local execution
npm start              # Start with scheduler
npm run backup         # Manual backup
npm run dev            # Development mode

# Docker execution  
npm run docker:start   # Start Docker service
npm run docker:backup  # Manual backup via Docker
npm run docker:status  # Check Docker status
npm run docker:logs    # View Docker logs
npm run docker:stop    # Stop Docker service
```

## 📊 Monitoring

### Check Status
```bash
# Service status
./docker-manage.sh status

# Backup status
./docker-manage.sh backup-status

# List downloaded files
./docker-manage.sh list-files

# View logs
./docker-manage.sh logs -f
```

### Health Checks
The service includes automatic health checks that:
- Test S3 connectivity every 30 seconds
- Restart container if unhealthy
- Log health status for monitoring

## 🔧 Advanced Configuration

### Custom Schedule
The backup schedule uses cron format:
```env
# Default: Daily at 00:00, 06:00, 12:00, 18:00
BACKUP_SCHEDULE=0 0,6,12,18 * * *

# Examples:
# Every hour: 0 * * * *
# Every 12 hours: 0 */12 * * *
# Daily at midnight: 0 0 * * *
# Weekdays only at 9 AM: 0 9 * * 1-5
```

### S3 Bucket Permissions
Ensure your AWS IAM user has these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### Volume Mounting
By default, backup files are saved to host directory:
```yaml
volumes:
  - /path/to/backup:/app/backup  # Customize this path
```

## 🚨 Troubleshooting

### Common Issues

**AWS Connection Error**
```bash
# Check credentials and region
./docker-manage.sh backup-status
```

**Permission Denied**
```bash
# Check IAM permissions for S3 bucket
# Verify AWS credentials in .env file
```

**Container Won't Start**
```bash
# Check logs for errors
./docker-manage.sh logs

# Verify Docker is running
docker info
```

**Missing Files**
```bash
# Force re-download missing files
./docker-manage.sh backup-now

# Check sync status
./docker-manage.sh backup-status
```

### Reset Everything
```bash
# Stop and clean up
./docker-manage.sh cleanup

# Remove sync tracking
rm -f docker-data/data/last_sync.json

# Start fresh
./docker-manage.sh start
```

## 📝 Logging

### Log Levels
- `error`: Errors only
- `warn`: Warnings and errors  
- `info`: General information (default)
- `debug`: Detailed debugging

### Log Locations
- **Container logs**: `docker-compose logs`
- **Host logs**: `./logs/` (if enabled)
- **Sync tracking**: `docker-data/data/last_sync.json`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Node.js](https://nodejs.org/)
- Uses [AWS SDK](https://aws.amazon.com/sdk-for-javascript/)
- Containerized with [Docker](https://www.docker.com/)
- Scheduled with [node-cron](https://www.npmjs.com/package/cron)

---

⭐ **Star this repo if it helped you!**
