import query from "../../lib/db";

export default async function (req, res) {

    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall', 'referendum'];
    const array2 = ['void', 'voter', 'elect', 'winner', 'consent', 'against'];
    const array3 = ['country', 'county', 'district', 'village', 'constituency'];

    if (!isUndefined(req.query.year) && isNaN(req.query.year) || !array1.includes(req.query.type) || isNaN(req.query.area) || !array3.includes(req.query.granule)) return res.sendStatus(400);
    if (isNaN(req.query.no) && !array2.includes(req.query.no)) return res.sendStatus(400);

    let table1, table2;

    switch (req.query.type) {
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
        case 'referendum':
            table1 = 'referendums';
            table2 = '';
            break;
    }

    let q1,id,table3='';
    if(isNaN(req.query.no)){
        switch(req.query.no){
            case 'void':
                q1 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? table1 + '.void' : table2 + '.poll';
                id = ( req.query.type === 'recall' || req.query.type === 'referendum' )? '' : table2 + '.no=-1';
                break;
            case 'voter':
                if( req.query.type === 'recall' || req.query.type === 'referendum' ){
                    q1 = req.query.type + '.voter';
                    id = '';
                }
                else {
                    table3 = req.query.type + '_voters';
                    q1 = table3 + '.voter';
                    id = '';
                }
                break;
            case 'elect':
                let temp_area='';
                let temp_range = req.query.area * 1000000;
                if(req.query.type === 'legislator'){
                    temp_area = 'and legislator_polls.vill_id BETWEEN ' + temp_range + ' and ' + ( temp_range * 2 - 1 );
                }
                if(req.query.type === 'local'){
                    temp_area = 'and local_polls.vill_id BETWEEN ' + temp_range + ' and ' + ( temp_range * 2 - 1 );
                }
                
                const temp_sql = `SELECT ${table2}.no, SUM(${table2}.poll) 
                FROM ${table2} 
                WHERE year = ? ${temp_area} 
                GROUP BY no 
                ORDER BY DESC`;
                
                const temp_args = [req.query.year];
                const temp_rows = await query(temp_sql, temp_args);
                id = table2 + '.no=' + temp_rows[0].no;
                break;
            case 'winner':
                break;
            case 'consent':
                break;
            case 'against':
                break;
        }
    }
    else {
        q1 = table2 + '.poll';
        id = table2 + '.no=' + req.query.no;
    }
    
    const sql = `
    SELECT ${q1} FROM ${table1} ${', ' + table2} ${', ' + table3}
    WHERE year = ? ${id} ${area} 
    GROUP BY ${q1}`;
    
    conn.query( sql, [req.query.year], function(err,rows){
        if (err) throw err;
        let temp = [];
        for (let index in rows) {
            temp.push(rows[index].name);
        }
        if (temp.length === 0) res.status(404).send();
        else {
            console.dir(temp);
            res.status(200).send(
                {
                    candidate: temp
                }
            );
        }
    });
}