import query from "../../lib/db";

const MUNICIPALITY = ["台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市"]

export default async function (req, res) {

    const sql = `SELECT name, id FROM cities ORDER BY id`;
    const rows = await query(sql);
    const ret = rows.filter(row => {
        if (row.id == 4 && req.query.year < 2014) return false;
        if (row.id == 5 && req.query.year > 2013) return false;
        if (req.query.year == 2009) return !MUNICIPALITY.includes(row.name)
        if (req.query.year == 2010) return MUNICIPALITY.includes(row.name)
        return true;
    });
    if (ret.length === 0) res.sendStatus(404);
    else res.send(ret);
}