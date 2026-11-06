// ---- a presets file dragged onto the page imports it (as the import button does), and the presets open to show it ----
{
  let depth = 0;
  const isFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', (e) => { if (!isFiles(e)) return; depth++; $('m').classList.add('dropping'); });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; $('m').classList.remove('dropping'); } });
  addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault(); });
  addEventListener('drop', async (e) => {
    if (!isFiles(e)) return;
    e.preventDefault(); depth = 0; $('m').classList.remove('dropping');
    const files = [...e.dataTransfer.files].filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json');
    if (!files.length) return;
    mTab('presets');
    await mImport(files);
  });
}
