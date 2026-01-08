(() => {
  const modeButtons = document.querySelectorAll('[data-analysis-mode]');
  const editor = document.querySelector('.analysis-editor');
  const leftCanvas = document.getElementById('handwriting-left');
  const rightCanvas = document.getElementById('analysis-layer');
  const frameCanvas = document.getElementById('correction-layer');
  const stack = document.getElementById('handwriting-stack');
  const characterLayer = document.getElementById('character-layer');
  const placeholder = document.getElementById('handwriting-placeholder');
  const clearLeftButton = document.querySelector('[data-action="clear-left"]');
  const clearRightButton = document.querySelector('[data-action="clear-right"]');
  const clearFramesButton = document.querySelector('[data-action="clear-frames"]');
  const finalizeButton = document.querySelector('[data-action="finalize-training"]');
  const trainingStatus = document.getElementById('training-status');
  const recognizedText = document.getElementById('recognized-text');

  if (!leftCanvas || !rightCanvas || !frameCanvas || !stack || !characterLayer) return;

  const MODE_STORAGE_KEY = 'analysis-mode';
  const TRAINING_STORAGE_KEY = 'analysis-training-data';
  const BASE_CHARACTERS = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'];

  let currentMode = 'frame';
  let leftHasInk = false;
  let rightHasInk = false;
  let annotations = [];

  const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const readTrainingData = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(TRAINING_STORAGE_KEY) || '{}');
      return {
        samples: Array.isArray(stored.samples) ? stored.samples : [],
        updatedAt: stored.updatedAt || null,
      };
    } catch (error) {
      return { samples: [], updatedAt: null };
    }
  };

  const saveTrainingData = (data) => {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(data));
  };

  const getSuggestionPool = () => {
    const training = readTrainingData().samples
      .filter((sample) => sample && typeof sample.char === 'string')
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .map((sample) => sample.char);
    if (!training.length) return BASE_CHARACTERS;
    return Array.from(new Set([...training, ...BASE_CHARACTERS]));
  };

  const getSuggestion = (index) => {
    const pool = getSuggestionPool();
    return pool[index % pool.length];
  };

  const resizeCanvas = (canvas, width, height) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const resizeAll = () => {
    const leftRect = leftCanvas.getBoundingClientRect();
    if (leftRect.width && leftRect.height) {
      resizeCanvas(leftCanvas, leftRect.width, leftRect.height);
    }
    const stackRect = stack.getBoundingClientRect();
    if (stackRect.width && stackRect.height) {
      resizeCanvas(rightCanvas, stackRect.width, stackRect.height);
      resizeCanvas(frameCanvas, stackRect.width, stackRect.height);
    }
    positionAnnotations();
  };

  const getCanvasPoint = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const updatePlaceholder = () => {
    if (!placeholder) return;
    placeholder.hidden = rightHasInk || annotations.length > 0;
  };

  const updateRecognizedText = () => {
    if (!recognizedText) return;
    const confirmed = annotations.filter((item) => item.confirmed).map((item) => item.char);
    const pending = annotations.filter((item) => !item.confirmed).map((item) => item.char);
    if (!confirmed.length && !pending.length) {
      recognizedText.textContent = 'OCR候補: -';
      return;
    }
    const pendingText = pending.length ? `OCR候補: ${pending.join('・')}` : 'OCR候補: -';
    const confirmedText = confirmed.length ? `確定: ${confirmed.join('・')}` : '確定: -';
    recognizedText.textContent = `${pendingText} / ${confirmedText}`;
  };

  const positionAnnotations = () => {
    const stackRect = stack.getBoundingClientRect();
    annotations.forEach((item) => {
      const element = characterLayer.querySelector(`[data-annotation-id="${item.id}"]`);
      if (!element) return;
      element.style.left = `${item.x * 100}%`;
      element.style.top = `${item.y * 100}%`;
      element.style.width = `${item.width * 100}%`;
      element.style.height = `${item.height * 100}%`;
      element.dataset.stackWidth = `${stackRect.width}`;
    });
  };

  const buildAnnotationElement = (item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'character-annotation';
    wrapper.dataset.annotationId = item.id;
    wrapper.style.left = `${item.x * 100}%`;
    wrapper.style.top = `${item.y * 100}%`;
    wrapper.style.width = `${item.width * 100}%`;
    wrapper.style.height = `${item.height * 100}%`;

    const labelButton = document.createElement('button');
    labelButton.type = 'button';
    labelButton.className = 'character-annotation__label';
    labelButton.textContent = item.confirmed ? `確定: ${item.char}` : item.char;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'character-annotation__remove';
    removeButton.setAttribute('aria-label', '枠を削除');
    removeButton.textContent = '×';

    if (item.confirmed) {
      wrapper.classList.add('character-annotation--registered');
    }

    labelButton.addEventListener('click', () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target || target.confirmed) return;
      target.confirmed = true;
      wrapper.classList.add('character-annotation--registered');
      labelButton.textContent = `確定: ${target.char}`;
      updateRecognizedText();
    });

    removeButton.addEventListener('click', () => {
      annotations = annotations.filter((annotation) => annotation.id !== item.id);
      wrapper.remove();
      updateRecognizedText();
      updatePlaceholder();
    });

    wrapper.appendChild(labelButton);
    wrapper.appendChild(removeButton);
    characterLayer.appendChild(wrapper);
  };

  const addAnnotation = (x, y, width, height) => {
    const stackRect = stack.getBoundingClientRect();
    const clampedWidth = Math.max(1, Math.min(width, stackRect.width - x));
    const clampedHeight = Math.max(1, Math.min(height, stackRect.height - y));
    const item = {
      id: createId(),
      x: x / stackRect.width,
      y: y / stackRect.height,
      width: clampedWidth / stackRect.width,
      height: clampedHeight / stackRect.height,
      char: getSuggestion(annotations.length),
      confirmed: false,
    };
    annotations.push(item);
    buildAnnotationElement(item);
    updateRecognizedText();
    updatePlaceholder();
  };

  const createPenDrawer = (canvas, isEnabled, onInk) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;
    let lastPoint = null;

    const start = (event) => {
      if (!isEnabled()) return;
      drawing = true;
      lastPoint = getCanvasPoint(event, canvas);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      if (onInk) onInk();
    };

    const move = (event) => {
      if (!drawing || !lastPoint) return;
      const point = getCanvasPoint(event, canvas);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPoint = point;
    };

    const end = (event) => {
      if (!drawing) return;
      drawing = false;
      lastPoint = null;
      canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
  };

  const clearCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearAnnotations = () => {
    annotations = [];
    characterLayer.innerHTML = '';
    updateRecognizedText();
    updatePlaceholder();
  };

  const setMode = (mode) => {
    currentMode = mode;
    if (editor) {
      editor.dataset.analysisMode = mode;
    }
    modeButtons.forEach((button) => {
      const isActive = button.dataset.analysisMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

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

  createPenDrawer(leftCanvas, () => true, () => {
    leftHasInk = true;
  });

  createPenDrawer(rightCanvas, () => currentMode === 'pen', () => {
    rightHasInk = true;
    updatePlaceholder();
  });

  const frameCtx = frameCanvas.getContext('2d');
  let framing = false;
  let startPoint = null;

  const drawFramePreview = (start, end) => {
    if (!frameCtx) return;
    frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
    frameCtx.strokeStyle = '#f97316';
    frameCtx.lineWidth = 2;
    frameCtx.setLineDash([6, 4]);
    frameCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    frameCtx.setLineDash([]);
  };

  frameCanvas.addEventListener('pointerdown', (event) => {
    if (currentMode !== 'frame') return;
    framing = true;
    startPoint = getCanvasPoint(event, frameCanvas);
    frameCanvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  frameCanvas.addEventListener('pointermove', (event) => {
    if (!framing || !startPoint) return;
    const currentPoint = getCanvasPoint(event, frameCanvas);
    drawFramePreview(startPoint, currentPoint);
  });

  frameCanvas.addEventListener('pointerup', (event) => {
    if (!framing || !startPoint) return;
    const endPoint = getCanvasPoint(event, frameCanvas);
    framing = false;
    frameCanvas.releasePointerCapture(event.pointerId);
    if (frameCtx) {
      frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
    }
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    startPoint = null;
    if (width < 12 || height < 12) return;
    addAnnotation(x, y, width, height);
  });

  frameCanvas.addEventListener('pointerleave', () => {
    if (!framing) return;
    framing = false;
    startPoint = null;
    if (frameCtx) {
      frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
    }
  });

  if (clearLeftButton) {
    clearLeftButton.addEventListener('click', () => {
      clearCanvas(leftCanvas);
      leftHasInk = false;
    });
  }

  if (clearRightButton) {
    clearRightButton.addEventListener('click', () => {
      clearCanvas(rightCanvas);
      rightHasInk = false;
      updatePlaceholder();
    });
  }

  if (clearFramesButton) {
    clearFramesButton.addEventListener('click', () => {
      clearAnnotations();
    });
  }

  if (finalizeButton) {
    finalizeButton.addEventListener('click', () => {
      const confirmed = annotations.filter((item) => item.confirmed);
      if (!confirmed.length) {
        if (trainingStatus) {
          trainingStatus.textContent = '確定した文字がありません。';
        }
        return;
      }
      const trainingData = readTrainingData();
      confirmed.forEach((item) => {
        const existing = trainingData.samples.find((sample) => sample.char === item.char);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          trainingData.samples.push({ char: item.char, count: 1 });
        }
      });
      trainingData.updatedAt = new Date().toISOString();
      saveTrainingData(trainingData);
      if (trainingStatus) {
        trainingStatus.textContent = `${confirmed.length}件の文字を学習データとして保存しました。`;
      }
    });
  }

  const resizeObserver = new ResizeObserver(() => {
    resizeAll();
  });
  resizeObserver.observe(stack);
  resizeObserver.observe(leftCanvas);
  resizeAll();
  updateRecognizedText();
  updatePlaceholder();
})();
