import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const buildProject = async (id: string) => {
    return new Promise((resolve, reject) => {
        // Use path.resolve to ensure consistent path format
        const projectPath = path.resolve(__dirname, 'output', id);
        console.log(`Project path: ${projectPath}`);
        
        if (!fs.existsSync(projectPath)) {
            reject(new Error(`Project directory not found: ${projectPath}`));
            return;
        }

        // List all files in project directory
        const files = fs.readdirSync(projectPath);
        console.log('Project directory contents:', files);

        const packageJsonPath = path.join(projectPath, 'package.json');
        console.log(`Looking for package.json at: ${packageJsonPath}`);

        if (!fs.existsSync(packageJsonPath)) {
            reject(new Error(`package.json not found at ${packageJsonPath}`));
            return;
        }

        // Check if this is a Next.js project first
        const nextConfigPath = path.join(projectPath, 'next.config.js');
        const nextConfigTsPath = path.join(projectPath, 'next.config.ts');
        const isNextJs = fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigTsPath);

        // Read package.json to check for build script
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const buildCommand = packageJson.scripts?.build ? 'npm run build' : 
                           packageJson.scripts?.['build:prod'] ? 'npm run build:prod' :
                           'npm run dev';

        // Create a clean environment for the build
        const env = {
            ...process.env,
            // Force forward slashes in paths
            PATH: process.env.PATH?.replace(/\\/g, '/'),
            // Add any necessary Next.js specific env vars
            NEXT_TELEMETRY_DISABLED: '1'
        };

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
            const tempConfigPath = path.join(projectPath, 'next.config.js.temp');
            fs.writeFileSync(tempConfigPath, nextConfigContent);
            console.log('Created temporary Next.js config for static export');
        }

        // Run npm install first with the clean environment
        console.log('Installing dependencies...');
        exec(`${cdCommand} && npm install`, { env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`npm install error: ${error}`);
                reject(error);
                return;
            }

            // For Next.js, temporarily replace the config file
            let configBackup = null;
            if (isNextJs) {
                const originalConfigPath = path.join(projectPath, 'next.config.js');
                const originalConfigTsPath = path.join(projectPath, 'next.config.ts');
                const tempConfigPath = path.join(projectPath, 'next.config.js.temp');
                
                // Backup existing config if it exists
                if (fs.existsSync(originalConfigPath)) {
                    configBackup = { path: originalConfigPath, content: fs.readFileSync(originalConfigPath, 'utf-8') };
                    fs.unlinkSync(originalConfigPath);
                } else if (fs.existsSync(originalConfigTsPath)) {
                    configBackup = { path: originalConfigTsPath, content: fs.readFileSync(originalConfigTsPath, 'utf-8') };
                    fs.unlinkSync(originalConfigTsPath);
                }
                
                // Move temp config to actual config
                fs.renameSync(tempConfigPath, originalConfigPath);
                console.log('Applied static export configuration');
            }

            console.log('Running build command:', buildCommand);
            // Then run build command with the same environment
            exec(`${cdCommand} && ${buildCommand}`, { env }, (error, stdout, stderr) => {
                // Restore original config after build
                if (isNextJs && configBackup) {
                    try {
                        const currentConfigPath = path.join(projectPath, 'next.config.js');
                        if (fs.existsSync(currentConfigPath)) {
                            fs.unlinkSync(currentConfigPath);
                        }
                        fs.writeFileSync(configBackup.path, configBackup.content);
                        console.log('Restored original Next.js configuration');
                    } catch (restoreError) {
                        console.warn('Could not restore original config:', restoreError);
                    }
                }
                if (error) {
                    console.error(`Build error: ${error}`);
                    if (stderr) console.error(`Build stderr: ${stderr}`);
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
                    const nextOutPath = path.join(projectPath, 'out');
                    if (fs.existsSync(nextOutPath)) {
                        outputDir = 'out';
                        outputPath = nextOutPath;
                    } else {
                        // Fallback to .next directory
                        outputDir = '.next';
                        outputPath = path.join(projectPath, '.next');
                    }
                } else {
                    outputDir = 'dist';
                    outputPath = path.join(projectPath, 'dist');
                }
                
                console.log(`Checking for build output in ${outputPath}`);

                if (!fs.existsSync(outputPath)) {
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
};

// Add this type for build result
export interface BuildResult {
    buildPath: string;
    isNextJs: boolean;
}