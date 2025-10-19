FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command (overridden in docker-compose for dev)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
