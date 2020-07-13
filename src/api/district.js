export default function (req, res) {
    
    const mariadb = require('mariadb/callback');
    const conn = mariadb.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: 'nctu_database_term_project'});

    if(isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020 || isNaN(req.query.county_id))return res.sendStatus(400);

    let city = "";

    let y = parseInt(req.query.year);
    if(y > 2009 && y % 2 == 1)y-=1;

    let table1 = (y % 4 == 0)? 'president_voters' : 'local_voters';

    if(req.query.county_id != 0)city = ' and districts.city=' + req.query.county_id;

    let sql = 'SELECT districts.id, districts.name FROM districts, (SELECT SUBSTRING(vill_id, 1, 3) as id FROM ' + table1 + ' WHERE ' + table1 + '.year= ? group by id) as t1, (SELECT SUBSTRING(vill_id, 1, 4) as id FROM ' + table1 + ' WHERE ' + table1 + '.year= ? group by id) as t2 WHERE (districts.id=t1.id or districts.id=t2.id)' + city + ' group by districts.id';

    conn.query( sql, [y, y], function(err,rows){
        if (err) throw err;
        console.log(sql);
        console.dir(rows);
        let dist = {};
        let key = 'key';
        dist[key] = [];
        for(let index in rows){
            let data = {
                district: rows[index].name,
                id: rows[index].id
            };
            dist[key].push(data);
        }  
        if(dist[key].length === 0)res.status(404).send();
        else{
            res.send(dist[key]);
        }
    });
}