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
exports.buildProject = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const buildProject = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        var _a, _b, _c;
        // Use path.resolve to ensure consistent path format
        const projectPath = path_1.default.resolve(__dirname, 'output', id);
        console.log(`Project path: ${projectPath}`);
        if (!fs_1.default.existsSync(projectPath)) {
            reject(new Error(`Project directory not found: ${projectPath}`));
            return;
        }
        // List all files in project directory
        const files = fs_1.default.readdirSync(projectPath);
        console.log('Project directory contents:', files);
        const packageJsonPath = path_1.default.join(projectPath, 'package.json');
        console.log(`Looking for package.json at: ${packageJsonPath}`);
        if (!fs_1.default.existsSync(packageJsonPath)) {
            reject(new Error(`package.json not found at ${packageJsonPath}`));
            return;
        }
        // Check if this is a Next.js project first
        const nextConfigPath = path_1.default.join(projectPath, 'next.config.js');
        const nextConfigTsPath = path_1.default.join(projectPath, 'next.config.ts');
        const isNextJs = fs_1.default.existsSync(nextConfigPath) || fs_1.default.existsSync(nextConfigTsPath);
        // Read package.json to check for build script
        const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
        const buildCommand = ((_a = packageJson.scripts) === null || _a === void 0 ? void 0 : _a.build) ? 'npm run build' :
            ((_b = packageJson.scripts) === null || _b === void 0 ? void 0 : _b['build:prod']) ? 'npm run build:prod' :
                'npm run dev';
        // Create a clean environment for the build
        const env = Object.assign(Object.assign({}, process.env), { 
            // Force forward slashes in paths
            PATH: (_c = process.env.PATH) === null || _c === void 0 ? void 0 : _c.replace(/\\/g, '/'), 
            // Add any necessary Next.js specific env vars
            NEXT_TELEMETRY_DISABLED: '1' });
        // Use posix-style paths in npm commands
        const cdCommand = `cd "${projectPath.replace(/\\/g, '/')}"`;
        // For Next.js projects, create a temporary next.config.js to enable static export
        if (isNextJs) {
            const nextConfigContent = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
`;
            const tempConfigPath = path_1.default.join(projectPath, 'next.config.js.temp');
            fs_1.default.writeFileSync(tempConfigPath, nextConfigContent);
            console.log('Created temporary Next.js config for static export');
        }
        // Run npm install first with the clean environment
        console.log('Installing dependencies...');
        (0, child_process_1.exec)(`${cdCommand} && npm install`, { env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`npm install error: ${error}`);
                reject(error);
                return;
            }
            // For Next.js, temporarily replace the config file
            let configBackup = null;
            if (isNextJs) {
                const originalConfigPath = path_1.default.join(projectPath, 'next.config.js');
                const originalConfigTsPath = path_1.default.join(projectPath, 'next.config.ts');
                const tempConfigPath = path_1.default.join(projectPath, 'next.config.js.temp');
                // Backup existing config if it exists
                if (fs_1.default.existsSync(originalConfigPath)) {
                    configBackup = { path: originalConfigPath, content: fs_1.default.readFileSync(originalConfigPath, 'utf-8') };
                    fs_1.default.unlinkSync(originalConfigPath);
                }
                else if (fs_1.default.existsSync(originalConfigTsPath)) {
                    configBackup = { path: originalConfigTsPath, content: fs_1.default.readFileSync(originalConfigTsPath, 'utf-8') };
                    fs_1.default.unlinkSync(originalConfigTsPath);
                }
                // Move temp config to actual config
                fs_1.default.renameSync(tempConfigPath, originalConfigPath);
                console.log('Applied static export configuration');
            }
            console.log('Running build command:', buildCommand);
            // Then run build command with the same environment
            (0, child_process_1.exec)(`${cdCommand} && ${buildCommand}`, { env }, (error, stdout, stderr) => {
                // Restore original config after build
                if (isNextJs && configBackup) {
                    try {
                        const currentConfigPath = path_1.default.join(projectPath, 'next.config.js');
                        if (fs_1.default.existsSync(currentConfigPath)) {
                            fs_1.default.unlinkSync(currentConfigPath);
                        }
                        fs_1.default.writeFileSync(configBackup.path, configBackup.content);
                        console.log('Restored original Next.js configuration');
                    }
                    catch (restoreError) {
                        console.warn('Could not restore original config:', restoreError);
                    }
                }
                if (error) {
                    console.error(`Build error: ${error}`);
                    if (stderr)
                        console.error(`Build stderr: ${stderr}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.log(`Build stderr: ${stderr}`);
                }
                console.log(`Build stdout: ${stdout}`);
                // Determine output directory
                let outputDir;
                let outputPath;
                if (isNextJs) {
                    // For Next.js with static export, check for 'out' directory first
                    const nextOutPath = path_1.default.join(projectPath, 'out');
                    if (fs_1.default.existsSync(nextOutPath)) {
                        outputDir = 'out';
                        outputPath = nextOutPath;
                    }
                    else {
                        // Fallback to .next directory
                        outputDir = '.next';
                        outputPath = path_1.default.join(projectPath, '.next');
                    }
                }
                else {
                    outputDir = 'dist';
                    outputPath = path_1.default.join(projectPath, 'dist');
                }
                console.log(`Checking for build output in ${outputPath}`);
                if (!fs_1.default.existsSync(outputPath)) {
                    reject(new Error(`Build completed but ${outputDir} directory not found`));
                    return;
                }
                // Set build info for later use
                resolve({
                    buildPath: outputPath,
                    isNextJs
                });
            });
        });
    });
});
exports.buildProject = buildProject;
