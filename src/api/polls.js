export default function (req, res) {
    
    const mariadb = require('mariadb/callback');
    const conn = mariadb.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: 'nctu_database_term_project'});

    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall'];
    const array2 = ['void', 'voter', 'elect', 'winner'];
    const array3 = ['country', 'county', 'district', 'village', 'constituency'];

    if(isNaN(req.query.year) || !array1.includes(req.query.type) || isNaN(req.query.area) || !array3.includes(req.query.granule)) return res.sendStatus(400);
    if(isNaN(req.query.no) && !array2.includes(req.query.no))return res.sendStatus(400);

    let table1,table2;

    switch(req.query.type){
        case 'president':
            table1 = 'president_candidates';
            table2 = 'president_polls';
            break;
        case 'legislator':
            table1 = 'legislator_candidates';
            table2 = 'legislator_polls';
            break;
        case 'legislator_at_large':
            table1 = 'legislator_at_large_candidates';
            table2 = 'legislator_at_large_polls';
            break;
        case 'local':
            table1 = 'local_candidates';
            table2 = 'local_polls';
            break;
        case 'recall':
            table1 = 'recalls';
            table2 = '';
            break;
    }

    let q1,id,table3='';
    let flag=false;
    if(isNaN(req.query.no)){
        switch(req.query.no){
            case 'void':
                q1 = (req.query.type == 'recall')? table1 + '.void' : table2 + '.poll';
                id = (req.query.type == 'recall')? '' : table2 + '.no=-1';
                break;
            case 'voter':
                if(req.query.type == 'recall'){
                    q1 = req.query.type + '.voter';
                    id = '';
                }
                else{
                    table3 = req.query.type + '_voters';
                    q1 = table3 + '.voter';
                    id = '';
                }
                break;
            case 'elect':
                let temp_area='';
                let cons = req.query.area * 100;
                let temp_table1 = '';
                if(req.query.type == 'legislator'){
                    temp_area = ' and legislator_candidate.constituency BETWEEN ' + cons + ' and ' + (cons+100);
                    temp_table1 = table1;
                }
                if(req.query.type == 'local'){
                    temp_area = ' and local_candidates.city_id=' + req.query.area;
                    temp_table1 = table1;
                }
                let temp_sql = 'SELECT ' + table2 + '.no, SUM(' + table2 + '.poll) FROM '+ temp_table1 + ', ' + table2 + ' WHERE year= ?' + temp_area + ' GROUP BY no ORDER BY DESC';
                conn.query(temp_sql, [req.query.year], function(err,rows){
                    if(err) throw err;
                    if(rows.length == 0)flag=true;
                    else id = rows[0].no;
                });        
                break;
            case 'winner':
                break;
        }
    }
    else{
        q1 = table2 + '.poll';
        id = table2 + '.no=' + req.query.no; 
    }
    
    let sql = 'SELECT '+ q1 +' FROM '+ table1 +', '+ table2 +' WHERE year= ? ' + id1 + area + ' group by ' + q1;
    
    conn.query( sql, [req.query.year], function(err,rows){
        if (err) throw err;
        let temp=[];
        for(let index in rows){
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
}