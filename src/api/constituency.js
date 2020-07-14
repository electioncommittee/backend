import query from "../../lib/db";

export default async function (req, res) {

    const whereCluase =
        req.query.countyId == 0 ? "TRUE" : `FLOOR(constituency / 100) = ${req.query.countyId}`
    const sql = `
        SELECT DISTINCT(constituency) 
        FROM legislator_constituencies
        WHERE ${whereCluase} AND year = ?
        ORDER BY constituency
        `
    const rows = await query(sql, [req.query.year]);
    if (rows.length === 0) res.sendStatus(400);
    else res.send(rows);
}