import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { BuildResult } from './utils';

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
    
    return new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });
}

const s3 = initializeS3();

export async function downloadS3Folder(prefix: string) {
    validateEnvVariables();
    
    const outputPath = path.join(__dirname, 'output', prefix);
    fs.mkdirSync(outputPath, { recursive: true });

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
            objects = await s3.listObjectsV2({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Prefix: testPrefix
            }).promise();

            if (objects.Contents && objects.Contents.length > 0) {
                usedPrefix = testPrefix;
                break;
            }
        }

        if (!objects?.Contents || objects.Contents.length === 0) {
            // List all objects to debug
            console.log('Listing all objects in bucket for debugging:');
            const allObjects = await s3.listObjectsV2({
                Bucket: process.env.AWS_BUCKET_NAME!,
                MaxKeys: 10
            }).promise();
            
            if (allObjects.Contents) {
                console.log('First 10 objects in bucket:', 
                    allObjects.Contents.map(o => o.Key));
                
                // Try to find objects with our prefix using includes
                const matchingObjects = allObjects.Contents.filter(o => 
                    o.Key && (
                        o.Key.includes(prefix) || 
                        o.Key.includes(prefix.replace(/\\/g, '/')) ||
                        o.Key.includes(prefix.replace(/\//g, '\\'))
                    )
                );
                
                if (matchingObjects.length > 0) {
                    console.log('Found matching objects:', 
                        matchingObjects.map(o => o.Key));
                }
            }
                
            throw new Error(`No files found in S3 with any tried prefixes: ${possiblePrefixes.join(', ')}`);
        }

        console.log(`Found ${objects.Contents.length} files using prefix: ${usedPrefix}`);

        for (const object of objects.Contents) {
            if (!object.Key) continue;

            // Get the relative path by removing the used prefix
            let filename = object.Key;
            if (usedPrefix) {
                filename = filename.replace(usedPrefix, '');
            }
            filename = filename.replace(/^[\/\\]+/, ''); // Remove leading slashes/backslashes

            const filePath = path.join(outputPath, filename.replace(/\\/g, path.sep));

            // Skip empty files
            if (!filename) continue;

            // Create nested directories if needed
            fs.mkdirSync(path.dirname(filePath), { recursive: true });

            console.log(`Downloading: ${object.Key} to ${filePath}`);

            // Download file
            const s3Object = await s3.getObject({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Key: object.Key
            }).promise();

            fs.writeFileSync(filePath, s3Object.Body as Buffer);
            console.log(`Downloaded: ${filename}`);
        }

        // List downloaded files
        const files = getAllFiles(outputPath);
        console.log('Downloaded files:', files);

        return outputPath;
    } catch (error) {
        console.error('Error downloading from S3:', error);
        throw error;
    }
}

function getAllFiles(folderPath: string): string[] {
    if (!fs.existsSync(folderPath)) {
        console.error(`Folder not found: ${folderPath}`);
        return [];
    }

    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    
    let files: string[] = [];
    
    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

export async function copyFinalDist(id: string, buildResult: BuildResult) {
    const { buildPath, isNextJs } = buildResult;
    console.log(`Copying ${isNextJs ? 'Next.js' : 'standard'} build output from ${buildPath}`);

    if (!fs.existsSync(buildPath)) {
        throw new Error(`Build output folder not found at: ${buildPath}`);
    }

    const files = getAllFiles(buildPath);
    console.log(`Found ${files.length} files to upload from build output`);

    for (const filePath of files) {
        // Get relative path from build directory
        const relativePath = path.relative(buildPath, filePath);
        // Create S3 key with _static prefix to distinguish from source files
        const s3Key = `${id}/_static/${relativePath.replace(/\\/g, '/')}`;

        console.log(`Uploading ${relativePath} to ${s3Key}`);
        await uploadFile(filePath, s3Key);
    }

    return files.length;
}

function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
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

async function uploadFile(filePath: string, s3Key: string) {
    const fileContent = fs.readFileSync(filePath);
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: s3Key,
        Body: fileContent,
        ContentType: getContentType(filePath)
    };

    try {
        const response = await s3.upload(params).promise();
        console.log(`Successfully uploaded ${s3Key}`);
        return response;
    } catch (error) {
        console.error(`Error uploading ${s3Key}:`, error);
        throw error;
    }
}