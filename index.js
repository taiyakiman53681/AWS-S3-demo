const path = require("path");
const express = require("express");
const fileUpload = require("express-fileupload");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const app = express();
app.use(fileUpload());

// public 配下を静的配信（絶対パス）
app.use(express.static(path.join(__dirname, "public")));

// 簡易ログ
app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucket = process.env.S3_BUCKET;

app.get("/health", (_req, res) => res.send("ok"));

app.post("/upload", async (req, res) => {
  try {
    const file = req.files?.image;
    if (!file) return res.status(400).send("image file required");

    const key = `uploads/${Date.now()}_${file.name}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.data,
      ContentType: file.mimetype,
    }));

    const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.send(`✅ Uploaded! ${url}`);
  } catch (e) {
    console.error(e);
    res.status(500).send(`upload failed: ${e.message}`);
  }
});

// 最後の保険：存在しないパスは明示404
app.use((_req, res) => res.status(404).send("Not found"));
app.listen(3000, '127.0.0.1',() => console.log("http://127.0.0.1:3000"));
