console.log("Skript gestartet ✅");

const fs = require('fs').promises;
const path = require('path');
const { createWorker } = require('tesseract.js');
const { execSync } = require('child_process');

async function extractPdfInfoWithOCR(filePath) {
  console.log("Starte OCR für:", filePath);
  try {
    const tempImage = '/tmp/ocr_temp.png';

    console.log("Erzeuge PNG aus PDF...");
    execSync(`pdftoppm -f 1 -singlefile -png "${filePath}" "/tmp/ocr_temp"`);
    console.log("PNG gespeichert unter:", tempImage);

    const worker = await createWorker();
    await worker.load();
    await worker.loadLanguage('deu');
    await worker.initialize('deu');

    console.log("OCR läuft...");
    const { data: { text } } = await worker.recognize(tempImage);
    await worker.terminate();

    console.log("OCR Ergebnis (erste 200 Zeichen):", text.slice(0, 200));

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'Unbekannt';
    title = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 30);
    console.log("Extrahierter Titel:", title);

    const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})/);
    let dateStr = '';
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('.');
      dateStr = `${y}-${m}-${d}`;
      console.log("Gefundenes Datum:", dateStr);
    } else {
      dateStr = new Date().toISOString().slice(0, 10);
      console.log("Kein Datum gefunden, heutiges Datum:", dateStr);
    }

    return { title, dateStr };
  } catch (err) {
    console.error(`❌ Fehler bei OCR für ${filePath}:`, err);
    return { title: 'Unbekannt', dateStr: new Date().toISOString().slice(0, 10) };
  }
}

async function moveFilesWithRente() {
  const sourceDir = '/Users/snoopy/Dokumente';
  const targetDir = '/Volumes/FRITZ.NAS/ChrisDokumente/Rente';

  console.log("Quellordner:", sourceDir);
  console.log("Zielordner:", targetDir);

  try {
    const files = await fs.readdir(sourceDir);
    console.log("Gefundene Dateien:", files);

    for (const file of files) {
      if (file.endsWith('.pdf')) {
        console.log("\n---");
        console.log("Bearbeite Datei:", file);

        const sourceFile = path.join(sourceDir, file);

        const { title, dateStr } = await extractPdfInfoWithOCR(sourceFile);

        const newFileName = `${dateStr}_${title}.pdf`;
        console.log("Neuer Dateiname:", newFileName);

        if (newFileName.toLowerCase().includes('rente')) {
          console.log("➡️ Datei enthält 'rente' → wird verschoben...");
          const targetFile = path.join(targetDir, newFileName);

          try {
            await fs.rename(sourceFile, targetFile);
            console.log(`✅ Datei verschoben und umbenannt: ${newFileName}`);
          } catch (err) {
            if (err.code === 'EXDEV') {
              console.log("Cross-device move nötig...");
              await moveAcrossDevices(sourceFile, targetFile);
            } else {
              console.error(`❌ Fehler beim Verschieben von ${file}:`, err);
            }
          }
        } else {
          console.log("❌ Kein 'rente' im Namen → Datei bleibt liegen.");
        }
      } else {
        console.log("Überspringe Nicht-PDF:", file);
      }
    }
  } catch (err) {
    console.error('❌ Fehler beim Lesen des Quellordners:', err);
  }
}

async function moveAcrossDevices(source, target) {
  console.log("Cross-device Kopie von", source, "nach", target);
  try {
    await fs.copyFile(source, target);
    await fs.unlink(source);
    console.log("✅ Datei erfolgreich über Gerätegrenzen verschoben");
  } catch (err) {
    console.error("❌ Fehler bei Cross-Device Move:", err);
    try { await fs.unlink(target); } catch (e) {}
    throw err;
  }
}

moveFilesWithRente().then(() => {
  console.log("Skript abgeschlossen ✅");
}).catch(err => {
  console.error("❌ Unerwarteter Fehler:", err);
});
