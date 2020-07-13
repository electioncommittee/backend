import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import county from "./api/county";
import cand from "./api/candidates";
import dist from "./api/district";
import village from "./api/villages";
import poll from "./api/polls";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.NODE_ENV === "production" ? 3000 : 3001;
app.listen(port, function () {
    console.log(`Server running on port ${port}`);
});


app.get("/api/get-county", county);
app.get("/api/get-candidates", cand);
app.get("/api/get-districts", dist);
app.get("/api/get-villages", village);
app.get("/api/get-polls", poll);