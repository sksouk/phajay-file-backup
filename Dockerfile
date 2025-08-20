# Use the official Node.js 18 Alpine image for smaller size
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create backup directory with proper permissions
RUN mkdir -p backup && chmod 755 backup

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app

# Ensure backup directory has correct permissions
RUN chmod -R 755 /app/backup

# Switch to nodejs user
USER nodejs

# Expose port (optional, for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const service = require('./S3BackupService'); const s = new service(); s.testConnection().then(ok => process.exit(ok ? 0 : 1))" || exit 1

# Default command
CMD ["npm", "start"]
