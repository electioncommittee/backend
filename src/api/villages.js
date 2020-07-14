import query from "../../lib/db";

async function queryVillagesByConstituencyId(year, cst, res) {

    let whereClause;
    if (cst == 0) whereClause = "( 1 = ? OR TRUE)";
    else if (cst < 100) whereClause = `FLOOR(cst.constituency / 100) = ?`
    else whereClause = `cst.constituency = ?`

    const sql = `
    SELECT 
        cst.vill_id AS id, 
        vill.name   AS village, 
        dist.name   AS district
    FROM legislator_constituencies AS cst
    INNER JOIN villages AS vill
        ON cst.vill_id = vill.id
    INNER JOIN districts as dist
        ON vill.dist = dist.id
    WHERE ${whereClause}
        AND year = ?
    ORDER BY id
    `
    const rows = await query(sql, [cst, year]);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}

export default async function (req, res) {

    let year = req.query.year;
    if (year > 2009 && year % 2 == 1) year--;

    if (req.query.constituencyId) {
        queryVillagesByConstituencyId(req.query.year, req.query.constituencyId, res);
        return;
    }

    const args = [year];
    const tableName = (year % 4 === 0) ? 'president_voters' : 'local_voters';

    const distRange = req.query.countyId * 100;
    let distWhereClause = 'TRUE';
    if (req.query.countyId != 0) distWhereClause = `villages.dist BETWEEN ${distRange} AND ${distRange + 99}`;
    if (req.query.districtId != 0) distWhereClause = `villages.dist = ${req.query.districtId}`;

    const sql = `
        SELECT villages.id, villages.name FROM villages, ${tableName} 
        WHERE year = ? 
            AND villages.id = ${tableName}.vill_id
            AND ${distWhereClause}
        ORDER BY villages.id
    `;

    const rows = await query(sql, args);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}