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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const redis_1 = require("redis");
const aws_1 = require("./aws");
const utils_1 = require("./utils");
const subscriber = (0, redis_1.createClient)();
subscriber.connect();
const publisher = (0, redis_1.createClient)();
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        validateEnvironment();
        while (1) {
            try {
                const res = yield subscriber.brPop('build-queue', 0);
                // @ts-ignore
                const id = res.element;
                try {
                    console.log(`Starting deployment for ${id}...`);
                    yield publisher.hSet("status", id, "building");
                    yield (0, aws_1.downloadS3Folder)(id);
                    console.log("Building project...");
                    const buildResult = yield (0, utils_1.buildProject)(id);
                    console.log("Copying build output...");
                    yield publisher.hSet("status", id, "deploying");
                    yield (0, aws_1.copyFinalDist)(id, buildResult);
                    yield publisher.hSet("status", id, "deployed");
                    console.log(`Deployment successful for ${id}`);
                }
                catch (err) {
                    console.error("Deployment failed:", err);
                    yield publisher.hSet("status", id, "failed");
                    // Continue the loop instead of throwing
                    continue;
                }
            }
            catch (err) {
                console.error("Redis error:", err);
                // Wait a bit before retrying on redis errors
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    });
}
main().catch(console.error);
