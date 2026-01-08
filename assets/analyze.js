(() => {
  const sourceInput = document.getElementById('analysis-source');
  const correctionInput = document.getElementById('analysis-correction');

  if (!sourceInput || !correctionInput) return;

  const STORAGE_KEY = 'analysis-notes';

  function readNotes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  const stored = readNotes();
  sourceInput.value = stored.source || '';
  correctionInput.value = stored.correction || '';

  sourceInput.addEventListener('input', () => {
    saveNotes({
      ...readNotes(),
      source: sourceInput.value,
    });
  });

  correctionInput.addEventListener('input', () => {
    saveNotes({
      ...readNotes(),
      correction: correctionInput.value,
    });
  });
})();
