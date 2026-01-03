FROM node:20-alpine

# Install OpenSSL libraries required by Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Make startup script executable
RUN chmod +x scripts/migrate-and-start.sh

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Set entrypoint
ENTRYPOINT ["scripts/migrate-and-start.sh"]

# Start command
CMD ["npm", "run", "dev"]
