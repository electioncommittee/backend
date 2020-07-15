import query from "../../lib/db";

async function validateNameNotDuplicate(id, name, tableName) {
    const sql = `
        SELECT * FROM ${tableName}
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

    const flag = await validateNameNotDuplicate(id, name, "candidates");
    if (!flag) {
        res.status(409).send("重複了歐，換一個");
        return;
    }

    const sql = `
        UPDATE candidates
        SET name = ?
        WHERE id = ?
    `
    const result = await query(sql, [name, id]);
    if (result.changedRows === 0) {
        res.sendStatus(404);
        return;
    }
    res.send('好歐');
}

export async function findCandidates(req, res) {
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

export async function updateParty(req, res) {
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

    const flag = await validateNameNotDuplicate(id, name, "parties");
    if (!flag) {
        res.status(409).send("重複了歐，換一個");
        return;
    }

    const sql = `
        UPDATE parties
        SET name = ?
        WHERE id = ? AND id != -1
    `
    const result = await query(sql, [name, id]);
    if (result.changedRows === 0) {
        res.sendStatus(404);
        return;
    }
    res.send('好歐');
}

export async function findParties(req, res) {
    const pat = req.query.pattern;
    if (pat.length === 0 || pat.length > 30) {
        res.sendStatus(400);
        return;
    }

    const sql = `
        SELECT * FROM parties
        WHERE name LIKE ?
    `
    const rows = await query(sql, [pat]);
    res.send(rows);
}