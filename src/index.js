import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    console.log(req.query);
    res.send();
});

app.post("/", (req, res) => {
    console.log(req.body);
    res.sendStatus(301);
});

const port = process.env.NODE_ENV === "production" ? 3000 : 3001;
app.listen(port, function () {
    console.log(`Server running on port ${port}`);
});

import county from "./api/county";
app.get("/get-county", county);

import cand from "./api/candidates";
app.get("/get-candidates", cand);

import dist from "./api/district";
app.get("/get-districts", dist);

import village from "./api/villages";
app.get("/get-villages", village);

import poll from "./api/polls";
app.get("/get-polls", poll);