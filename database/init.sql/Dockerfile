FROM postgres:14

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=depthsense
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=password

# Copy initialization scripts
COPY ./database/init.sql /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432

# Ensure both databases exist at startup
RUN echo "CREATE DATABASE admin;" >> /docker-entrypoint-initdb.d/00_create_admin_db.sql
