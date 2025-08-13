import 'dotenv/config';
import { createClient} from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject, BuildResult } from "./utils";

const subscriber = createClient();
subscriber.connect();

const publisher = createClient();
publisher.connect();

// Add environment validation at startup
function validateEnvironment() {
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

async function main() {
    validateEnvironment();
    while(1) {
        try {
            const res = await subscriber.brPop(
                'build-queue',
                0
            );
            // @ts-ignore
            const id = res.element
            
            try {
                console.log(`Starting deployment for ${id}...`);
                await publisher.hSet("status", id, "building");
                await downloadS3Folder(id);
                console.log("Building project...");
                const buildResult = await buildProject(id) as BuildResult;
                console.log("Copying build output...");
                await publisher.hSet("status", id, "deploying");
                await copyFinalDist(id, buildResult);
                await publisher.hSet("status", id, "deployed");
                console.log(`Deployment successful for ${id}`);
            } catch (err) {
                console.error("Deployment failed:", err);
                await publisher.hSet("status", id, "failed");
                // Continue the loop instead of throwing
                continue;
            }
        } catch (err) {
            console.error("Redis error:", err);
            // Wait a bit before retrying on redis errors
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

main().catch(console.error);