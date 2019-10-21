const express = require('express')
const mysql = require('mysql2');
const SocksConnection = require('socksjs');
const url = require('url')
const app = express()
const dotenv = require('dotenv');
dotenv.config();
const env = process.env

// const fixieValues = env.FIXIE_SOCKS_HOST.split(new RegExp('[/(:\\/@)/]+'));

const mysqlServer = {
  host: env.DB_HOST,
  port: env.DB_PORT
}

var proxy = url.parse(env.QUOTAGUARDSTATIC_URL),
    auth = proxy.auth,
    username = auth.split(':')[0],
    pass = auth.split(':')[1];

var sock_options = {
    host: proxy.hostname,
    port: 1080,
    user: username,
    pass: pass
};

const pool  = mysql.createPool({
  user: env.DB_USER,
  database: env.DATABASE,
  password: env.DB_PWD,
  stream: (cb) => {
    const newStream = new SocksConnection(mysqlServer, sock_options);
    return newStream
  }
})

app.use(express.static('public'))

app.get('/get-monthly-temps', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? " AND state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT STR_TO_DATE(CONCAT('2000-',month,'-1'), '%Y-%m-%d') AS date, avg  FROM (SELECT MONTH(date) AS month, AVG(avg) AS avg FROM temperatures WHERE YEAR(date) >= ? AND YEAR(date) <= ?" + stateFilter + " GROUP BY month ORDER BY month) AS t";

	pool.query(qryStr,[sYear, eYear], (err, rs) => {
		if(err) {
			console.log(err)
			res.send("An Error Occurred")
		} else {
			res.json(rs)
		}
	})
})

app.get('/get-daily-temps', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? " AND state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT STR_TO_DATE(CONCAT('2000-',month,'-',day), '%Y-%m-%d') AS date, avg FROM (SELECT MONTH(date) AS month, DAY(date) AS day, AVG(avg) AS avg FROM temperatures WHERE YEAR(date) >= ? AND YEAR(date) <= ?" + stateFilter + " GROUP BY month,day ORDER BY month,day) AS t";

	pool.query(qryStr, [sYear, eYear], (err, rs) => {
		if(err) {
			console.log(err)
			res.send("An Error Occurred")
		} else {
			res.json(rs)
		}
	})
})

app.get('/get-states', (req, res) => {
	const qryStr = "SELECT DISTINCT state FROM temperatures ORDER BY state";

	pool.query(qryStr, (err, rs) => {
		if(err) {
			console.log(err)
			res.send("An Error Occurred")
		} else {
			res.json(rs.map(s => s.state))
		}
	})
})

app.get('/get-range', (req, res) => {
	const sYear = parseInt(req.query.startYear);
	const eYear = parseInt(req.query.endYear);
	const stateFilter = req.query.states ? " WHERE state IN ('" + req.query.states.replace(/,/g, "','") + "')" : "";
	const qryStr = "SELECT YEAR(MIN(date)) AS min, YEAR(MAX(date)) AS max FROM temperatures" + stateFilter;

	pool.query(qryStr, (err, rs) => {
		if(err) {
			console.log(err)
			res.send("An Error Occurred")
		} else {
			res.json(rs[0])
		}
	})
})

app.listen(env.PORT, () => console.log(`Server started. Now open your browser on  http:\/\/localhost:${env.PORT}\/`))