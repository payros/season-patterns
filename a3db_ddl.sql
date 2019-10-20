DROP TABLE IF EXISTS temperatures;
CREATE TABLE temperatures (
    state           CHAR(2),
    date            DATE, 
    max             FLOAT,
    min             FLOAT,
    avg             FLOAT,
    PRIMARY KEY (state, date)
);
\copy temperatures(state, date, max, min, avg) FROM './temps.csv' DELIMITER ',' CSV HEADER;