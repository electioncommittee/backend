import query from "../../lib/db";
//args[]=[type, year, area, granule]
async function elect(args, res) {
    let sql;
    if(args[0] === 'president'){
        
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

const INVALID_REQUEST = "Invalid argument sent from client.";

function validateRequest(query) {
    const typeList = ['president', 'legislator', 'legislator_at_large', 'local', 'recall', 'referendum'];
    const targetList = ['void', 'voter', 'elect', 'winner', 'consent', 'against'];
    const granuleList = ['country', 'county', 'district', 'village', 'constituency'];

    if (!typeList.includes(query.type)) return false;
    if (!targetList.includes(query.no) && isNaN(query.no)) return false;
    if (!granuleList.includes(query.granule)) return false;
    return true;
}

async function task(req, res) {

    const type = req.query.type;
    const granule = req.query.granule;
    const area = req.query.area;
    const caze = req.query.case; // `case` is presevered word
    const no = req.query.no;

    // Determine the source table to lookup, which contains the target 
    // data we need such as count of voters or polls. Let the main
    // source table have a shortcut name `p`.
    let mainTable;
    // Determine the columns to be selected.
    const selectedColumns = [];
    // Determine other tables that should be joined to the main table.
    const joinedTables = [];
    // Determine the column which gives the voter number; this column may be 
    // summed up or not
    let voteColumn;
    // Determine the clause which filter the candidate no (if needed)
    let candidateWhereClause = "TRUE";

    const isRecOrRef = type === "recall" || type === "referendum";
    switch (no) {
        case 'void':
            if (isRecOrRef) {
                mainTable = `${type}s AS p`
                voteColumn = "p.void";
            }
            else {
                mainTable = `${type}_polls AS p`
                voteColumn = "p.poll";
                candidateWhereClause = `p.no = -1`;
            }
            break;
        case 'voter':
            if (isRecOrRef) mainTable = `${type}s AS p`
            else mainTable = `${type}_voters AS p`
            voteColumn = "p.voter";
            break;
        case 'consent':
            // In this case, it must be referendum or recall
            if (!isRecOrRef) throw new Error(INVALID_REQUEST);

            mainTable = `${type}s AS p`
            voteColumn = "p.consent";
            break;
        case 'against':
            // In this case, it must be referendum or recall
            if (!isRecOrRef) throw new Error(INVALID_REQUEST);

            mainTable = `${type}s as p`
            voteColumn = "p.against";
            break;
        default:
            // In this case the `no` indicates the no number of candidates
            // In this case, it must not be referendum or recall
            if (isRecOrRef) throw new Error(INVALID_REQUEST);
            // In this case, it muse be an integer
            if (!isFinite(no)) throw new Error(INVALID_REQUEST);

            mainTable = `${type}_polls AS p`;
            voteColumn = "p.poll";
            candidateWhereClause = `p.no = ${no}`;
    }

    // Determine the principle of GROUP BY, which depends on the granule
    let groupByPolicy;
    switch (granule) {
        case 'country':
            // In this case, the selected area Id must be 0
            if (area != 0) throw new Error(INVALID_REQUEST);
            // In this case, the election type should not be recall
            if (type === "recall") throw new Error(INVALID_REQUEST);

            // In this case, no matter the election type is, the GROUP BY
            // policy is to sum up all rows. Hence no policy required
            groupByPolicy = null;

            // Not select any village or to query which district or county 
            // it belongs to; such data are not needed (undefined) accoring 
            // to the API. Only one column is selected: `vote`.
            selectedColumns.push(`SUM(${voteColumn}) AS vote`)
            break;

        case 'county':
            // In this case, the election type should not be legislator
            if (type === "legislator") throw new Error(INVALID_REQUEST);
            // In this case, the selected area Id must be less than 100
            if (area >= 100) throw new Error(INVALID_REQUEST);

            // County table are requried to group rows
            joinedTables.push("INNER JOIN cities AS c ON FLOOR(p.vill_id / 1000000) = c.id")

            // In this case, the GROUP BY policy is to calculate county ID
            groupByPolicy = `FLOOR(p.vill_id / 1000000)`;

            // Select vote and county data
            selectedColumns.push(`SUM(${voteColumn})  AS vote      `);
            selectedColumns.push(`c.id                AS countyId  `);
            selectedColumns.push(`c.name              AS countyName`);
            break;

        case 'district':
            // In this case, the election type should not be legislator
            if (type === "legislator") throw new Error(INVALID_REQUEST);
            // In this case, the selected area Id must not be a village ID
            if (area >= 1000000) throw new Error(INVALID_REQUEST);

            // Two tables are required to group rows
            joinedTables.push("INNER JOIN cities    AS c   ON FLOOR(p.vill_id / 1000000) = c.id")
            joinedTables.push("INNER JOIN districts   AS d   ON FLOOR(p.vill_id / 10000)   = d.id")

            // In this case, the GROUP BY policy is to calculate district ID
            groupByPolicy = `FLOOR(p.vill_id / 10000)`;

            // Select vote, county and district data
            selectedColumns.push(`SUM(${voteColumn}) AS vote        `);
            selectedColumns.push(`c.id               AS countyId    `);
            selectedColumns.push(`c.name             AS countyName  `);
            selectedColumns.push(`d.id               AS districtId  `);
            selectedColumns.push(`d.name             AS districtName`);
            break;

        case 'village':
            // In this case, any election type or any area ID is legal
            // NO PARAM CHECK

            // Two tables are required to group rows
            joinedTables.push("INNER JOIN cities    AS c   ON FLOOR(p.vill_id / 1000000) = c.id")
            joinedTables.push("INNER JOIN districts   AS d   ON FLOOR(p.vill_id / 10000)   = d.id")

            // In this case, There is no GROUP policy
            groupByPolicy = null;

            // Select all required columns
            // No sum up
            selectedColumns.push(`${voteColumn} AS vote        `);
            selectedColumns.push(`c.id          AS countyId    `);
            selectedColumns.push(`c.name        AS countyName  `);
            selectedColumns.push(`d.id          AS districtId  `);
            selectedColumns.push(`d.name        AS districtName`);
            selectedColumns.push(`v.id          AS villageId   `);
            selectedColumns.push(`v.name        AS villageName `);

            // If this is a legislator election, we need constituency data
            if (type === "legislator") {
                joinedTables.push("INNER JOIN legislator_constituencies  AS cst  ON p.vill_id = cst.vill_id");
                selectedColumns.push(`cst.constituency AS constituencyId`);
            }
            break;

        case 'constituency':
            // In this case, election type should be legislator
            if (type !== "legislator") throw new Error(INVALID_REQUEST);
            // In this case, area ID should be 0, county ID or constituency ID
            if (area > 1000000) throw new Error(INVALID_REQUEST);

            // This case is hard and need to lookup table `legislator_constituencies`
            // We need county data and constituency data
            joinedTables.push("INNER JOIN legislator_constituencies   AS cst   ON p.vill_id                  = cst.vill_id")
            joinedTables.push("INNER JOIN cities                    AS c     ON FLOOR(p.vill_id / 1000000) = c.id       ")

            // The GROUP BY policy is by constituency
            groupByPolicy = "cst.constituency"

            // Select columns
            selectedColumns.push(`${voteColumn}    AS vote          `);
            selectedColumns.push(`c.id             AS countyId      `);
            selectedColumns.push(`c.name           AS countyName    `);
            selectedColumns.push(`cst.constituency AS constituencyId`);
            break;

        default:
            throw new Error(INVALID_REQUEST);
    }

    // Determine the area where clause about param `area`
    // We only select rows whose villages are from desired region
    let areaWhereClause;
    if (area == 0) {
        // In this case any region should be considered
        areaWhereClause = "TRUE";
    }
    else if (area < 100) {
        // This should be county ID
        areaWhereClause = `FLOOR(p.vill_id / 1000000) = ${area}`;
    }
    else if (area < 10000) {
        // This should be:
        // - constituency;   if in legislator election
        // - district ID;    or else
        if (type === "legislator") {
            // Table `legislator_constituency` must have be joined as cst
            areaWhereClause = `cst.constituency = ${area}`;
        }
        else {
            areaWhereClause = `FLOOR(p.vill_id / 10000) == ${area}`
        }
    }
    else {
        // This should ne village ID
        areaWhereClause = `p.vill_id = ${area}`;
    }

    // Determine the where clause about param `year`
    // In normal election as well as recalls, this argument is same as what user gives
    // In referendum, this argument is undefined
    let yearWhereClause = `p.year = ${req.query.year}`;
    if (req.query.type === 'referendum') {
        yearWhereClause = "TRUE";
    }

    // Determine the where clause about param `case`
    // In normal elections, this argument is undefined
    // In recalls, `cases` indicates the recalled candidate ID
    // In referendums, `case` indicates the referedum case number
    let caseWhereClause = "TRUE";
    if (type === "recall") caseWhereClause = `recalls.cand_id = ${caze}`;
    else if (type === "referendum") caseWhereClause = `referendums.ref_case = ${caze}`;

    // Generate SQL statment and perform query
    const sql = `
        SELECT ${selectedColumns.join(', ')} 
        FROM ${mainTable} ${joinedTables.join(', ')}
        WHERE ${yearWhereClause}
            AND ${candidateWhereClause}
            AND ${areaWhereClause}
            AND ${caseWhereClause}
        ${groupByPolicy ? `GROUP BY ${groupByPolicy}` : ""}
    `;
    console.debug(sql);
    res.send(sql);
    return;

    const rows = await query(sql, [req.query.year]);

    // Response the result
    // TODO: not clean code
    let temp = [];
    for (let index in rows) {
        temp.push(rows[index].name);
    }
    if (temp.length === 0) {
        res.sendStatus(404);
        return;
    }
    res.send({ candidate: temp });
}

export default async function (req, res) {
    try {
        task(req, res);
    } catch (e) {
        if (e === INVALID_REQUEST) res.sendStatus(400);
        else throw e;
    }
}