import query from "../../lib/db";

export default async function (req, res) {

    const array1 = ['president', 'legislator', 'legislator_at_large', 'local', 'recall'];

    if (!array1.includes(req.query.type)) {
        res.sendStatus(400);
        return
    }
    let table1, id1, q1, area = "";
    let table2 = 'candidates';
    switch (req.query.type) {
        case 'president':
            table1 = 'president_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            break;
        case 'legislator':
            table1 = 'legislator_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            area = 'and legislator_candidates.constituency=' + req.query.area;
            break;
        case 'legislator_at_large':
            table1 = 'legislator_at_large_candidates';
            id1 = 'and parties.id=' + table1 + '.party_id';
            q1 = 'parties.name';
            table2 = 'parties';
            break;
        case 'local':
            table1 = 'local_candidates';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            area = 'and local_candidates.city_id=' + req.query.area;
            break;
        case 'recall':
            table1 = 'recalls';
            id1 = 'and candidates.id=' + table1 + '.cand_id';
            q1 = 'candidates.name';
            break;
    }

    const sql = `
        SELECT ${q1} FROM ${table1}, ${table2}
        WHERE year = ? ${id1} ${area} 
        GROUP BY ${q1}`;

    const args = [req.query.year];

    const rows = await query(sql, args);

    const ret = [];
    const candList = [];
    for (const row of rows) {
        candList.push(row.name);
    }
    ret.push({ candidate: candList });

    if (candList.length === 0) res.sendStatus(404);
    else res.send(ret);
}