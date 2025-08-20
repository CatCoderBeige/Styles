const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

async function extractPdfInfo(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    // Titel aus Metadaten oder erste Zeile aus Text
    let title = data.info && data.info.Title ? data.info.Title : null;
    if (!title && data.text) {
      title = data.text.split('\n').find(line => line.trim().length > 0) || 'Unbekannt';
    }
    title = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);

    // Datum aus Metadaten oder aktuelles Datum
    let dateStr = '';
    if (data.info && data.info.CreationDate) {
      // PDF-Datum formatieren (z.B. D:20230820120000Z)
      const match = data.info.CreationDate.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (match) {
        dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    
    return { title, dateStr };
  } catch (err) {
    console.error(`Fehler beim Auslesen von ${filePath}:`, err);
    return { title: 'Unbekannt', dateStr: new Date().toISOString().slice(0, 10) };
  }
}

async function moveFilesWithRente() {
  const sourceDir = '/Users/snoopy/Dokumente';
  const targetDir = '/Volumes/FRITZ.NAS/ChrisDokumente/Rente';

  try {
    const files = await fs.readdir(sourceDir);
    for (const file of files) {
      if (file.includes('Rente') && file.endsWith('.pdf')) {
        const sourceFile = path.join(sourceDir, file);

        // Titel und Datum extrahieren
        const { title, dateStr } = await extractPdfInfo(sourceFile);

        // Neuen Dateinamen bauen
        const newFileName = `${dateStr}_${title}.pdf`;
        const targetFile = path.join(targetDir, newFileName);

        try {
          await fs.rename(sourceFile, targetFile);
          console.log(`Datei verschoben und umbenannt: ${newFileName}`);
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
    await fs.copyFile(source, target);
    await fs.unlink(source);
    console.log('File moved across devices successfully');
  } catch (err) {
    try { await fs.unlink(target); } catch (e) {}
    throw err;
  }
}

// Usage
moveFilesWithRente();