import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import county from "./api/county";
import cand from "./api/candidates";
import dist from "./api/district";
import village from "./api/villages";
import constituency from "./api/constituency";
import poll from "./api/polls";
import * as Editor from "./api/editor";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
if (process.env.NODE_ENV === "development") {
    app.use((req, res, next) => {
        if (req.method === "GET") console.debug(req.query);
        else if (req.method === "POST") console.debug(req.body);
        next();
    })
}


const port = process.env.PORT;
app.listen(port, function () {
    console.log(`Server running on port ${port}`);
});


app.get("/api/get-counties", county);
app.get("/api/get-candidates", cand);
app.get("/api/get-districts", dist);
app.get("/api/get-villages", village);
app.get("/api/get-constituencies", constituency);
app.get("/api/get-polls", poll);
app.post("/api/update-candidate", Editor.updateCandidate);
app.get("/api/find-candidates", Editor.findCandidates);
app.post("/api/update-party", Editor.updateParty);
app.get("/api/find-parties", Editor.findParties);