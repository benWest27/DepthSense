#!/bin/bash
set -e

# Sleep briefly to ensure the main initialization completes.
sleep 5

# Use psql to conditionally create the 'admin' database.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-'EOSQL'
    -- Create the 'admin' database if it does not exist.
    DO
    $do$
    BEGIN
       IF NOT EXISTS (
          SELECT FROM pg_database WHERE datname = 'admin'
       ) THEN
          PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE admin');
       END IF;
    END
    $do$;
    -- Grant privileges on the 'admin' database to the 'admin' user.
    GRANT ALL PRIVILEGES ON DATABASE admin TO admin;
EOSQL
