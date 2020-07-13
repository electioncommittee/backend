import query from "../../lib/db";

export default async function (req, res) {

    if (req.query.year < 2009 || req.query.year > 2020) {
        res.sendStatus(400);
        return;
    }

    let year = req.query.year;
    if (year > 2009 && year % 2 == 1) year--;
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