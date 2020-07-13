export default function(req, res){
    
    const mariadb = require('mariadb/callback');
    const conn = mariadb.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: 'nctu_database_term_project'});

    if(isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020 || isNaN(req.query.countyId) || isNaN(req.query.districtId))return res.sendStatus(400);

    let dist = '';

    let y = parseInt(req.query.year);
    if(y > 2009 && y % 2 == 1)y-=1;

    let table1 = (y % 4 == 0)? 'president_voters' : 'local_voters';

    let city = req.query.countyId * 100;
    if(req.query.countyId != 0)dist = ' and villages.dist BETWEEN ' + city + ' and ' + (city+100);
    if(req.query.districtId != 0)dist = ' and villages.dist=' + req.query.districtId;
  
    let sql = 'SELECT villages.id, villages.name FROM `villages`, ' + table1 + ' WHERE year= ? and villages.id=' + table1 + '.vill_id' + dist;
  
    conn.query( sql, [y], function(err,rows){
        if (err) throw err;
        console.log(sql);
        console.dir(rows);
        let village = {};
        let key = 'key';
        village[key] = [];
        for(let index in rows){
            let data = {
                village: rows[index].name,
                id: rows[index].id
            };
            village[key].push(data);
        }  
        if(village[key].length === 0)res.status(404).send();
        else{
            res.send(village[key]);
        }
    });
}