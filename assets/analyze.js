(() => {
  const sourceInput = document.getElementById('analysis-source');
  const correctionInput = document.getElementById('analysis-correction');
  const modeButtons = document.querySelectorAll('[data-analysis-mode]');
  const editor = document.querySelector('.analysis-editor');

  if (!sourceInput || !correctionInput) return;

  const STORAGE_KEY = 'analysis-notes';
  const MODE_STORAGE_KEY = 'analysis-mode';

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

  function setMode(mode) {
    if (editor) {
      editor.dataset.analysisMode = mode;
    }
    modeButtons.forEach((button) => {
      const isActive = button.dataset.analysisMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  if (modeButtons.length) {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    const initialMode =
      savedMode ||
      Array.from(modeButtons).find((button) => button.getAttribute('aria-pressed') === 'true')
        ?.dataset.analysisMode ||
      modeButtons[0].dataset.analysisMode ||
      'frame';
    setMode(initialMode);
    modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.analysisMode || 'frame';
        localStorage.setItem(MODE_STORAGE_KEY, mode);
        setMode(mode);
      });
    });
  }

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
