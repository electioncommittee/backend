import query from "../../lib/db";

export default async function (req, res) {

    if (req.query.year < 2009 || req.query.year > 2020) {
        res.sendStatus(400);
        return;
    }
    const sql = `SELECT name, id FROM cities ORDER BY id`;
    const rows = await query(sql);
    const ret = rows.filter(row => {
        if (row.id == 4 && req.query.year < 2014) return false;
        if (row.id == 5 && req.query.year > 2013) return false;
        return true;
    });
    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}