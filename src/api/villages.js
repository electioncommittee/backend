import query from "../../lib/db";

export default async function (req, res) {

    if (isNaN(req.query.year) ||
        req.query.year < 2009 ||
        req.query.year > 2020 ||
        isNaN(req.query.countyId) ||
        isNaN(req.query.districtId)
    ) return res.sendStatus(400);

    let y = req.query.year;
    if (y > 2009 && y % 2 == 1) y--;
    const args = [y];
    const tableName = (y % 4 === 0) ? 'president_voters' : 'local_voters';

    let distWhereCluase = '';
    const distRange = req.query.countyId * 100;
    if(req.query.countyId != 0)distWhereCluase = `and villages.dist BETWEEN ${distRange} and ${distRange+99}`;
    if(req.query.districtId != 0)distWhereCluase = `and villages.dist = ${req.query.districtId}`;
  
    const sql = `SELECT villages.id, villages.name FROM villages, ${tableName} 
    WHERE year= ? and villages.id = ${tableName}.vill_id ${distWhereCluase}`;

    const rows = await query(sql, args);

    const ret = [];
    for (const row of rows) {
        ret.push({ village: row.name, id: row.id });
    }

    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}