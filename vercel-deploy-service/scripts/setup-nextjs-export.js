const fs = require('fs');
const path = require('path');

function setupNextjsForStaticExport(projectPath) {
    const nextConfigPath = path.join(projectPath, 'next.config.js');
    const nextConfigTsPath = path.join(projectPath, 'next.config.ts');
    
    // Check if it's a Next.js project
    const isNextJs = fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigTsPath);
    
    if (!isNextJs) {
        console.log('Not a Next.js project, skipping export setup');
        return false;
    }
    
    // Create static export configuration
    const staticExportConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Disable features that don't work with static export
  experimental: {
    appDir: false
  }
}

module.exports = nextConfig
`;
    
    // Backup existing config
    let backupPath = null;
    if (fs.existsSync(nextConfigPath)) {
        backupPath = nextConfigPath + '.backup';
        fs.copyFileSync(nextConfigPath, backupPath);
        console.log('Backed up existing next.config.js');
    } else if (fs.existsSync(nextConfigTsPath)) {
        backupPath = nextConfigTsPath + '.backup';
        fs.copyFileSync(nextConfigTsPath, backupPath);
        console.log('Backed up existing next.config.ts');
    }
    
    // Write static export config
    fs.writeFileSync(nextConfigPath, staticExportConfig);
    console.log('Created Next.js static export configuration');
    
    return true;
}

function restoreNextjsConfig(projectPath) {
    const nextConfigPath = path.join(projectPath, 'next.config.js');
    const nextConfigTsPath = path.join(projectPath, 'next.config.ts');
    const backupJsPath = nextConfigPath + '.backup';
    const backupTsPath = nextConfigTsPath + '.backup';
    
    try {
        if (fs.existsSync(backupJsPath)) {
            fs.copyFileSync(backupJsPath, nextConfigPath);
            fs.unlinkSync(backupJsPath);
            console.log('Restored original next.config.js');
        } else if (fs.existsSync(backupTsPath)) {
            fs.copyFileSync(backupTsPath, nextConfigTsPath);
            fs.unlinkSync(backupTsPath);
            console.log('Restored original next.config.ts');
        }
    } catch (error) {
        console.warn('Could not restore original Next.js config:', error.message);
    }
}

module.exports = { setupNextjsForStaticExport, restoreNextjsConfig };
