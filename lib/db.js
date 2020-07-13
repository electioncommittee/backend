import mariadb from "mariadb";
import dotenv from "dotenv";
dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASS
});

export default async function query(sql, args = []) {
    if (process.env.NODE_ENV === "development") {
        console.debug(sql);
        console.debug(args);
    }
    const data = await pool.query(sql, args);
    return data;
}