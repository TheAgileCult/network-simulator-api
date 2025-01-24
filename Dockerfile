# Use Node.js LTS (Long Term Support) as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Build TypeScript code
RUN npm run build

# Expose the port your app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]