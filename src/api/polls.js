import query from "../../lib/db";
//args[]=[type, year, area, granule]
async function elect(args, res) {
    let sql;
    if (args[0] === 'president') {

    }
    else if (args[0] === 'local') {
        //參考用sql
        const temp_sql = `
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
        if (args[3] === 'county') {
            //範圍:全國
            if (args[2] == 0) {

            }
            //範圍:某城市
            else {

            }
        }
        //以鄉鎮市區為單位
        else if (args[3] === 'district') {
            //範圍:全國
            if (args[2] == 0) {

            }
            //範圍:某城市
            else {

            }
        }
        //以村里為單位
        else {
            //範圍:全國
            if (args[2] == 0) {

            }
            //範圍:某城市
            else {

            }
        }
    }
    else if (args[0] === 'legislator') {
        //參考用sql
        const temp_sql = ``;

        //以選區為單位
        if (args[3] === 'constituency') {
            //範圍:全國
            if (args[2] == 0) {
                sql = `
                `
            }
            //範圍:某城市
            else if (args[2] < 100) {
                sql = `
                `
            }
        }
        //以村里為單位
        else if (args[3] === 'village') {
            //範圍:全國
            if (args[2] == 0) {
                console.log(123);
                sql = `
                
                `
            }
        }
    }
    //legislator_at_large
    else {

    }
    console.log(sql);
    const rows = await query(sql, []);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}

const INVALID_REQUEST = "Invalid argument sent from client.";

function generateSQL(year, type, granule, area, caze, no, isSuperUser = false, orderByPoll = false) {

    // If this query is concerning about winner or elect, a subquery is 
    // needed. We have special function for this case.
    if (no === "winner") {
        return winnerTask(year, type, granule, area, caze);
    }

    // Determine the source table to lookup, which contains the target 
    // data we need such as count of voters or polls. Let the main
    // source table have a shortcut name `p`.
    let mainTable;
    // Determine the columns to be selected.
    const selectedColumns = [];
    // Determine other tables that should be joined to the main table.
    const joinedTables = [];
    // Determine the principle of GROUP BY, which depends on the granule
    const groupByPolicies = [];
    // Determine the column which gives the voter number; this column may be 
    // summed up or not
    let voteColumn;
    // Determine the clause which filter the candidate no (if needed)
    let candidateWhereClause = "TRUE";

    // In the following block we try to analyze the target candidate the client
    // wants to query. We have to determine some columns, which is defined in
    // the API.
    // - vote         : In most (just almost) case it is sum of polls of rows.
    // - no            
    // - candidateId  
    // - candidateName
    const isRecOrRef = type === "recall" || type === "referendum";
    switch (no) {
        case 'all':
            // This param is not in standard API, but plays as utility for other 
            // function. Block normal client to send such request
            if (!isSuperUser) throw new Error(INVALID_REQUEST);

            // In recalls or referendums, retrieve whether consent or against.
            // Two cases have to be discussed:
            // (1) If the granule is village, we simplu use MAX function to
            //     decide which rows to be selected
            // (2) otherwise we need to first SUM these rows then perform MAX; in
            //     this case we create two columns vv and xx which values are not 
            //     required to be sent back to the client
            // In this case no candidateId or candidateName columns
            if (isRecOrRef) {
                mainTable = `${type}s AS p`
                selectedColumns.push("p.no AS no");

                if (granule === "village") { // case (1)
                    selectedColumns.push(`SUM(MAX(p.consent, p.against)) AS vote`);
                }
                else {                       // case (2)
                    selectedColumns.push("SUM(p.consent) AS vv  ");
                    selectedColumns.push("SUM(p.against) AS xx  ");
                    selectedColumns.push("MAX(vv, xx)    AS vote");
                }
            }

            // In normal election, retrieve all candidates (exclusive of void polls)
            // In this case, GROUP BY `no` is required, and we do not want to put
            // void polls into consideration; hence a where claues is required.
            else {
                mainTable = `${type}_polls AS p`;
                selectedColumns.push(`SUM(p.poll) AS vote`);
                selectedColumns.push(`p.no        AS no  `);
                groupByPolicies.push("p.no");
                candidateWhereClause = "p.no != -1";
            }
            break;

        case 'void':
            // In this case `no`, `candidateId` and `candidateName` columns are 
            // omitted
            if (isRecOrRef) {
                mainTable = `${type}s AS p`
                selectedColumns.push(`SUM(p.void) AS vote`);
            }
            else {
                mainTable = `${type}_polls AS p`
                selectedColumns.push(`SUM(p.poll) AS vote`);
                candidateWhereClause = `p.no = -1`;
            }
            break;

        case 'voter':
            // In this case `no`, `candidateId` and `candidateName` columns are 
            // omitted
            mainTable = isRecOrRef ? `${type}s AS p` : `${type}_voters AS p`;
            selectedColumns.push(`SUM(p.voter) AS vote`);
            break;

        case 'consent':
            // In this case, it must be referendum or recall
            if (!isRecOrRef) throw new Error(INVALID_REQUEST);

            mainTable = `${type}s AS p`
            selectedColumns.push(`SUM(p.consent) AS vote`);
            selectedColumns.push(`consent        AS no  `);
            selectedColumns.push(`"consent"      AS no  `);
            break;

        case 'against':
            // In this case, it must be referendum or recall
            if (!isRecOrRef) throw new Error(INVALID_REQUEST);

            mainTable = `${type}s AS p`;
            selectedColumns.push(`SUM(p.against) AS vote`);
            selectedColumns.push(`"against"      AS no  `);
            break;

        default:
            // In this case, it must not be referendum or recall
            if (isRecOrRef) throw new Error(INVALID_REQUEST);
            // In this case, it muse be an integer
            if (!isFinite(no)) throw new Error(INVALID_REQUEST);

            // In this case GROUP BY no is required
            mainTable = `${type}_polls AS p`;
            candidateWhereClause = `p.no = ${no}`;
            selectedColumns.push(`SUM(p.poll) AS vote`);
            selectedColumns.push(`${no}       AS no  `);
            groupByPolicies.push(`p.no`);
            break;
    }


    switch (granule) {
        case 'country':
            // In this case, the selected area Id must be 0
            if (area != 0) throw new Error(INVALID_REQUEST);
            // In this case, the election type should not be recall
            if (type === "recall") throw new Error(INVALID_REQUEST);

            // In this case, no matter the election type is, the GROUP BY
            // policy is to sum up all rows.
            groupByPolicies.push('*');

            // Not select any village or to query which district or county 
            // it belongs to; such data are not needed (undefined) accoring 
            // to the API. So no any other columns should be selected.
            break;

        case 'county':
            // In this case, the election type should not be legislator
            if (type === "legislator") throw new Error(INVALID_REQUEST);
            // In this case, the selected area Id must be less than 100
            if (area >= 100) throw new Error(INVALID_REQUEST);

            // County table are requried to group rows
            joinedTables.push("INNER JOIN cities AS c ON FLOOR(p.vill_id / 1000000) = c.id")

            // In this case, the GROUP BY policy is to calculate county ID
            groupByPolicies.push(`FLOOR(p.vill_id / 1000000)`);

            // Select vote and county data
            selectedColumns.push(`c.id                AS countyId  `);
            selectedColumns.push(`c.name              AS countyName`);
            break;

        case 'district':
            // In this case, the election type should not be legislator
            if (type === "legislator") throw new Error(INVALID_REQUEST);
            // In this case, the selected area Id must not be a village ID
            if (area >= 1000000) throw new Error(INVALID_REQUEST);

            // Two tables are required to group rows
            joinedTables.push("INNER JOIN cities     AS c   ON FLOOR(p.vill_id / 1000000) = c.id")
            joinedTables.push("INNER JOIN districts  AS d   ON FLOOR(p.vill_id / 10000)   = d.id")

            // In this case, the GROUP BY policy is to calculate district ID
            groupByPolicies.push(`FLOOR(p.vill_id / 10000)`);

            // Select vote, county and district data
            selectedColumns.push(`c.id               AS countyId    `);
            selectedColumns.push(`c.name             AS countyName  `);
            selectedColumns.push(`d.id               AS districtId  `);
            selectedColumns.push(`d.name             AS districtName`);
            break;

        case 'village':
            // In this case, any election type or any area ID is legal
            // NO PARAM CHECK

            // Two tables are required to group rows
            joinedTables.push("INNER JOIN cities      AS c   ON FLOOR(p.vill_id / 1000000) = c.id")
            joinedTables.push("INNER JOIN districts   AS d   ON FLOOR(p.vill_id / 10000)   = d.id")
            joinedTables.push("INNER JOIN villages    AS v   ON       p.vill_id            = v.id")

            // In this case, The GROUP BY policy is simply village ID
            groupByPolicies.push('p.vill_id')

            // Select all required columns
            // No sum up
            selectedColumns.push(`c.id               AS countyId    `);
            selectedColumns.push(`c.name             AS countyName  `);
            selectedColumns.push(`d.id               AS districtId  `);
            selectedColumns.push(`d.name             AS districtName`);
            selectedColumns.push(`v.id               AS villageId   `);
            selectedColumns.push(`v.name             AS villageName `);

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
            joinedTables.push("INNER JOIN cities                      AS c     ON FLOOR(p.vill_id / 1000000) = c.id       ")

            // The GROUP BY policy is by constituency
            groupByPolicies.push("cst.constituency")

            // Select columns
            selectedColumns.push(`${voteColumn}    AS vote          `);
            selectedColumns.push(`c.id             AS countyId      `);
            selectedColumns.push(`c.name           AS countyName    `);
            selectedColumns.push(`cst.constituency AS constituencyId`);
            break;

        default:
            throw new Error(INVALID_REQUEST);
    }

    // Determine the area-where-clause about param `area`
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
        // This should be village ID
        areaWhereClause = `p.vill_id = ${area}`;
    }


    // Determine the where clause about param `year`
    // In normal election as well as recalls, this argument is same as what user gives
    // In referendum, this argument is undefined
    let yearWhereClause = `p.year = ${year}`;
    if (type === 'referendum') yearWhereClause = "TRUE";


    // Determine the where clause about param `case`
    // In normal elections, this argument is undefined
    // In recalls, `cases` indicates the recalled candidate ID
    // In referendums, `case` indicates the referedum case number
    let caseWhereClause = "TRUE";
    if (type === "recall") caseWhereClause = `p.cand_id = ${caze}`;
    else if (type === "referendum") caseWhereClause = `p.ref_case = ${caze}`;

    // Generate SQL statment and perform query
    const sql = `
        SELECT ${selectedColumns.join(', ')} 
        FROM ${mainTable} ${joinedTables.join(' ')}
        WHERE ${yearWhereClause}
            AND ${candidateWhereClause}
            AND ${areaWhereClause}
            AND ${caseWhereClause}
        GROUP BY ${groupByPolicies.join(', ')}
        ${orderByPoll ? "ORDER BY vote DESC" : ""}
    `;
    return sql;
}



function winnerTask(year, type, granule, area, caze) {

    // We first SELECT all required rows; then performs a subquery
    const innerQuery = generateSQL(year, type, granule, area, caze, "all", true, true);

    // Determine the GROUP BY policy; this depends on granule
    // The ORDER BY policy is always same as GROUP BY
    let groupByAndOrderByPolicy;
    switch (granule) {
        case "country":
            // In this case no subquery is needed
            groupByAndOrderByPolicy = null;
            break;
        case "county":
            groupByAndOrderByPolicy = "countyId";
            break;
        case "legislator":
            groupByAndOrderByPolicy = "legislatorId";
            break;
        case "district":
            groupByAndOrderByPolicy = "districtId";
            break;
        case "village":
            groupByAndOrderByPolicy = "villageId";
            break;
        default:
            throw new Error(INVALID_REQUEST);
    }

    const query = `
        SELECT * FROM (${innerQuery}) AS tmp
        GROUP BY ${groupByAndOrderByPolicy || "*"}
        ORDER BY ${groupByAndOrderByPolicy || "no"}
    `
    return query;
}

export default async function (req, res) {
    try {
        const sql = generateSQL(
            req.query.year,
            req.query.type,
            req.query.granule,
            req.query.area,
            req.query.case,
            req.query.no
        );
        res.send(sql);
        return;
        const rows = await query(sql);
        res.send(rows);
    } catch (e) {
        if (e === INVALID_REQUEST) res.sendStatus(400);
        else throw e;
        res.sendStatus(400);
    }
}