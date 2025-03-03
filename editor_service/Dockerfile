# Use an official Node.js runtime as the base image
FROM node:18-alpine
RUN apk update && apk add --no-cache curl
# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --force

# Copy the rest of the application code
COPY . .

# If you have a build script for your client, run it here (e.g., npm run build)
# Remove or update this if not needed:
RUN npm run build

# Expose the port that the app will run on
EXPOSE 5001

# Optionally, ensure proper permissions and switch to a non-root user
# RUN mkdir -p node_modules && chown -R node:node .
USER node

# Define the command to run the application
# Update "index.js" to "server.js" if that’s your intended entry point.
CMD ["node", "server.js"]
