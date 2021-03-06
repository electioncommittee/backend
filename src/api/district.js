import query from "../../lib/db";

export default async function (req, res) {

    let y = req.query.year;
    if (y > 2009 && y % 2 == 1) y--;
    const args = [y, y];

    const tableName = (y % 4 === 0) ? 'president_voters' : 'local_voters';
    const cityWhereCluase = (req.query.countyId != 0) ? `districts.city = ${req.query.countyId}` : "TRUE";
    const sql = `
    SELECT districts.id, districts.name FROM districts, (
        SELECT SUBSTRING(vill_id, 1, 3) AS id FROM ${tableName}
        WHERE ${tableName}.year = ?
        GROUP BY id) AS t1, (
        SELECT SUBSTRING(vill_id, 1, 4) AS id FROM ${tableName}
        WHERE ${tableName}.year = ? 
        GROUP BY id) as t2 
    WHERE (districts.id = t1.id OR districts.id = t2.id)
        AND ${cityWhereCluase} 
    GROUP BY districts.id
    `;

    const rows = await query(sql, args);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}