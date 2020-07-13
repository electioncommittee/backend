import query from "../../lib/db";

export default async function (req, res) {
    
    const sql = `SELECT * FROM cities`;

    if(isNaN(req.query.year) || req.query.year < 2009 || req.query.year > 2020)return res.sendStatus(400);
    
    const args =[];
    const rows = await query(sql, args);

    const ret = [];
    for (const row of rows) {
        if(row.id == 4 && req.query.year<2014)continue;
        if(row.id == 5 && req.query.year>2013)continue;
        ret.push({ city: row.name, id: row.id });
    }
    
    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}