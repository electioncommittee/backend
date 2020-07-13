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


app.get('/api/get-candidates',jsonparser, (req, res) =>{
    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall'];
    
    if(isNaN(req.query.year) || !array1.includes(req.query.type) || isNaN(req.query.area)) return res.sendStatus(400);

    let table1,id1,q1,area="";
    let table2='candidates';
    switch(req.query.type){
        case 'president':
            table1 = 'president_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            break;
        case 'legislator':
            table1 = 'legislator_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            area = ' and legislator_candidates.constituency=' + req.query.area;
            break;
        case 'legislator_at_large':
            table1 = 'legislator_at_large_candidates';
            id1 = 'and parties.id=' + table1 + '.party_id';
            q1 = 'parties.name';
            table2 = 'parties';
            break;
        case 'local':
            table1 = 'local_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            area = ' and local_candidates.city_id=' + req.query.area;
            break;
        case 'recall':
            table1 = 'recalls';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            break;
    }

    let sql = 'SELECT '+ q1 +' FROM '+ table1 +', '+ table2 +' WHERE year= ? ' + id1 + area + ' group by ' + q1;
    
    conn.query( sql, [req.query.year], function(err,rows){
        if (err) throw err;
        let temp=[];
        for(index in rows){
            temp.push(rows[index].name);
        }  
        if(temp.length === 0)res.status(404).send();
        else{
            console.dir(temp);
            res.status(200).send(
                {
                    candidate: temp
                }
            );
        }
    });
    
});

app.get('/api/get-counties',jsonparser, (req, res) =>{
    if(!req.body) return res.sendStatus(400);
});

app.get('/api/get-districts',jsonparser, (req, res) =>{
    if(!req.body) return res.sendStatus(400);
});

app.get('/api/get-villages',jsonparser, (req, res) =>{
    if(!req.body) return res.sendStatus(400);
});

app.get('/api/get-polls',jsonparser, (req, res) =>{
    if(!req.body) return res.sendStatus(400);
});

app.listen(3000, () =>{
    console.log('port 3000');
});