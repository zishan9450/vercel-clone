"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aws_sdk_1 = require("aws-sdk");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const s3 = new aws_sdk_1.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const app = (0, express_1.default)();
// Middleware to parse the subdomain and path
app.use((req, res, next) => {
    try {
        const host = req.hostname;
        req.deployId = host.split(".")[0];
        next();
    }
    catch (error) {
        console.error('Error parsing hostname:', error);
        res.status(400).send('Invalid hostname');
    }
});
// Serve static files using express.static middleware
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Handle all paths with a single route handler
app.use((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Remove leading slash and normalize path
        const filePath = req.path.replace(/^\/+/, '') || 'index.html';
        yield serveFile(req, res, filePath);
    }
    catch (error) {
        handleError(error, res);
    }
}));
// Helper function to serve files from S3
function serveFile(req, res, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployId = req.deployId;
        if (!deployId) {
            throw new Error('No deployment ID found');
        }
        const s3Key = `${deployId}/_static/${filePath}`;
        console.log(`Fetching from S3: ${s3Key}`);
        try {
            const contents = yield s3.getObject({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key
            }).promise();
            const ext = path_1.default.extname(filePath).toLowerCase();
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
        }
        catch (error) {
            throw error;
        }
    });
}
// Helper function to handle errors
function handleError(error, res) {
    console.error('Error serving file:', error);
    if (error.code === 'NoSuchKey') {
        res.status(404).send('File not found');
    }
    else if (error.message === 'No deployment ID found') {
        res.status(400).send('Invalid deployment ID');
    }
    else {
        res.status(500).send('Internal Server Error');
    }
}
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Request handler running on port ${PORT}`);
    console.log(`Add this to your hosts file to test locally:`);
    console.log(`127.0.0.1 <deployment-id>.localhost`);
});
