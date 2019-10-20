createdb -U postgres weatherdb
psql -U postgres -d weatherdb -a -f weatherdb_ddl.sql