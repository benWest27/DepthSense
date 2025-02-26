# Use Nginx as the base image
FROM nginx:latest

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy static files for frontend viewer service
COPY public/ /usr/share/nginx/html/

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose necessary ports
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
