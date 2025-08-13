
import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import { generate } from "./utils";
import { getAllFiles } from "./files";
import path from "path";
import { uploadFile } from "./aws";
import { createClient } from "redis";
const publisher = createClient();
publisher.connect();

const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors())
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate(); // asd12
    await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

    const files = getAllFiles(path.join(__dirname, `output/${id}`));

    files.forEach(async file => {
        // Create proper S3 key: remove the full path up to output/{id} and keep relative path
        const relativePath = path.relative(path.join(__dirname, `output/${id}`), file);
        const s3Key = `${id}/${relativePath.replace(/\\/g, '/')}`;
        console.log(`Uploading ${file} to S3 key: ${s3Key}`);
        await uploadFile(s3Key, file);
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))
    publisher.lPush("build-queue", id);
    // INSERT => SQL
    // .create => 
    publisher.hSet("status", id, "queued");

    res.json({
        id: id
    })

});

app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    })
})

app.listen(3000);