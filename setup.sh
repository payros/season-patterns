dropdb -U --if-exists postgres a3db
createdb -U postgres a3db
psql -U postgres -d a3db -a -f a3db_ddl.sql
yarn install