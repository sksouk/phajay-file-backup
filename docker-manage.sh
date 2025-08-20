#!/bin/bash

# S3 Backup Docker Management Script
# Usage: ./docker-manage.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name
PROJECT_NAME="phajay-backup"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_warning "Docker is not running. Attempting to start Docker..."
        
        # Check if user is in docker group
        if groups "$USER" | grep -q '\bdocker\b'; then
            print_status "User is in docker group - no sudo required."
            USE_SUDO=""
        else
            print_warning "User is not in docker group - sudo required."
            print_status "To avoid using sudo, run: sudo usermod -aG docker \$USER && newgrp docker"
            USE_SUDO="sudo "
        fi
        
        # Try to start Docker based on the system
        if command -v systemctl >/dev/null 2>&1; then
            # SystemD (most modern Linux distributions including Arch)
            print_status "Starting Docker with systemctl..."
            if ${USE_SUDO}systemctl start docker; then
                print_success "Docker started successfully."
                print_status "Waiting for Docker daemon to initialize..."
                sleep 5  # Wait longer for Docker to fully initialize
                
                # Retry mechanism - wait up to 30 seconds for Docker to respond
                for i in {1..6}; do
                    if docker info >/dev/null 2>&1; then
                        print_success "Docker daemon is responding."
                        break
                    else
                        print_status "Waiting for Docker daemon... (attempt $i/6)"
                        sleep 5
                    fi
                done
            else
                print_error "Failed to start Docker with systemctl."
                print_error "Please run: ${USE_SUDO}systemctl start docker"
                print_error "Or add your user to docker group: sudo usermod -aG docker \$USER"
                exit 1
            fi
        elif command -v service >/dev/null 2>&1; then
            # SysV init
            print_status "Starting Docker with service command..."
            if ${USE_SUDO}service docker start; then
                print_success "Docker started successfully."
                print_status "Waiting for Docker daemon to initialize..."
                sleep 5
                
                # Retry mechanism for SysV init too
                for i in {1..6}; do
                    if docker info >/dev/null 2>&1; then
                        print_success "Docker daemon is responding."
                        break
                    else
                        print_status "Waiting for Docker daemon... (attempt $i/6)"
                        sleep 5
                    fi
                done
            else
                print_error "Failed to start Docker with service command."
                print_error "Please run: ${USE_SUDO}service docker start"
                exit 1
            fi
        else
            print_error "Could not determine how to start Docker on this system."
            print_error "Please start Docker manually and try again."
            print_error "Common commands:"
            print_error "  ${USE_SUDO}systemctl start docker    # SystemD (Arch, Ubuntu, CentOS 7+)"
            print_error "  ${USE_SUDO}service docker start      # SysV init"
            print_error ""
            print_error "To avoid using sudo, add your user to docker group:"
            print_error "  sudo usermod -aG docker \$USER && newgrp docker"
            exit 1
        fi
        
        # Verify Docker is now running
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker still not responding after start attempt."
            print_warning "Attempting additional troubleshooting steps..."
            
            # Try to fix common Docker issues on Linux
            print_status "Checking Docker socket permissions..."
            if [ -S /var/run/docker.sock ]; then
                print_status "Docker socket exists. Checking permissions..."
                ls -la /var/run/docker.sock
                
                print_status "Attempting to fix socket permissions..."
                ${USE_SUDO}chmod 666 /var/run/docker.sock 2>/dev/null || true
            fi
            
            # Try to start docker.socket service
            print_status "Starting Docker socket service..."
            ${USE_SUDO}systemctl start docker.socket 2>/dev/null || true
            
            # Try restart instead of start
            print_status "Attempting Docker restart..."
            ${USE_SUDO}systemctl restart docker 2>/dev/null || true
            
            # Wait and try again
            sleep 5
            
            if docker info >/dev/null 2>&1; then
                print_success "Docker is now responding after troubleshooting!"
            else
                print_error "Docker still not responding. Manual intervention required."
                print_error ""
                print_error "Please try these commands manually:"
                print_error "  ${USE_SUDO}systemctl status docker"
                print_error "  ${USE_SUDO}systemctl restart docker"
                print_error "  ${USE_SUDO}systemctl start docker.socket"
                print_error "  ${USE_SUDO}chmod 666 /var/run/docker.sock"
                print_error "  ${USE_SUDO}journalctl -u docker.service -f"
                print_error ""
                print_error "Common fixes:"
                print_error "  1. Add user to docker group: sudo usermod -aG docker \$USER && newgrp docker"
                print_error "  2. Check if virtualization is enabled in BIOS"
                print_error "  3. Restart system if Docker was just installed"
                exit 1
            fi
        fi
    fi
    
    print_success "Docker is running."
}

# Function to check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.docker template..."
        cp .env.docker .env
        print_warning "Please edit .env file with your AWS credentials before starting the service."
        return 1
    fi
    return 0
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    # Create backup directory in user's specified location
    BACKUP_DIR="/home/lailaolab/Documents/phajay/phajay-file-backup"
    mkdir -p "$BACKUP_DIR"
    
    # Set proper permissions for the backup directory
    # Make it writable by container user (UID 1001)
    chmod 755 "$BACKUP_DIR"
    
    # If running as root or with sudo, change ownership
    if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
        print_status "Setting proper ownership for backup directory..."
        # Change ownership to container user (1001:1001)
        chown -R 1001:1001 "$BACKUP_DIR" 2>/dev/null || {
            print_warning "Could not change ownership. Files may have permission issues."
            print_status "To fix, run: sudo chown -R 1001:1001 $BACKUP_DIR"
        }
    else
        # If not root, at least ensure the directory is world-writable
        chmod 777 "$BACKUP_DIR"
        print_warning "Running without sudo. Setting directory as world-writable."
        print_status "For better security, run: sudo chown -R 1001:1001 $BACKUP_DIR"
    fi
    
    # Create sync data directory
    mkdir -p docker-data/data
    # Create logs directory
    mkdir -p logs
    chmod 755 logs
    
    print_success "Directories created."
    print_status "Backup files will be saved to: $BACKUP_DIR"
}

# Function to build the Docker image
build() {
    print_status "Building Docker image..."
    docker-compose build
    print_success "Docker image built successfully."
}

# Function to start the service
start() {
    check_docker
    if ! check_env; then
        print_error "Please configure .env file first."
        exit 1
    fi
    
    create_directories
    print_status "Starting S3 Backup service..."
    docker-compose up -d
    print_success "S3 Backup service started."
    
    # Show logs for a few seconds
    sleep 2
    print_status "Recent logs:"
    docker-compose logs --tail=20
}

# Function to stop the service
stop() {
    print_status "Stopping S3 Backup service..."
    docker-compose down
    print_success "S3 Backup service stopped."
}

# Function to restart the service
restart() {
    stop
    start
}

# Function to show logs
logs() {
    if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
        docker-compose logs -f
    else
        docker-compose logs --tail=50
    fi
}

# Function to show service status
status() {
    print_status "Service status:"
    docker-compose ps
    
    print_status "Container logs (last 10 lines):"
    docker-compose logs --tail=10
    
    print_status "Container health:"
    docker inspect --format='{{.State.Health.Status}}' phajay-s3-backup 2>/dev/null || echo "Health check not available"
}

# Function to run backup manually
backup_now() {
    print_status "Running manual backup..."
    docker-compose exec s3-backup npm run backup
}

# Function to get shell access
shell() {
    print_status "Opening shell in container..."
    docker-compose exec s3-backup sh
}

# Function to show backup files
list_backup_files() {
    print_status "Backup files in /home/lailaolab/Documents/phajay/phajay-file-backup:"
    if [ -d "/home/lailaolab/Documents/phajay/phajay-file-backup" ]; then
        ls -la "/home/lailaolab/Documents/phajay/phajay-file-backup"
        echo ""
        print_status "Total backup files: $(find /home/lailaolab/Documents/phajay/phajay-file-backup -type f | wc -l | xargs)"
        print_status "Total backup size: $(du -sh /home/lailaolab/Documents/phajay/phajay-file-backup 2>/dev/null | cut -f1 || echo 'N/A')"
    else
        print_warning "Backup directory does not exist yet."
    fi
}

# Function to show backup status
backup_status() {
    print_status "Backup status:"
    docker-compose exec s3-backup node -e "
        const S3BackupService = require('./S3BackupService');
        const service = new S3BackupService();
        service.getStatus().then(status => {
            console.log('Last Sync:', status.lastSync || 'Never');
            console.log('Total Files in S3:', status.totalFilesInS3);
            console.log('Files Downloaded:', status.totalDownloaded);
            console.log('Pending Files:', status.pendingFiles);
            console.log('Local Backup Path:', status.localBackupPath);
            if (status.stats) {
                console.log('Stats:', JSON.stringify(status.stats, null, 2));
            }
        }).catch(err => console.error('Error:', err.message));
    "
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, images, and volumes. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --rmi all
        docker volume prune -f
        print_success "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to show help
show_help() {
    echo "S3 Backup Docker Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build         Build the Docker image"
    echo "  start         Start the backup service"
    echo "  stop          Stop the backup service"
    echo "  restart       Restart the backup service"
    echo "  logs [-f]     Show logs (use -f to follow)"
    echo "  status        Show service status and health"
    echo "  backup-now    Run manual backup"
    echo "  backup-status Show current backup status"
    echo "  list-files    List backup files in host directory"
    echo "  shell         Open shell in container"
    echo "  cleanup       Remove all containers, images, and volumes"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs -f"
    echo "  $0 backup-now"
    echo "  $0 status"
}

# Main script logic
case "${1:-}" in
    build)
        check_docker
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status
        ;;
    backup-now)
        backup_now
        ;;
    backup-status)
        backup_status
        ;;
    list-files)
        list_backup_files
        ;;
    shell)
        shell
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        print_error "No command specified."
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
