FROM node:20-alpine

# Install OpenSSL libraries required by Prisma, PostgreSQL client tools, and ffmpeg for video thumbnails
RUN apk add --no-cache openssl libc6-compat postgresql-client ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config first (for better layer caching)
COPY prisma ./prisma
COPY prisma.config.* ./

# Generate Prisma Client with all binary targets
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Make startup script executable
RUN chmod +x scripts/migrate-and-start.sh

# Expose port
EXPOSE 5000

# Set entrypoint
ENTRYPOINT ["scripts/migrate-and-start.sh"]

# Start command
CMD ["npm", "run", "dev"]
