# Serve the Marco Polo landing page as a static site.
FROM nginx:alpine
COPY landing/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
