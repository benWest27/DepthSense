# Use an official Node.js runtime as the base image
FROM node:18-alpine AS base

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application source code
COPY . .

# Expose the service port
EXPOSE 5002

# Start the application
CMD ["node", "server.js"]
