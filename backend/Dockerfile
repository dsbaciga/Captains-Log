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

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start command (overridden in docker-compose for dev)
CMD ["npm", "run", "dev"]
