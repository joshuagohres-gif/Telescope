FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Set default environment
ENV NODE_ENV=production
ENV PORT=5000

# Run migrations and start server
CMD ["sh", "-c", "npm run db:push && npm start"]
