import express, { Request, Response, NextFunction } from "express";
import { S3 } from "aws-sdk";
import path from "path";
import dotenv from "dotenv";

// Create a custom interface for the request
interface CustomRequest extends Request {
    deployId?: string;
}

dotenv.config();

const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const app = express();

// Middleware to parse the subdomain and path
app.use((req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const host = req.hostname;
        req.deployId = host.split(".")[0];
        next();
    } catch (error) {
        console.error('Error parsing hostname:', error);
        res.status(400).send('Invalid hostname');
    }
});

// Serve static files using express.static middleware
app.use(express.static(path.join(__dirname, 'public')));

// Handle all paths with a single route handler
app.use(async (req: CustomRequest, res: Response) => {
    try {
        // Remove leading slash and normalize path
        const filePath = req.path.replace(/^\/+/, '') || 'index.html';
        await serveFile(req, res, filePath);
    } catch (error: any) {
        handleError(error, res);
    }
});

// Helper function to serve files from S3
async function serveFile(req: CustomRequest, res: Response, filePath: string) {
    const deployId = req.deployId;
    if (!deployId) {
        throw new Error('No deployment ID found');
    }

    const s3Key = `${deployId}/_static/${filePath}`;
    console.log(`Fetching from S3: ${s3Key}`);

    try {
        const contents = await s3.getObject({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: s3Key
        }).promise();

        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'font/eot'
        }[ext] || 'application/octet-stream';

        res.set('Content-Type', contentType);
        res.send(contents.Body);
    } catch (error: any) {
        throw error;
    }
}

// Helper function to handle errors
function handleError(error: any, res: Response) {
    console.error('Error serving file:', error);
    if (error.code === 'NoSuchKey') {
        res.status(404).send('File not found');
    } else if (error.message === 'No deployment ID found') {
        res.status(400).send('Invalid deployment ID');
    } else {
        res.status(500).send('Internal Server Error');
    }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Request handler running on port ${PORT}`);
    console.log(`Add this to your hosts file to test locally:`);
    console.log(`127.0.0.1 <deployment-id>.localhost`);
});