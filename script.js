const fs = require('fs').promises;
const path = require('path');
const { createWorker } = require('tesseract.js');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

async function extractPdfInfoWithOCR(filePath) {
  try {
    // Extrahiere die erste Seite als Bild (nutzt pdftoppm, muss installiert sein)
    const tempImage = '/tmp/ocr_temp.png';
    execSync(`pdftoppm -f 1 -singlefile -png "${filePath}" "/tmp/ocr_temp"`);

    // OCR mit Tesseract.js
    const worker = await createWorker('deu');
    await worker.load();
    await worker.loadLanguage('deu');
    await worker.initialize('deu');
    const { data: { text } } = await worker.recognize(tempImage);
    await worker.terminate();

    // Titel: erste nicht-leere Zeile
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'Unbekannt';
    title = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);

    // Datum suchen (z.B. 20.08.2025)
    const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
    let dateStr = '';
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('.');
      dateStr = `${y}-${m}-${d}`;
    } else {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    return { title, dateStr };
  } catch (err) {
    console.error(`Fehler bei OCR für ${filePath}:`, err);
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

        // Titel und Datum per OCR extrahieren
        const { title, dateStr } = await extractPdfInfoWithOCR(sourceFile);

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