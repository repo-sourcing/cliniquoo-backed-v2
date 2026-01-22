FROM node:18-alpine

# Install build dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    curl \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production + dev for migration tools)
RUN npm ci && \
    npm cache clean --force

# Copy application code
COPY . .

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000

# Run production server
CMD ["npm", "start"]
