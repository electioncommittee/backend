import query from "../../lib/db";

const INVALID_REQUEST = "Invalid argument sent from client.";

function generateSQL(year, type, granule, area, caze, no, isSuperUser = false, orderClause = "", limitClause = "") {

    // If this query is concerning about winner or elect, a subquery is 
    // needed. We have special function for this case.
    if (no === "winner") {
        return winnerTask(year, type, granule, area, caze);
    } else if (no === "elect") {
        return electTask(year, type, granule, area);
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
            // function. Block normal client from sending such request
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

                if (granule === "village") { // case (1)
                    selectedColumns.push("SUM(GREATEST(p.consent, p.against))                        AS vote");
                    selectedColumns.push("IF(p.consent >= p.against, 'consent', 'against')           AS no  ");
                }
                else {                       // case (2)
                    selectedColumns.push("GREATEST(SUM(p.consent), SUM(p.against))                   AS vote");
                    selectedColumns.push("IF(SUM(p.consent) >= SUM(p.against), 'consent', 'against') AS no  ");
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
            // policy is to sum up all rows. No new rules.

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
            selectedColumns.push(`c.id   AS countyId  `);
            selectedColumns.push(`c.name AS countyName`);
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
            selectedColumns.push(`c.id     AS countyId    `);
            selectedColumns.push(`c.name   AS countyName  `);
            selectedColumns.push(`d.id     AS districtId  `);
            selectedColumns.push(`d.name   AS districtName`);
            break;

        case 'village':
            // In this case, any election type or any area ID is legal
            // NO PARAM CHECK

            // Two tables are required to group rows
            joinedTables.push("INNER JOIN cities      AS c   ON FLOOR(p.vill_id / 1000000) = c.id");
            joinedTables.push("INNER JOIN districts   AS d   ON FLOOR(p.vill_id / 10000)   = d.id");
            joinedTables.push("INNER JOIN villages    AS v   ON       p.vill_id            = v.id");

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
            break;

        case 'constituency':
            // In this case, election type should be legislator
            if (type !== "legislator") throw new Error(INVALID_REQUEST);
            // In this case, area ID should be 0, county ID or constituency ID
            if (area > 1000000) throw new Error(INVALID_REQUEST);

            // The GROUP BY policy is by constituency
            groupByPolicies.push("lc.constituency")

            joinedTables.push("INNER JOIN cities                     AS c      ON FLOOR(p.vill_id / 1000000) = c.id       ")

            // Select columns
            selectedColumns.push(`c.id             AS countyId      `);
            selectedColumns.push(`c.name           AS countyName    `);
            selectedColumns.push(`lc.constituency  AS constituencyId`);
            break;

        default:
            throw new Error(INVALID_REQUEST);
    }

    // Determine how to join candidate information
    switch (type) {
        case "president":
            selectedColumns.push(`cand.name   AS candidateName`);
            selectedColumns.push(`cand.id     AS candidateId  `);
            selectedColumns.push(`party.id    AS partyId      `);
            selectedColumns.push(`party.name  AS partyName    `);
            joinedTables.push(`INNER JOIN ${type}_candidates  AS pc    ON p.no     = pc.no      `);
            joinedTables.push(`INNER JOIN candidates          AS cand  ON cand.id  = pc.cand_id `);
            joinedTables.push(`INNER JOIN parties             AS party ON party.id = pc.party_id`);
            break;

        case "local":
            selectedColumns.push(`cand.name   AS candidateName`);
            selectedColumns.push(`cand.id     AS candidateId  `);
            selectedColumns.push(`party.id    AS partyId      `);
            selectedColumns.push(`party.name  AS partyName    `);
            joinedTables.push(`INNER JOIN ${type}_candidates  AS pc    ON FLOOR(p.vill_id / 1000000) = pc.city_id    
                                    AND p.no = pc.no`);
            joinedTables.push(`INNER JOIN candidates          AS cand  ON cand.id                    = pc.cand_id `);
            joinedTables.push(`INNER JOIN parties             AS party ON party.id                   = pc.party_id`);
            break;

        case "legislator":
            selectedColumns.push(`cand.name       AS candidateName`);
            selectedColumns.push(`cand.id         AS candidateId  `);
            selectedColumns.push(`party.id        AS partyId      `);
            selectedColumns.push(`party.name      AS partyName    `);
            joinedTables.push(`INNER JOIN legislator_constituencies  AS lc     ON p.vill_id                  = lc.vill_id 
                                    AND lc.year = ${year}`)
            joinedTables.push(`INNER JOIN legislator_candidates      AS pc     ON p.no                       = pc.no      
                                    AND lc.constituency = pc.constituency`);
            joinedTables.push(`INNER JOIN candidates                 AS cand   ON cand.id                    = pc.cand_id `);
            joinedTables.push(`INNER JOIN parties                    AS party  ON party.id                   = pc.party_id`);
            break;

        case "legislator_at_large":
            selectedColumns.push(`party.id        AS partyId      `);
            selectedColumns.push(`party.name      AS partyName    `);
            joinedTables.push(`INNER JOIN ${type}_candidates   AS pc    ON p.no     = pc.no      `);
            joinedTables.push(`INNER JOIN parties              AS party ON party.id = pc.party_id`);
            break;

        case "referendum":
            break;
        case "recall":
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
            // Table `legislator_constituency` must have be joined as lc
            areaWhereClause = `lc.constituency = ${area}`;
        }
        else {
            areaWhereClause = `FLOOR(p.vill_id / 10000) = ${area}`
        }
    }
    else {
        // This should be village ID
        areaWhereClause = `p.vill_id = ${area}`;
    }


    // Determine the where clause about param `year`
    // In normal election as well as recalls, this argument is same as what user gives
    // In referendum, this argument is undefined
    let yearWhereClause = `p.year = ${year} AND pc.year = ${year}`;
    if (type === 'referendum' || type === "recall") yearWhereClause = "TRUE";

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
        ${orderClause}
        ${limitClause}
    `;
    return sql;
}

function electTask(year, type, granule, area) {
    // In this case the election type should not be referendums, recalls or 
    // legislator at large
    if (type === "referendum") throw new Error(INVALID_REQUEST);
    if (type === "recall") throw new Error(INVALID_REQUEST);
    if (type === "legislator_at_large") throw new Error(INVALID_REQUEST);

    // In some cases calculating elected person and winner is same thing
    if (
        granule === "country" // must be president election
        || (granule === "county" && type === "local")
        || (granule === "constituency" && type === "legislator")
    ) {
        return winnerTask(year, type, granule, area, undefined);
    }

    // In this case we need to acquire the elect's no number first, hence a subquery
    // is needed. We can select a list of candidate ID who were elected then perform
    // INNER JOIN with a table which is calculated with all candidates.
    // We need to determine the largest granule (i.e. unit) that fits the election.
    let oGranule, oArea;
    switch (type) {
        case "president":
            oGranule = "country";
            oArea = 0;
            break;
        case "legislator":
            oGranule = "constituency";
            if (area < 100) oArea = area;
            else if (area < 1000000) oArea = Math.floor(area / 10000); // TODO
            else oArea = Math.floor(area / 1000000); // TODO
            break;
        case "local":
            oGranule = "county";
            if (area < 100) oArea = area;
            else if (area < 1000000) oArea = Math.floor(area / 10000);
            else oArea = Math.floor(area / 1000000);
            break;
        default:
            throw new Error(INVALID_REQUEST);
    }
    const electList = winnerTask(year, type, oGranule, oArea, undefined);
    const mainTable = generateSQL(year, type, granule, area, undefined, "all", true);
    return `
        SELECT r.* 
        FROM (${electList}) AS l 
        INNER JOIN (${mainTable}) AS r
            ON l.candidateId = r.candidateId
    `;
}

function winnerTask(year, type, granule, area, caze) {

    // In some cases there would be only one row in the
    // final data, which can be queried by ordering and
    // adding limit number
    if (
        granule === "country" // area must be 0
        || (granule === "county" && area > 0 & area < 100)
        || (granule === "district" && area >= 100 & area < 1000000)
        || (granule === "constituency" && area >= 100 && area < 1000000)
        || (granule === "village" && area >= 1000000)
    ) {
        return generateSQL(
            year,
            type,
            granule,
            area,
            caze,
            "all",
            true,
            "ORDER BY vote DESC",
            "LIMIT 1"
        );
    }


    // We first SELECT all required rows; then performs a subquery
    const innerQuery = generateSQL(
        year,
        type,
        granule,
        area,
        caze,
        "all",
        true,
        "ORDER BY vote DESC"
    );

    // Determine the GROUP BY policy; this depends on granule
    // The ORDER BY policy is always same as GROUP BY
    let groupByAndOrderByPolicy;
    switch (granule) {
        case "county":
            groupByAndOrderByPolicy = "countyId";
            break;
        case "constituency":
            groupByAndOrderByPolicy = "constituencyId";
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
        GROUP BY ${groupByAndOrderByPolicy}
        ORDER BY ${groupByAndOrderByPolicy}
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
        const rows = await query(sql);
        res.send(rows);
    } catch (e) {
        if (e === INVALID_REQUEST) res.sendStatus(400);
        else throw e;
        res.sendStatus(400);
    }
}