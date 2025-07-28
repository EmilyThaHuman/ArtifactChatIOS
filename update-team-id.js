#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get Team ID from command line argument
const teamId = process.argv[2];

if (!teamId) {
  console.log('❌ Please provide your Apple Team ID as an argument');
  console.log('📖 Usage: node update-team-id.js YOUR_TEAM_ID');
  console.log('🔍 Find your Team ID at: https://developer.apple.com/account/resources/identifiers/list');
  process.exit(1);
}

// Validate Team ID format (usually 10 alphanumeric characters)
if (!/^[A-Z0-9]{10}$/.test(teamId)) {
  console.log('⚠️  Warning: Team ID should be 10 alphanumeric characters (e.g., ABCDE12345)');
  console.log('🔄 Continuing anyway...');
}

const filesToUpdate = [
  // Mobile app AASA file
  './apple-app-site-association.json',
  
  // Web app AASA file
  '../ArtifactChat/public/.well-known/apple-app-site-association',
  
  // API server AASA file  
  '../ArtifactApi/public/.well-known/apple-app-site-association'
];

console.log(`🔄 Updating Team ID to: ${teamId}`);

let updatedFiles = 0;

filesToUpdate.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const updatedContent = content.replace(/TEAMID/g, teamId);
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`✅ Updated: ${filePath}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️  No changes needed: ${filePath}`);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Error updating ${filePath}:`, error.message);
  }
});

if (updatedFiles > 0) {
  console.log(`\n🎉 Successfully updated ${updatedFiles} file(s)!`);
  console.log('\n📋 Next steps:');
  console.log('1. Deploy your web app and API server');
  console.log('2. Test AASA file: https://artifact.chat/.well-known/apple-app-site-association');
  console.log('3. Rebuild your iOS app');
  console.log('4. Test Stripe payment flow');
} else {
  console.log('\n🤔 No files were updated. Team ID may already be set.');
} 