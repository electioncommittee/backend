import query from "../../lib/db";

async function recall(year, res) {
    const sql = `
        SELECT 
            DISTINCT(recalls.cand_id) AS id,
            candidates.name as name
        FROM recalls
        INNER JOIN candidates
            ON recalls.cand_id = candidates.id
        WHERE year = ?
    `;
    const rows = await query(sql, [year]);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}

export default async function (req, res) {

    const area = req.query.area;

    let candidateTableName = null,
        candidateOrPartyTableName = 'candidates',
        joinClause = null,
        areaWhereCluase = "TRUE";
    switch (req.query.type) {
        case 'president':
            // area must be 0
            candidateTableName = 'president_candidates';
            joinClause = `candidates.id = president_candidates.cand_id`;
            break;
        case 'legislator':
            // area must be 0, county ID or constituency ID
            candidateTableName = 'legislator_candidates';
            joinClause = `candidates.id = legislator_candidates.cand_id`;
            if (area == 0) { // country
                areaWhereCluase = "TRUE";
            }
            else if (area < 100) { // county 
                areaWhereCluase = `FLOOR(legislator_candidates.constituency / 100) = ${req.query.area}`;
            }
            else { // constituency
                areaWhereCluase = `legislator_candidates.constituency = ${req.query.area}`;
            }
            break;
        case 'legislator_at_large':
            // area must be 0
            candidateTableName = 'legislator_at_large_candidates';
            candidateOrPartyTableName = 'parties';
            joinClause = `parties.id = legislator_at_large_candidates.party_id`;
            break;
        case 'local':
            // area must be 0 or county ID
            candidateTableName = 'local_candidates';
            joinClause = `candidates.id = local_candidates.cand_id`;
            if (area != 0) areaWhereCluase = `local_candidates.city_id = ${req.query.area}`;
            break;
        case 'recall':
            // special case
            recall(req.query.year, res);
            return;
        default:
            res.sendStatus(400);
            return;
    }

    const sql = `
        SELECT 
            ${candidateOrPartyTableName}.name AS name, 
            ${candidateOrPartyTableName}.id AS id,
            ${candidateTableName}.no AS no
        FROM 
            ${candidateTableName}, 
            ${candidateOrPartyTableName}
        WHERE year = ? 
            AND ${joinClause} 
            AND ${areaWhereCluase} 
        ORDER BY no
    `;
    const args = [req.query.year];
    const rows = await query(sql, args);
    if (rows.length === 0) res.sendStatus(404);
    else res.send(rows);
}

async function validateNameNotDuplcate(id, name) {
    const sql = `
        SELECT * FROM candidates
        WHERE name = ? AND id != ?
        LIMIT 1
    `
    const rows = await query(sql, [name, id]);
    return rows.length === 0;
}

export async function updateCandidate(req, res) {
    const id = req.body.id;
    let name = req.body.name;
    name = name.trim();

    if (!id || !name) {
        res.sendStatus(400);
        return;
    }
    if (name.length > 30) {
        res.status(400).send("這名字不好");
        return;
    }

    const flag = await validateNameNotDuplcate(id, name);
    if (!flag) {
        res.status(409).send("重複了歐，換一個");
        return;
    }

    const sql = `
        UPDATE candidates
        SET
            name = ?
        WHERE
            id = ?
    `
    const result = await query(sql, [name, id]);
    if (result.changedRows === 0) {
        res.sendStatus(404);
        return;
    }
    res.send('好歐');
}

export async function findLike(req, res) {
    const pat = req.query.pattern;
    if (pat.length === 0 || pat.length > 30) {
        res.sendStatus(400);
        return;
    }

    const sql = `
        SELECT * FROM candidates
        WHERE name LIKE ?
    `
    const rows = await query(sql, [pat]);
    res.send(rows);
}