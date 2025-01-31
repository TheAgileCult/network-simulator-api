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

# Create initial rates file
RUN echo '{"date":"2024-01-01","rates":{"USD":{"EUR":0.85,"GBP":0.73},"EUR":{"USD":1.18,"GBP":0.86},"GBP":{"USD":1.37,"EUR":1.16}}}' > rates.json

# Expose the port your app runs on
EXPOSE 8080

# Create a startup script that runs update-rates in the background
RUN echo '#!/bin/sh\nnpm run update-rates & npm start' > start.sh && chmod +x start.sh

# Start the application with the startup script
CMD ["./start.sh"]