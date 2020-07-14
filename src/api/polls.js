import query from "../../lib/db";

export default async function (req, res) {

    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall', 'referendum'];
    const array2 = ['void', 'voter', 'elect', 'winner', 'consent', 'against'];
    const array3 = ['country', 'county', 'district', 'village', 'constituency'];

    if (!isUndefined(req.query.year) && isNaN(req.query.year) || !array1.includes(req.query.type) || !array3.includes(req.query.granule)) return res.sendStatus(400);
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
    
    let areaWhereClause = '', areaGroupBy = '', q2 = '', table4 = '';
    const area = req.query.area;
    switch(req.query.granule){
        case 'country':
            q2 = '0';
            break;
        case 'county':
            if( area === 0 ){
                q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) AS id` : `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) AS id` ;
                areaGroupBy = `GROUP BY id`;
            }
            else{ 
                q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) AS id` : `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) AS id` ;
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}`: `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}` ;
            }
            break;
        case 'district':

            q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                `CAST(${table1}.vill_id/10000 AS DECIMAL(4,0)) AS id` : `CAST(${table2}.vill_id/10000 AS DECIMAL(4,0)) AS id` ;
            
            if( area === 0 ){
                areaGroupBy = `GROUP BY id`;
            }
            else if( area < 100 ){ 
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}`: `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}` ;
                areaGroupBy = `GROUP BY id`;
            }
            else{
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/10000 AS DECIMAL(4,0)) = ${area}`: `CAST(${table2}.vill_id/10000 AS DECIMAL(4,0)) = ${area}` ;
            }
            break;
        case 'village':

            q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                `${table1}.vill_id AS id` : `${table2}.vill_id AS id` ;

            if( area === 0){
            }
            else if( area < 99 ){
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}`: `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}` ;
                areaGroupBy = `GROUP BY id`;
            }
            else if( area < 10000){
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/10000 AS DECIMAL(4,0)) = ${area}`: `CAST(${table2}.vill_id/10000 AS DECIMAL(4,0)) = ${area}` ;
                areaGroupBy = `GROUP BY id`;
            }
            else{
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `${table1}.vill_id = ${area}`: `${table2}.vill_id = ${area}` ;
            }
            break;
        case 'constituency':

            q2 = `legislator_constituencies.constituency AS id`;
            table4 = 'legislator_constituencies';

            if( area === 0){
                areaGroupBy = `GROUP BY id`;
            }
            else if( area < 100){
                areaGroupBy = `GROUP BY id`;
                areaWhereClause = `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}`;
            }

            break;
    }

    let q1,id,table3='';
    if(isNaN(req.query.no)){
        switch(req.query.no){
            case 'void':
                q1 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? `${table1}.void` : `${table2}.poll`;
                id = ( req.query.type === 'recall' || req.query.type === 'referendum' )? '' : `${table2}.no=-1`;
                break;
            case 'voter':
                if( req.query.type === 'recall' || req.query.type === 'referendum' ){
                    q1 = `${req.query.type}.voter`;
                    id = '';
                }
                else {
                    table3 = `${req.query.type}_voters`;
                    q1 = `${table3}.voter`;
                    id = '';
                }
                break;
            case 'elect':
                let temp_area='';
                let temp_range = req.query.area * 1000000;
                if(req.query.type === 'legislator'){
                    temp_area = `and legislator_polls.vill_id BETWEEN ' + temp_range + ' and ' + ( temp_range * 2 - 1 )`;
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
                q1 = `${table1}.consent`;
                id = '';
                break;
            case 'against':
                q1 = `${table1}.against`;
                id = '';
                break;
        }
    }
    else {
        q1 = table2 + '.poll';
        id = table2 + '.no=' + req.query.no;
    }

    if(table2 != '') table2 = `, ${table2}`;
    if(table3 != '') table3 = `, ${table3}`;
    if(table4 != '') table4 = `, ${table4}`;

    const yearWhereClause = ( req.query.type === 'referendum' )? '' : yearWhereClause = `year = ${req.query.year}`;

    let refCase = ( req.query.type === 'referendum' || req.query.type === 'recall ')? 
    (req.query.type === 'recall')? `recalls.cand_id = ${req.query.case}` : `referendums.ref_case = ${req.query.case}` : '';

    if( yearWhereClause != '' ) 
        id = ( id === '' )? '' : `and ${id}`; 
    
    if( yearWhereClause != '' || id != '' ) 
        area = ( area === '' )? '' : `and ${area}`;

    if( yearWhereClause != '' || id != '' || area != '' ) 
        refCase = ( refCase === '' )? '' : `and ${refCase}`;

    const sql = `
    SELECT ${q1} ${q2} FROM ${table1} ${table2} ${table3} ${table4}
    WHERE ${yearWhereClause} ${id} ${areaWhereClause} ${refCase}
    ${areaGroupBy}`;
    
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