import query from "../../lib/db";

export default async function (req, res) {

    if (isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020 || isNaN(req.query.countyId))
        return res.sendStatus(400);

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

    console.log(sql);
    const rows = await query(sql, args);
    
    // console.dir(rows);
    const ret = [];
    for (const row of rows) {
        ret.push({ district: row.name, id: row.id });
    }
    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}