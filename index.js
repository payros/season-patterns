const express = require('express')
const { Pool } = require('pg')
const app = express()
const dotenv = require('dotenv');
dotenv.config();
const env = process.env
const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DATABASE,
  password: env.DB_PWD,
  port: env.DB_PORT,
})



console.log(env)
app.use(express.static('public'))

app.get('/get-monthly-temps', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? "AND state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT MAKE_DATE(2000, month::INT, 1) AS date, avg  FROM (SELECT DATE_PART('month', date) AS month, AVG(avg) AS avg FROM temperatures WHERE DATE_PART('year', date) >= $1 AND DATE_PART('year', date) <= $2" + stateFilter + " GROUP BY month ORDER BY month) AS t";

	pool.query(qryStr,[sYear, eYear]).then(rs => {
		res.json(rs.rows)
	}).catch(e => console.log(e))
})

app.get('/get-daily-temps', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? "AND state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT MAKE_DATE(2000, month::INT, day::INT) AS date, avg  FROM (SELECT DATE_PART('month', date) AS month, DATE_PART('day', date) AS day, AVG(avg) AS avg FROM temperatures WHERE DATE_PART('year', date) >= $1 AND DATE_PART('year', date) <= $2" + stateFilter + " GROUP BY month,day ORDER BY month,day) AS t";

	pool.query(qryStr, [sYear, eYear]).then(rs => {
		res.json(rs.rows)
	})
})

app.get('/get-states', (req, res) => {
	const qryStr = "SELECT DISTINCT state FROM temperatures ORDER BY state";

	pool.query(qryStr).then(rs => {
		res.json(rs.rows.map(s => s.state))
	}).catch(e => console.log(e))
})

app.get('/get-range', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? " WHERE state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT EXTRACT(YEAR FROM MIN(date))::INT AS min, EXTRACT(YEAR FROM MAX(date))::INT AS max FROM temperatures" + stateFilter;

	pool.query(qryStr).then(rs => {
		res.json(rs.rows[0])
	}).catch(e => console.log(e))
})

app.listen(env.PORT, () => console.log(`season-patterns listening on port ${env.PORT}!`))