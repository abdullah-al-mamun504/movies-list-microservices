# Use official lightweight nginx image
FROM nginx:alpine

# Copy frontend static files to nginx html folder
COPY ./ /usr/share/nginx/html

# Copy custom nginx config
COPY ./nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

