// filepath: /workspaces/Styles/script.js
async function moveFilesWithRente() {
  console.log('Skript gestartet');
  // ...existing code...
}
const fs = require('fs').promises;
const path = require('path');

async function moveFilesWithRente() {
  const sourceDir = '/Users/snoopy/Dokumente';
  const targetDir = '/Volumes/FRITZ.NAS/ChrisDokumente/Rente';

  try {
    const files = await fs.readdir(sourceDir);
    for (const file of files) {
      if (file.includes('Rente')) {
        const sourceFile = path.join(sourceDir, file);
        const targetFile = path.join(targetDir, file);
        try {
          await fs.rename(sourceFile, targetFile);
          console.log(`Datei verschoben: ${file}`);
        } catch (err) {
          if (err.code === 'EXDEV') {
            await moveAcrossDevices(sourceFile, targetFile);
          } else {
            console.error(`Fehler beim Verschieben von ${file}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('Fehler beim Lesen des Quellordners:', err);
  }
}

// Helper function for cross-device moves
async function moveAcrossDevices(source, target) {
  try {
    // Copy the file
    await fs.copyFile(source, target);

    // Delete the original
    await fs.unlink(source);

    console.log('File moved across devices successfully');
  } catch (err) {
    // Clean up if something went wrong
    try { await fs.unlink(target); } catch (e) {}
    throw err;
  }
}

// Usage
moveFilesWithRente();