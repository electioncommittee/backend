export default function (req, res) {
    
    const mariadb = require('mariadb/callback');
    const conn = mariadb.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: 'nctu_database_term_project'});

    let sql = 'SELECT * FROM `cities`';

    if(isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020)return res.sendStatus(400);
    
    conn.query( sql, function(err,rows){
        if (err) throw err;
        console.log(rows.length);
        let city = {};
        let key = 'key';
        city[key] = [];
        for(let index in rows){
            if(rows[index].id == 4 && req.query.year<2014)continue;
            if(rows[index].id == 5 && req.query.year>2013)continue;
            let data = {
                city: rows[index].name,
                id: rows[index].id
            };
            city[key].push(data);
        }  
        if(city[key].length === 0)res.status(404).send();
        else{
            res.send(city[key]);
        }
    });
}