import query from "../../lib/db";

export default async function (req, res) {

    if (req.query.year < 2009 || req.query.year > 2020) {
        res.sendStatus(400);
        return;
    }
    const sql = `SELECT * FROM cities ORDER BY id`;
    const rows = await query(sql);

    const ret = [];
    for (const row of rows) {
        if (row.id == 4 && req.query.year < 2014) continue;
        if (row.id == 5 && req.query.year > 2013) continue;
        ret.push({ name: row.name, id: row.id });
    }

    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}