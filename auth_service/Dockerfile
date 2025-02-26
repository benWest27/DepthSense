# Use an official Node.js runtime as the base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application
COPY . .

# Set environment variables (use .env in production)
ENV NODE_ENV=production
ENV PORT=5000

# Expose the application's port
EXPOSE 5000

# Define the command to start the application
CMD ["node", "server.js"]
