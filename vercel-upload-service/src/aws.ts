import { S3 } from "aws-sdk";
import fs from "fs";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME) {
    throw new Error('Missing required AWS environment variables');
}

const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// fileName => output/12312/src/App.jsx
// filePath => /Users/harkiratsingh/vercel/dist/output/12312/src/App.jsx
export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    
    const response = await s3.upload({
        Body: fileContent,
        Bucket: process.env.AWS_BUCKET_NAME!, // Using non-null assertion since we checked above
        Key: fileName,
    }).promise();
    
    console.log(response);
}