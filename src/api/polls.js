import query from "../../lib/db";
//args[]=[type, year, area, granule]
async function elect(args, res) {
    let sql;
    if(args[0] === 'president'){
        switch(agrs[3]){
            case 'country'
        }
    }
    else if(args[0] === 'local'){
        //參考用sql
        const temp_sql =`
        SELECT t3.no,t3.cityid,t3.polls
        FROM
            (SELECT SUM(t1.poll) as polls,floor(t1.vill_id/1000000) as cityid,t1.no as no
            FROM local_polls as t1
            WHERE t1.year=${args[1]} AND t1.no!=-1
            GROUP BY cityid,t1.no
            )as t3,
            (SELECT MAX(t2.polls) as polls,t2.cityid as cityid
            FROM(
                SELECT SUM(t1.poll) as polls,floor(t1.vill_id/1000000) as cityid,t1.no as no
                FROM local_polls as t1
                WHERE t1.year=${args[1]} AND t1.no!=-1
                GROUP BY cityid,t1.no) as t2
            GROUP BY t2.cityid)as t4
        WHERE t4.polls=t3.polls AND t3.cityid=t4.cityid`

        //以城市為單位
        if(args[3] === 'county'){
            //範圍:全國
            if(args[2] == 0){

            }
            //範圍:某城市
            else{

            }
        }
        //以鄉鎮市區為單位
        else if(args[3] === 'district'){
            //範圍:全國
            if(args[2] == 0){

            }
            //範圍:某城市
            else{
                
            }
        }
        //以村里為單位
        else{
            //範圍:全國
            if(args[2] == 0){

            }
            //範圍:某城市
            else{
                
            }
        }
    }
    else if(args[0] === 'legislator'){
        //參考用sql
        const temp_sql = ``;
        
        //以選區為單位
        if(args[3] === 'constituency'){
            //範圍:全國
            if(args[2] == 0){
                sql=`
                `
            }
            //範圍:某城市
            else if(args[2] < 100){
                sql = `
                `
            }
        }
        //以村里為單位
        else if(args[3] === 'village'){
            //範圍:全國
            if(args[2] == 0){console.log(123);
                sql = `
                
                `
            }
        }
    }
    //legislator_at_large
    else{

    }
    console.log(sql);
    const rows = await query(sql, []);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}

export default async function (req, res) {

    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall', 'referendum'];
    const array2 = ['void', 'voter', 'elect', 'winner', 'consent', 'against'];
    const array3 = ['country', 'county', 'district', 'village', 'constituency'];

    if (!array1.includes(req.query.type) || !array3.includes(req.query.granule)) return res.sendStatus(400);
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
            q2 = ',0';
            break;
        case 'county':
            if( area === 0 ){
                q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `, CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) AS id` : `, CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) AS id` ;
                areaGroupBy = `GROUP BY id`;
            }
            else{ 
                q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `, CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) AS id` : `, CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) AS id` ;
                areaWhereClause = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                    `CAST(${table1}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}`: `CAST(${table2}.vill_id/1000000 AS DECIMAL(2,0)) = ${area}` ;
            }
            break;
        case 'district':

            q2 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? 
                `, CAST(${table1}.vill_id/10000 AS DECIMAL(4,0)) AS id` : `, CAST(${table2}.vill_id/10000 AS DECIMAL(4,0)) AS id` ;
            
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
                `, ${table1}.vill_id AS id` : `, ${table2}.vill_id AS id` ;

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

            q2 = `, legislator_constituencies.constituency AS id`;
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

    let q1,id='',table3='';
    if(isNaN(req.query.no)){
        switch(req.query.no){
            case 'void':
                q1 = ( req.query.type === 'recall' || req.query.type === 'referendum' )? `SUM(${table1}.void)` : `SUM(${table2}.poll)`;
                id = ( req.query.type === 'recall' || req.query.type === 'referendum' )? '' : `${table2}.no=-1`;
                break;
            case 'voter':
                if( req.query.type === 'recall' || req.query.type === 'referendum' ){
                    q1 = `SUM(${req.query.type}.voter)`;
                    id = '';
                }
                else {
                    table3 = `${req.query.type}_voters`;
                    q1 = `SUM(${table3}.voter)`;
                    id = '';
                }
                break;
            case 'elect':
                const args=[req.query.type, req.query.year, req.query.area, req.query.granule];
                elect(args, res);
                return;
            case 'winner':
                break;
            case 'consent':
                q1 = `SUM(${table1}.consent)`;
                id = '';
                break;
            case 'against':
                q1 = `SUM(${table1}.against)`;
                id = '';
                break;
        }
    }
    else {
        q1 = `SUM(${table2}.poll)`;
        if(req.query.no != 0)
            id = `${table2}.no = ${req.query.no}`;
        else;

    }

    let yearWhereClause = ( req.query.type === 'referendum' )? '' : yearWhereClause = `${table2}.year = ${req.query.year}`;
    if(table2 != '') table2 = `, ${table2}`;
    if(table3 != '') table3 = `, ${table3}`;
    if(table4 != '') table4 = `, ${table4}`;

    

    let refCase = ( req.query.type === 'referendum' || req.query.type === 'recall ')? 
    (req.query.type === 'recall')? `recalls.cand_id = ${req.query.case}` : `referendums.ref_case = ${req.query.case}` : '';

    if( yearWhereClause != '' ) 
        id = ( id === '' )? '' : `and ${id}`; 
    
    if( yearWhereClause != '' || id != '' ) 
        areaWhereClause = ( areaWhereClause === '' )? '' : `and ${areaWhereClause}`;

    if( yearWhereClause != '' || id != '' || area != '' ) 
        refCase = ( refCase === '' )? '' : `and ${refCase}`;

    const sql = `
    SELECT ${q1} ${q2} FROM ${table1} ${table2} ${table3} ${table4}
    WHERE ${yearWhereClause} ${id} ${areaWhereClause} ${refCase}
    ${areaGroupBy}`;
    
    const args = [];

    const rows = await query(sql, args);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);

}