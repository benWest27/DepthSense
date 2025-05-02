# Use the official NGINX image as the base
FROM nginx:latest

# Copy the custom NGINX configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the MIME types file
COPY mime.types /etc/nginx/mime.types

# Only copy public files if they exist
COPY public/ /usr/share/nginx/html/ 

# Expose port 80 for web traffic
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
