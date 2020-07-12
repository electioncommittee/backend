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


const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log(`Server running on port ${port}`);
});

