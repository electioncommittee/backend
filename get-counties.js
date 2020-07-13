const express = require('express');
const app=express();
const bodyparser = require('body-parser');
require('dotenv').config();

let jsonparser = bodyparser.json();
app.use(express.json());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));


const mariadb = require('mariadb/callback');
const conn = mariadb.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: 'nctu_database_term_project'});

app.get('/api/get-counties',jsonparser, (req, res) =>{

    let sql = 'SELECT * FROM `cities`'

    if(isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020)return res.sendStatus(400);

    conn.query( sql, function(err,rows){
        if (err) throw err;
        let city = {};
        let key = 'key';
        city[key] = [];
        for(index in rows){
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
            console.dir(city[key]);
            res.status(200).send(
                city[key]
            );
        }
    });
});

app.listen(3000, () =>{
    console.log('port 3000');
});