(() => {
  const modeButtons = document.querySelectorAll('[data-analysis-mode]');
  const handwritingToolButtons = document.querySelectorAll('[data-handwriting-tool]');
  const editor = document.querySelector('.analysis-editor');
  const leftCanvas = document.getElementById('handwriting-left');
  const mirrorCanvas = document.getElementById('mirror-layer');
  const rightCanvas = document.getElementById('analysis-layer');
  const frameCanvas = document.getElementById('correction-layer');
  const stack = document.getElementById('handwriting-stack');
  const characterLayer = document.getElementById('character-layer');
  const placeholder = document.getElementById('handwriting-placeholder');
  const clearLeftButton = document.querySelector('[data-action="clear-left"]');
  const clearRightButton = document.querySelector('[data-action="clear-right"]');
  const clearFramesButton = document.querySelector('[data-action="clear-frames"]');
  const finalizeButton = document.querySelector('[data-action="finalize-training"]');
  const analyzeLeftButton = document.querySelector('[data-action="analyze-left"]');
  const handwritingStatus = document.getElementById('handwriting-status');
  const trainingStatus = document.getElementById('training-status');
  const recognizedText = document.getElementById('recognized-text');
  const trainingList = document.getElementById('training-list');

  if (!leftCanvas || !mirrorCanvas || !rightCanvas || !frameCanvas || !stack || !characterLayer) return;

  const MODE_STORAGE_KEY = 'analysis-mode';
  const HANDWRITING_TOOL_KEY = 'analysis-handwriting-tool';
  const TRAINING_STORAGE_KEY = 'analysis-training-data';
  const BASE_CHARACTERS = [
    'あ',
    'い',
    'う',
    'え',
    'お',
    'か',
    'き',
    'く',
    'け',
    'こ',
    'さ',
    'し',
    'す',
    'せ',
    'そ',
    '漢',
    '字',
    '學',
    '学',
    '體',
    '体',
    '萬',
    '万',
    '國',
    '国',
    '舊',
    '旧',
    '龍',
    '竜',
    '寫',
    '写',
    '氣',
    '気',
    '畫',
    '画',
    '藝',
    '艺',
    '臺',
    '台',
    '廣',
    '广',
    '門',
    '门',
    '愛',
    '戀',
    '恋',
    '變',
    '变',
    '雲',
    '云',
    '點',
    '点',
  ];
  const FRAME_COLORS = ['#ef4444', '#f97316', '#facc15', '#10b981', '#38bdf8', '#6366f1', '#ec4899'];

  let currentMode = 'frame';
  let currentHandwritingTool = 'pencil';
  let leftHasInk = false;
  let rightHasInk = false;
  let leftLocked = false;
  let annotations = [];
  let activeAnnotationId = null;
  let activeReviewAnnotation = null;
  let editingAnnotationId = null;
  let pendingReanalysisId = null;
  let modeBeforeEdit = null;
  const defaultHandwritingStatus = handwritingStatus?.textContent || '';

  const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const readTrainingData = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(TRAINING_STORAGE_KEY) || '{}');
      return {
        samples: Array.isArray(stored.samples)
          ? stored.samples.map((sample) => ({
              char: sample.char,
              unknown: Boolean(sample.unknown),
              count: sample.count || 0,
              samples: Array.isArray(sample.samples) ? sample.samples.filter(Boolean) : [],
            }))
          : [],
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
      .filter((sample) => sample && typeof sample.char === 'string' && !sample.unknown)
      .sort((a, b) => (b.samples?.length || b.count || 0) - (a.samples?.length || a.count || 0))
      .map((sample) => sample.char);
    if (!training.length) return BASE_CHARACTERS;
    return Array.from(new Set([...training, ...BASE_CHARACTERS]));
  };

  const getSuggestionCandidates = (seed) => {
    const pool = getSuggestionPool();
    if (!pool.length) return ['?'];
    const count = Math.min(3, pool.length);
    const start = typeof seed === 'number' ? seed : Math.floor(Math.random() * pool.length);
    const candidates = [];
    for (let i = 0; i < count; i += 1) {
      candidates.push(pool[(start + i) % pool.length]);
    }
    return candidates;
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
    const stackRect = stack.getBoundingClientRect();
    if (stackRect.width && stackRect.height) {
      leftCanvas.style.height = `${stackRect.height}px`;
      leftCanvas.style.width = `${stackRect.width}px`;
      leftCanvas.style.maxWidth = '100%';
      resizeCanvas(mirrorCanvas, stackRect.width, stackRect.height);
      resizeCanvas(rightCanvas, stackRect.width, stackRect.height);
      resizeCanvas(frameCanvas, stackRect.width, stackRect.height);
    }
    const leftRect = leftCanvas.getBoundingClientRect();
    if (leftRect.width && leftRect.height) {
      resizeCanvas(leftCanvas, leftRect.width, leftRect.height);
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
    placeholder.hidden = leftHasInk || rightHasInk || annotations.length > 0;
  };

  const updateRecognizedText = () => {
    if (!recognizedText) return;
    const confirmed = annotations
      .filter((item) => item.confirmed)
      .map((item) => (item.unknown ? '？' : item.char))
      .filter(Boolean);
    const pending = annotations
      .filter((item) => !item.confirmed && item.char)
      .map((item) => item.char);
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

  const renderAnnotationState = (annotation, wrapper) => {
    const statusLabel = wrapper.querySelector('.character-annotation__status');
    const choiceList = wrapper.querySelector('.character-annotation__choices');
    wrapper.classList.toggle('character-annotation--registered', annotation.registered);
    wrapper.classList.toggle('character-annotation--active', annotation.needsReview);
    wrapper.classList.toggle('character-annotation--unknown', annotation.unknown);
    if (statusLabel) {
      if (annotation.registered) {
        statusLabel.textContent = annotation.unknown ? '未確定登録' : `登録済み: ${annotation.char}`;
      } else if (annotation.confirmed) {
        statusLabel.textContent = annotation.unknown ? '未確定' : `確定: ${annotation.char}`;
      } else if (annotation.needsReview) {
        statusLabel.textContent = '再解析待ち';
      } else {
        statusLabel.textContent = '候補を選択';
      }
    }
    if (choiceList) {
      choiceList.innerHTML = '';
      if (!annotation.confirmed && !annotation.needsReview) {
        annotation.candidates.forEach((candidate) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'character-annotation__choice';
          button.textContent = candidate;
          button.addEventListener('click', () => {
            annotation.char = candidate;
            annotation.confirmed = true;
            annotation.unknown = false;
            annotation.needsReview = false;
            annotation.registered = false;
            activeAnnotationId = null;
            renderAnnotationState(annotation, wrapper);
            updateRecognizedText();
          });
          choiceList.appendChild(button);
        });
      }
    }
    updateRecognizedText();
  };

  const buildAnnotationElement = (item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'character-annotation';
    wrapper.dataset.annotationId = item.id;
    wrapper.style.left = `${item.x * 100}%`;
    wrapper.style.top = `${item.y * 100}%`;
    wrapper.style.width = `${item.width * 100}%`;
    wrapper.style.height = `${item.height * 100}%`;
    wrapper.style.setProperty('--frame-color', item.color);

    const statusLabel = document.createElement('div');
    statusLabel.className = 'character-annotation__status';

    const choiceList = document.createElement('div');
    choiceList.className = 'character-annotation__choices';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'character-annotation__remove';
    removeButton.setAttribute('aria-label', '枠を削除');
    removeButton.textContent = '×';

    const inputButton = document.createElement('button');
    inputButton.type = 'button';
    inputButton.className = 'character-annotation__input';
    inputButton.setAttribute('aria-label', 'キーボードで文字を入力');
    inputButton.textContent = '字';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'character-annotation__edit';
    editButton.setAttribute('aria-label', '青ペンで清書する');
    editButton.setAttribute('aria-pressed', 'false');
    editButton.textContent = '✎';

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'character-annotation__confirm';
    confirmButton.setAttribute('aria-label', '学習データに確定');
    confirmButton.textContent = '✔';

    const markForReview = () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target) return;
      target.confirmed = false;
      target.unknown = false;
      target.needsReview = true;
      target.registered = false;
      target.candidates = [];
      target.char = '';
      activeAnnotationId = target.id;
      renderAnnotationState(target, wrapper);
      updateRecognizedText();
    };

    const dragState = {
      active: false,
      moved: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
    };

    wrapper.addEventListener('pointerdown', (event) => {
      if (currentMode !== 'frame') return;
      if (editingAnnotationId) return;
      if (event.target.closest('button')) return;
      dragState.active = true;
      dragState.moved = false;
      dragState.startX = event.clientX;
      dragState.startY = event.clientY;
      dragState.startLeft = item.x;
      dragState.startTop = item.y;
      wrapper.classList.add('character-annotation--dragging');
      wrapper.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    wrapper.addEventListener('pointermove', (event) => {
      if (!dragState.active) return;
      const stackRect = stack.getBoundingClientRect();
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        dragState.moved = true;
      }
      const nextX = dragState.startLeft + deltaX / stackRect.width;
      const nextY = dragState.startTop + deltaY / stackRect.height;
      item.x = Math.max(0, Math.min(nextX, 1 - item.width));
      item.y = Math.max(0, Math.min(nextY, 1 - item.height));
      wrapper.style.left = `${item.x * 100}%`;
      wrapper.style.top = `${item.y * 100}%`;
    });

    wrapper.addEventListener('pointerup', (event) => {
      if (!dragState.active) return;
      dragState.active = false;
      wrapper.classList.remove('character-annotation--dragging');
      wrapper.releasePointerCapture(event.pointerId);
      if (!dragState.moved) {
        markForReview();
      }
    });

    wrapper.addEventListener('pointerleave', () => {
      if (!dragState.active) return;
      dragState.active = false;
      wrapper.classList.remove('character-annotation--dragging');
    });

    removeButton.addEventListener('click', () => {
      annotations = annotations.filter((annotation) => annotation.id !== item.id);
      if (activeAnnotationId === item.id) {
        activeAnnotationId = null;
      }
      if (editingAnnotationId === item.id) {
        editingAnnotationId = null;
        pendingReanalysisId = null;
        modeBeforeEdit = null;
        updateEditButtons();
      }
      wrapper.remove();
      updateRecognizedText();
      updatePlaceholder();
    });

    inputButton.addEventListener('click', () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target) return;
      const value = window.prompt('判定文字を入力してください。', target.char || '');
      if (value === null) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      target.char = trimmed[0];
      target.confirmed = true;
      target.unknown = false;
      target.needsReview = false;
      target.registered = false;
      activeAnnotationId = null;
      renderAnnotationState(target, wrapper);
      updateRecognizedText();
    });

    editButton.addEventListener('click', () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target) return;
      if (editingAnnotationId === item.id) {
        editingAnnotationId = null;
        updateEditButtons();
        if (pendingReanalysisId === item.id) {
          reanalyzeAnnotation(target);
          pendingReanalysisId = null;
        }
        if (modeBeforeEdit) {
          setMode(modeBeforeEdit);
        } else {
          setMode('frame');
        }
        modeBeforeEdit = null;
        updateHandwritingStatus('赤枠内の文字を再解析しました。');
        return;
      }
      modeBeforeEdit = currentMode;
      pendingReanalysisId = null;
      editingAnnotationId = item.id;
      updateEditButtons();
      markAnnotationForReview(target);
      setMode('handwriting');
      updateHandwritingStatus('鉛筆マークに✔︎が付いている間、赤枠内に文字を書けます。');
    });

    confirmButton.addEventListener('click', () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target || !target.char) return;
      const sample = captureAnnotationSample(target);
      addTrainingSample(target.char, target.unknown, sample);
      target.confirmed = true;
      target.registered = true;
      target.needsReview = false;
      activeAnnotationId = null;
      renderAnnotationState(target, wrapper);
      updateRecognizedText();
    });

    wrapper.appendChild(statusLabel);
    wrapper.appendChild(choiceList);
    wrapper.appendChild(removeButton);
    wrapper.appendChild(inputButton);
    wrapper.appendChild(editButton);
    wrapper.appendChild(confirmButton);
    characterLayer.appendChild(wrapper);
    renderAnnotationState(item, wrapper);
    updateEditButtons();
  };

  const addAnnotation = (x, y, width, height) => {
    const stackRect = stack.getBoundingClientRect();
    const clampedWidth = Math.max(1, Math.min(width, stackRect.width - x));
    const clampedHeight = Math.max(1, Math.min(height, stackRect.height - y));
    const candidates = getSuggestionCandidates(annotations.length);
    const item = {
      id: createId(),
      x: x / stackRect.width,
      y: y / stackRect.height,
      width: clampedWidth / stackRect.width,
      height: clampedHeight / stackRect.height,
      char: candidates[0] || '',
      candidates,
      confirmed: false,
      unknown: false,
      needsReview: false,
      registered: false,
      color: FRAME_COLORS[annotations.length % FRAME_COLORS.length],
    };
    annotations.push(item);
    buildAnnotationElement(item);
    updateRecognizedText();
    updatePlaceholder();
  };

  const createPenDrawer = (canvas, isEnabled, getOptions, onInk, onComplete) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;
    let lastPoint = null;
    let previousComposite = ctx.globalCompositeOperation;
    let clippingActive = false;

    const start = (event) => {
      if (!isEnabled(event)) return;
      const options = getOptions ? getOptions(event) : {};
      if (!options) return;
      const allowedPointerTypes = options.allowedPointerTypes || ['pen'];
      const pointerType = event.pointerType || 'mouse';
      if (!allowedPointerTypes.includes(pointerType)) return;
      if (options.preventDefaultOnly) {
        event.preventDefault();
        return;
      }
      drawing = true;
      lastPoint = getCanvasPoint(event, canvas);
      previousComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = options.composite || 'source-over';
      ctx.strokeStyle = options.color || '#ef4444';
      ctx.lineWidth = options.lineWidth || 3;
      if (options.clipRect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(options.clipRect.x, options.clipRect.y, options.clipRect.width, options.clipRect.height);
        ctx.clip();
        clippingActive = true;
      }
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      if (onInk) onInk(options);
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
      if (clippingActive) {
        ctx.restore();
        clippingActive = false;
      }
      ctx.globalCompositeOperation = previousComposite;
      canvas.releasePointerCapture(event.pointerId);
      if (onComplete) onComplete();
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

  const updateHandwritingStatus = (message) => {
    if (!handwritingStatus) return;
    handwritingStatus.textContent = message;
  };

  const setLeftCanvasLock = (locked) => {
    leftLocked = locked;
    leftCanvas.classList.toggle('handwriting-canvas--locked', locked);
    leftCanvas.setAttribute('aria-disabled', locked ? 'true' : 'false');
    leftCanvas.style.pointerEvents = locked ? 'none' : '';
  };

  const detectInkRegions = () => {
    const ctx = mirrorCanvas.getContext('2d');
    if (!ctx) return [];
    const { width, height } = mirrorCanvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const visited = new Uint8Array(width * height);
    const regions = [];
    const alphaThreshold = 16;
    const minPixelCount = Math.max(60, Math.floor((width * height) / 20000));
    const padding = Math.max(2, Math.floor(Math.min(width, height) * 0.004));

    const stackIndices = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (visited[index]) continue;
        const alpha = data[index * 4 + 3];
        if (alpha <= alphaThreshold) continue;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let count = 0;
        stackIndices.length = 0;
        stackIndices.push(index);
        visited[index] = 1;

        while (stackIndices.length) {
          const current = stackIndices.pop();
          const currentX = current % width;
          const currentY = Math.floor(current / width);
          count += 1;
          if (currentX < minX) minX = currentX;
          if (currentX > maxX) maxX = currentX;
          if (currentY < minY) minY = currentY;
          if (currentY > maxY) maxY = currentY;

          const neighbors = [
            current - 1,
            current + 1,
            current - width,
            current + width,
          ];
          neighbors.forEach((next) => {
            if (next < 0 || next >= width * height) return;
            if (visited[next]) return;
            const nextAlpha = data[next * 4 + 3];
            if (nextAlpha <= alphaThreshold) return;
            visited[next] = 1;
            stackIndices.push(next);
          });
        }

        if (count < minPixelCount) continue;
        regions.push({
          minX: Math.max(0, minX - padding),
          minY: Math.max(0, minY - padding),
          maxX: Math.min(width - 1, maxX + padding),
          maxY: Math.min(height - 1, maxY + padding),
        });
      }
    }

    return regions;
  };

  const addDetectedAnnotations = (regions) => {
    const stackRect = stack.getBoundingClientRect();
    regions
      .sort((a, b) => (a.minY === b.minY ? a.minX - b.minX : a.minY - b.minY))
      .forEach((region) => {
        const x = (region.minX / mirrorCanvas.width) * stackRect.width;
        const y = (region.minY / mirrorCanvas.height) * stackRect.height;
        const width = ((region.maxX - region.minX) / mirrorCanvas.width) * stackRect.width;
        const height = ((region.maxY - region.minY) / mirrorCanvas.height) * stackRect.height;
        addAnnotation(x, y, width, height);
      });
  };

  const analyzeLeftHandwriting = () => {
    if (!leftHasInk) {
      updateHandwritingStatus('左側に手書きしてから解析してください。');
      return;
    }
    const regions = detectInkRegions();
    let addedCount = 0;
    if (regions.length) {
      const stackRect = stack.getBoundingClientRect();
      const existingRects = annotations.map((annotation) => ({
        x: annotation.x * stackRect.width,
        y: annotation.y * stackRect.height,
        width: annotation.width * stackRect.width,
        height: annotation.height * stackRect.height,
      }));
      const overlaps = (region) =>
        existingRects.some((rect) => {
          const regionRect = {
            x: (region.minX / mirrorCanvas.width) * stackRect.width,
            y: (region.minY / mirrorCanvas.height) * stackRect.height,
            width: ((region.maxX - region.minX) / mirrorCanvas.width) * stackRect.width,
            height: ((region.maxY - region.minY) / mirrorCanvas.height) * stackRect.height,
          };
          const overlapX = Math.max(
            0,
            Math.min(rect.x + rect.width, regionRect.x + regionRect.width) -
              Math.max(rect.x, regionRect.x),
          );
          const overlapY = Math.max(
            0,
            Math.min(rect.y + rect.height, regionRect.y + regionRect.height) -
              Math.max(rect.y, regionRect.y),
          );
          const overlapArea = overlapX * overlapY;
          const regionArea = regionRect.width * regionRect.height || 1;
          return overlapArea / regionArea > 0.4;
        });
      const newRegions = regions.filter((region) => !overlaps(region));
      if (newRegions.length) {
        addDetectedAnnotations(newRegions);
        addedCount = newRegions.length;
      }
    }

    const reviewTargets = annotations.filter((item) => item.needsReview);
    reviewTargets.forEach((item) => {
      reanalyzeAnnotation(item);
    });

    let statusMessage = '';
    if (regions.length) {
      statusMessage = `文字判定で${addedCount}件を追加し、${reviewTargets.length}件を再解析しました。`;
    } else if (reviewTargets.length) {
      statusMessage = `枠の再解析を${reviewTargets.length}件行いました。`;
    } else {
      statusMessage = '左側の手書きを解析枠に転送しました。';
    }
    setLeftCanvasLock(true);
    if (currentMode !== 'handwriting') {
      setMode('handwriting');
    }
    updateHandwritingStatus(`${statusMessage} 右パレットの赤枠内で書き直してください。`);
  };

  const clearAnnotations = () => {
    annotations = [];
    characterLayer.innerHTML = '';
    activeAnnotationId = null;
    editingAnnotationId = null;
    pendingReanalysisId = null;
    modeBeforeEdit = null;
    updateEditButtons();
    updateRecognizedText();
    updatePlaceholder();
  };

  const captureAnnotationSample = (annotation) => {
    if (!annotation) return '';
    const stackRect = stack.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const sampleWidth = annotation.width * stackRect.width;
    const sampleHeight = annotation.height * stackRect.height;
    if (sampleWidth <= 0 || sampleHeight <= 0) return '';
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sampleWidth * dpr;
    sampleCanvas.height = sampleHeight * dpr;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const offsetX = -annotation.x * stackRect.width;
    const offsetY = -annotation.y * stackRect.height;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, sampleWidth, sampleHeight);
    ctx.drawImage(mirrorCanvas, offsetX, offsetY, stackRect.width, stackRect.height);
    ctx.drawImage(rightCanvas, offsetX, offsetY, stackRect.width, stackRect.height);
    return sampleCanvas.toDataURL('image/png');
  };

  const addTrainingSample = (char, unknown, sample) => {
    if (!char) return;
    const trainingData = readTrainingData();
    const target = trainingData.samples.find(
      (item) => item.char === char && Boolean(item.unknown) === Boolean(unknown),
    );
    const safeSample = typeof sample === 'string' ? sample : '';
    if (target) {
      const existingCount = Math.max(target.samples?.length || 0, target.count || 0);
      if (safeSample) {
        target.samples = [...(target.samples || []), safeSample];
        target.count = target.samples.length;
      } else {
        target.count = existingCount + 1;
      }
    } else {
      trainingData.samples.push({
        char,
        unknown: Boolean(unknown),
        samples: safeSample ? [safeSample] : [],
        count: safeSample ? 1 : 1,
      });
    }
    trainingData.updatedAt = new Date().toISOString();
    saveTrainingData(trainingData);
    renderTrainingSummary();
  };

  const removeTrainingSample = (char, unknown, index) => {
    const trainingData = readTrainingData();
    const target = trainingData.samples.find(
      (item) => item.char === char && Boolean(item.unknown) === Boolean(unknown),
    );
    if (!target) return;
    if (Array.isArray(target.samples)) {
      target.samples.splice(index, 1);
    }
    target.count = target.samples?.length || 0;
    if (!target.samples?.length) {
      trainingData.samples = trainingData.samples.filter((item) => item !== target);
    }
    trainingData.updatedAt = new Date().toISOString();
    saveTrainingData(trainingData);
    renderTrainingSummary();
  };

  const removeTrainingEntry = (char, unknown) => {
    const trainingData = readTrainingData();
    trainingData.samples = trainingData.samples.filter(
      (item) => !(item.char === char && Boolean(item.unknown) === Boolean(unknown)),
    );
    trainingData.updatedAt = new Date().toISOString();
    saveTrainingData(trainingData);
    renderTrainingSummary();
  };

  const addTrainingSampleFromFile = (char, unknown, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addTrainingSample(char, unknown, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderTrainingSummary = () => {
    if (!trainingList) return;
    const training = readTrainingData();
    if (!training.samples.length) {
      trainingList.innerHTML = '<p class="muted-text">蓄積データはまだありません。</p>';
      return;
    }
    trainingList.innerHTML = '';
    const sorted = [...training.samples].sort(
      (a, b) => (b.samples?.length || b.count || 0) - (a.samples?.length || a.count || 0),
    );
    sorted.forEach((sample) => {
      const card = document.createElement('div');
      card.className = 'training-card';

      const charLabel = document.createElement('p');
      charLabel.className = 'training-card__char';
      charLabel.textContent = sample.unknown ? '？' : sample.char;

      const countLabel = document.createElement('p');
      countLabel.className = 'training-card__count';
      const totalCount = sample.samples?.length || sample.count || 0;
      countLabel.textContent = `${totalCount}件`;

      const sampleList = document.createElement('div');
      sampleList.className = 'training-card__samples';
      const sampleChar = sample.unknown ? '？' : sample.char;
      const samples = Array.isArray(sample.samples) ? sample.samples : [];
      if (samples.length) {
        samples.forEach((src, index) => {
          const chip = document.createElement('div');
          chip.className = 'training-sample';
          const image = document.createElement('img');
          image.src = src;
          image.alt = `${sampleChar}の手書きサンプル`;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'training-sample__remove';
          remove.setAttribute('aria-label', 'サンプルを削除');
          remove.textContent = '×';
          remove.addEventListener('click', () => {
            removeTrainingSample(sample.char, sample.unknown, index);
          });
          chip.appendChild(image);
          chip.appendChild(remove);
          sampleList.appendChild(chip);
        });
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'training-sample training-sample--placeholder';
        placeholder.textContent = sampleChar;
        sampleList.appendChild(placeholder);
      }

      const meta = document.createElement('p');
      meta.className = 'training-card__meta';
      meta.textContent = `手書きサンプル: ${totalCount}件`;

      const actions = document.createElement('div');
      actions.className = 'training-card__actions';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'btn muted';
      addButton.textContent = '追加';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.hidden = true;
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) {
          addTrainingSampleFromFile(sample.char, sample.unknown, file);
        }
        event.target.value = '';
      });

      addButton.addEventListener('click', () => {
        fileInput.click();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn';
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        removeTrainingEntry(sample.char, sample.unknown);
      });
      actions.appendChild(addButton);
      actions.appendChild(deleteButton);
      actions.appendChild(fileInput);

      if (sample.unknown) {
        const badge = document.createElement('span');
        badge.className = 'training-card__badge';
        badge.textContent = '未確定';
        card.appendChild(badge);
      }

      card.appendChild(charLabel);
      card.appendChild(countLabel);
      card.appendChild(sampleList);
      card.appendChild(meta);
      card.appendChild(actions);
      trainingList.appendChild(card);
    });
  };

  const reanalyzeAnnotation = (annotation) => {
    if (!annotation || !annotation.needsReview) return;
    annotation.candidates = getSuggestionCandidates(Math.floor(Math.random() * 100));
    annotation.char = annotation.candidates[0] || '';
    annotation.needsReview = false;
    annotation.confirmed = false;
    annotation.registered = false;
    const element = characterLayer.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (element) {
      renderAnnotationState(annotation, element);
    }
    updateRecognizedText();
  };

  function setMode(mode) {
    currentMode = mode;
    if (editor) {
      editor.dataset.analysisMode = mode;
    }
    if (mode !== 'frame') {
      rightCanvas.style.pointerEvents = '';
      frameCanvas.style.pointerEvents = '';
    }
    modeButtons.forEach((button) => {
      const isActive = button.dataset.analysisMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (mode === 'handwriting') {
      updateHandwritingStatus('青ペンで書き直した文字を再解析できます。');
    } else if (mode === 'eraser') {
      updateHandwritingStatus('消しゴムで青ペンを消去できます。');
    } else {
      updateHandwritingStatus(defaultHandwritingStatus || '両枠とも手書き入力中');
    }
  }

  if (modeButtons.length) {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    const availableModes = Array.from(modeButtons).map((button) => button.dataset.analysisMode);
    const initialMode =
      (savedMode && availableModes.includes(savedMode) ? savedMode : '') ||
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

  const setHandwritingTool = (tool) => {
    currentHandwritingTool = tool;
    handwritingToolButtons.forEach((button) => {
      const isActive = button.dataset.handwritingTool === tool;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  if (handwritingToolButtons.length) {
    const savedTool = localStorage.getItem(HANDWRITING_TOOL_KEY);
    const availableTools = Array.from(handwritingToolButtons).map((button) => button.dataset.handwritingTool);
    const initialTool =
      (savedTool && availableTools.includes(savedTool) ? savedTool : '') ||
      Array.from(handwritingToolButtons).find((button) => button.getAttribute('aria-pressed') === 'true')
        ?.dataset.handwritingTool ||
      handwritingToolButtons[0].dataset.handwritingTool ||
      'pencil';
    setHandwritingTool(initialTool);
    handwritingToolButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tool = button.dataset.handwritingTool || 'pencil';
        localStorage.setItem(HANDWRITING_TOOL_KEY, tool);
        setHandwritingTool(tool);
      });
    });
  }

  createPenDrawer(
    leftCanvas,
    () => !leftLocked,
    () => {
      if (currentMode === 'eraser') {
        return {
          composite: 'destination-out',
          lineWidth: 16,
          allowedPointerTypes: ['pen', 'mouse', 'touch'],
        };
      }
      if (currentHandwritingTool === 'brush') {
        return { color: '#111827', lineWidth: 6, allowedPointerTypes: ['pen', 'mouse', 'touch'] };
      }
      if (currentHandwritingTool === 'ballpen') {
        return { color: '#0f172a', lineWidth: 3, allowedPointerTypes: ['pen', 'mouse', 'touch'] };
      }
      return { color: '#1f2937', lineWidth: 2, allowedPointerTypes: ['pen', 'mouse', 'touch'] };
    },
    () => {
      leftHasInk = true;
      updatePlaceholder();
    },
  );

  const getAnnotationForPoint = (point) => {
    const stackRect = stack.getBoundingClientRect();
    return annotations.find((annotation) => {
      const x = annotation.x * stackRect.width;
      const y = annotation.y * stackRect.height;
      const width = annotation.width * stackRect.width;
      const height = annotation.height * stackRect.height;
      return (
        point.x >= x &&
        point.x <= x + width &&
        point.y >= y &&
        point.y <= y + height
      );
    });
  };

  const markAnnotationForReview = (annotation) => {
    if (!annotation) return;
    annotation.confirmed = false;
    annotation.unknown = false;
    annotation.needsReview = true;
    annotation.registered = false;
    annotation.candidates = [];
    annotation.char = '';
    activeAnnotationId = annotation.id;
    const element = characterLayer.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (element) {
      renderAnnotationState(annotation, element);
    }
    updateRecognizedText();
  };

  const resetFramePointerTargets = () => {
    rightCanvas.style.pointerEvents = '';
    frameCanvas.style.pointerEvents = '';
  };

  const updateFramePointerTargets = (event) => {
    if (currentMode !== 'frame') {
      resetFramePointerTargets();
      return;
    }
    const rect = rightCanvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const target = getAnnotationForPoint(point);
    if (target) {
      rightCanvas.style.pointerEvents = 'auto';
      frameCanvas.style.pointerEvents = 'none';
    } else {
      rightCanvas.style.pointerEvents = 'none';
      frameCanvas.style.pointerEvents = 'auto';
    }
  };

  const updateEditButtons = () => {
    if (!characterLayer) return;
    const buttons = characterLayer.querySelectorAll('.character-annotation__edit');
    buttons.forEach((button) => {
      const wrapper = button.closest('.character-annotation');
      const annotationId = wrapper?.dataset.annotationId;
      const isActive = annotationId && annotationId === editingAnnotationId;
      button.classList.toggle('is-editing', Boolean(isActive));
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (editor) {
      editor.classList.toggle('analysis-editor--locked', Boolean(editingAnnotationId));
    }
  };

  createPenDrawer(
    rightCanvas,
    () => ['handwriting', 'eraser', 'frame'].includes(currentMode),
    (event) => {
      if (['handwriting', 'frame'].includes(currentMode)) {
        const point = getCanvasPoint(event, rightCanvas);
        const target = getAnnotationForPoint(point);
        if (editingAnnotationId && (!target || target.id !== editingAnnotationId)) {
          updateHandwritingStatus('鉛筆マークを付けた赤枠の中に文字を書いてください。');
          return {
            preventDefaultOnly: true,
            allowedPointerTypes: ['pen', 'mouse', 'touch'],
          };
        }
        if (!target) {
          updateHandwritingStatus('赤枠の中に文字を書いてください。');
          return {
            preventDefaultOnly: true,
            allowedPointerTypes: ['pen', 'mouse', 'touch'],
          };
        }
        markAnnotationForReview(target);
        activeReviewAnnotation = target;
        const stackRect = stack.getBoundingClientRect();
        return {
          color: currentMode === 'frame' ? '#ef4444' : '#38bdf8',
          lineWidth: 3,
          allowedPointerTypes: ['pen', 'mouse', 'touch'],
          clipRect: {
            x: target.x * stackRect.width,
            y: target.y * stackRect.height,
            width: target.width * stackRect.width,
            height: target.height * stackRect.height,
          },
        };
      }
      if (currentMode === 'eraser') {
        return {
          composite: 'destination-out',
          lineWidth: 16,
          allowedPointerTypes: ['pen', 'mouse', 'touch'],
        };
      }
      return null;
    },
    () => {
      rightHasInk = true;
      updatePlaceholder();
    },
    () => {
      if (['handwriting', 'frame'].includes(currentMode) && activeReviewAnnotation) {
        if (editingAnnotationId === activeReviewAnnotation.id) {
          pendingReanalysisId = activeReviewAnnotation.id;
          updateHandwritingStatus('鉛筆マークをもう一度タップして再解析します。');
        } else {
          reanalyzeAnnotation(activeReviewAnnotation);
          updateHandwritingStatus('赤枠内の文字を再解析しました。');
        }
        activeReviewAnnotation = null;
      }
    },
  );

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
      setLeftCanvasLock(false);
      updateHandwritingStatus(defaultHandwritingStatus || '両枠とも手書き入力中');
      updatePlaceholder();
    });
  }

  if (clearRightButton) {
    clearRightButton.addEventListener('click', () => {
      clearCanvas(rightCanvas);
      rightHasInk = false;
      clearAnnotations();
      clearCanvas(frameCanvas);
      updatePlaceholder();
    });
  }

  if (clearFramesButton) {
    clearFramesButton.addEventListener('click', () => {
      clearAnnotations();
      clearCanvas(frameCanvas);
    });
  }

  if (finalizeButton) {
    finalizeButton.addEventListener('click', () => {
      const confirmed = annotations.filter((item) => item.confirmed && !item.registered);
      if (!confirmed.length) {
        if (trainingStatus) {
          trainingStatus.textContent = '確定した未登録の文字がありません。';
        }
        return;
      }
      confirmed.forEach((item) => {
        const sample = captureAnnotationSample(item);
        addTrainingSample(item.char, item.unknown, sample);
        item.registered = true;
      });
      if (trainingStatus) {
        trainingStatus.textContent = `${confirmed.length}件の文字を学習データとして保存しました。`;
      }
      confirmed.forEach((item) => {
        const element = characterLayer.querySelector(`[data-annotation-id="${item.id}"]`);
        if (element) {
          renderAnnotationState(item, element);
        }
      });
    });
  }

  if (analyzeLeftButton) {
    analyzeLeftButton.addEventListener('click', () => {
      analyzeLeftHandwriting();
    });
  }

  stack.addEventListener('pointermove', updateFramePointerTargets);
  stack.addEventListener('pointerdown', updateFramePointerTargets);
  stack.addEventListener('pointerleave', resetFramePointerTargets);

  const renderMirrorLayer = () => {
    const ctx = mirrorCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
      if (leftHasInk) {
        const rect = mirrorCanvas.getBoundingClientRect();
        ctx.drawImage(leftCanvas, 0, 0, rect.width, rect.height);
      }
    }
    requestAnimationFrame(renderMirrorLayer);
  };

  const resizeObserver = new ResizeObserver(() => {
    resizeAll();
  });
  resizeObserver.observe(stack);
  resizeObserver.observe(leftCanvas);
  resizeAll();
  updateRecognizedText();
  updatePlaceholder();
  renderTrainingSummary();
  renderMirrorLayer();
})();
