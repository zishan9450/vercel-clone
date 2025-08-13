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
exports.copyFinalDist = exports.downloadS3Folder = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Validate environment variables
function validateEnvVariables() {
    const required = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_BUCKET_NAME'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
// Initialize AWS S3 client
function initializeS3() {
    validateEnvVariables();
    return new aws_sdk_1.default.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });
}
const s3 = initializeS3();
function downloadS3Folder(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnvVariables();
        const outputPath = path_1.default.join(__dirname, 'output', prefix);
        fs_1.default.mkdirSync(outputPath, { recursive: true });
        console.log(`Downloading files to: ${outputPath}`);
        console.log(`Using bucket: ${process.env.AWS_BUCKET_NAME}`);
        try {
            // Try different prefix patterns with both forward and backslashes
            const possiblePrefixes = [
                `${prefix}/`,
                prefix,
                `output\\${prefix}`,
                `output\\${prefix}\\`,
                `${prefix}\\`,
                `output/${prefix}`,
                `output/${prefix}/`
            ];
            let objects;
            let usedPrefix;
            // Try each prefix until we find files
            for (const testPrefix of possiblePrefixes) {
                console.log(`Trying S3 prefix: ${testPrefix}`);
                objects = yield s3.listObjectsV2({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Prefix: testPrefix
                }).promise();
                if (objects.Contents && objects.Contents.length > 0) {
                    usedPrefix = testPrefix;
                    break;
                }
            }
            if (!(objects === null || objects === void 0 ? void 0 : objects.Contents) || objects.Contents.length === 0) {
                // List all objects to debug
                console.log('Listing all objects in bucket for debugging:');
                const allObjects = yield s3.listObjectsV2({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    MaxKeys: 10
                }).promise();
                if (allObjects.Contents) {
                    console.log('First 10 objects in bucket:', allObjects.Contents.map(o => o.Key));
                    // Try to find objects with our prefix using includes
                    const matchingObjects = allObjects.Contents.filter(o => o.Key && (o.Key.includes(prefix) ||
                        o.Key.includes(prefix.replace(/\\/g, '/')) ||
                        o.Key.includes(prefix.replace(/\//g, '\\'))));
                    if (matchingObjects.length > 0) {
                        console.log('Found matching objects:', matchingObjects.map(o => o.Key));
                    }
                }
                throw new Error(`No files found in S3 with any tried prefixes: ${possiblePrefixes.join(', ')}`);
            }
            console.log(`Found ${objects.Contents.length} files using prefix: ${usedPrefix}`);
            for (const object of objects.Contents) {
                if (!object.Key)
                    continue;
                // Get the relative path by removing the used prefix
                let filename = object.Key;
                if (usedPrefix) {
                    filename = filename.replace(usedPrefix, '');
                }
                filename = filename.replace(/^[\/\\]+/, ''); // Remove leading slashes/backslashes
                const filePath = path_1.default.join(outputPath, filename.replace(/\\/g, path_1.default.sep));
                // Skip empty files
                if (!filename)
                    continue;
                // Create nested directories if needed
                fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
                console.log(`Downloading: ${object.Key} to ${filePath}`);
                // Download file
                const s3Object = yield s3.getObject({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: object.Key
                }).promise();
                fs_1.default.writeFileSync(filePath, s3Object.Body);
                console.log(`Downloaded: ${filename}`);
            }
            // List downloaded files
            const files = getAllFiles(outputPath);
            console.log('Downloaded files:', files);
            return outputPath;
        }
        catch (error) {
            console.error('Error downloading from S3:', error);
            throw error;
        }
    });
}
exports.downloadS3Folder = downloadS3Folder;
function getAllFiles(folderPath) {
    if (!fs_1.default.existsSync(folderPath)) {
        console.error(`Folder not found: ${folderPath}`);
        return [];
    }
    const entries = fs_1.default.readdirSync(folderPath, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(folderPath, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(getAllFiles(fullPath));
        }
        else {
            files.push(fullPath);
        }
    }
    return files;
}
function copyFinalDist(id, buildResult) {
    return __awaiter(this, void 0, void 0, function* () {
        const { buildPath, isNextJs } = buildResult;
        console.log(`Copying ${isNextJs ? 'Next.js' : 'standard'} build output from ${buildPath}`);
        if (!fs_1.default.existsSync(buildPath)) {
            throw new Error(`Build output folder not found at: ${buildPath}`);
        }
        const files = getAllFiles(buildPath);
        console.log(`Found ${files.length} files to upload from build output`);
        for (const filePath of files) {
            // Get relative path from build directory
            const relativePath = path_1.default.relative(buildPath, filePath);
            // Create S3 key with _static prefix to distinguish from source files
            const s3Key = `${id}/_static/${relativePath.replace(/\\/g, '/')}`;
            console.log(`Uploading ${relativePath} to ${s3Key}`);
            yield uploadFile(filePath, s3Key);
        }
        return files.length;
    });
}
exports.copyFinalDist = copyFinalDist;
function getContentType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    };
    return contentTypes[ext] || 'application/octet-stream';
}
function uploadFile(filePath, s3Key) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileContent = fs_1.default.readFileSync(filePath);
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: getContentType(filePath)
        };
        try {
            const response = yield s3.upload(params).promise();
            console.log(`Successfully uploaded ${s3Key}`);
            return response;
        }
        catch (error) {
            console.error(`Error uploading ${s3Key}:`, error);
            throw error;
        }
    });
}
