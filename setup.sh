PGPASSWORD=password dropdb -U a3user --if-exists a3db
PGPASSWORD=password createdb -U a3user a3db
PGPASSWORD=password psql -U a3user -d a3db -a -f a3db_ddl.sql
yarn install