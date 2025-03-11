FROM postgres:14

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=depthsense
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=password

# Copy initialization scripts
# init.sql will run against the depthsense database.
COPY ./database/init.sql /docker-entrypoint-initdb.d/

# init-admin.sh will create the additional "admin" database.
COPY ./database/init-admin.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/init-admin.sh

# Expose PostgreSQL port
EXPOSE 5432
