(() => {
  const modeButtons = document.querySelectorAll('[data-analysis-mode]');
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
  const TRAINING_STORAGE_KEY = 'analysis-training-data';
  const BASE_CHARACTERS = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'];

  let currentMode = 'frame';
  let leftHasInk = false;
  let rightHasInk = false;
  let annotations = [];
  let activeAnnotationId = null;
  const defaultHandwritingStatus = handwritingStatus?.textContent || '';

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
      .filter((sample) => sample && typeof sample.char === 'string' && !sample.unknown)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
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
    const leftRect = leftCanvas.getBoundingClientRect();
    if (leftRect.width && leftRect.height) {
      resizeCanvas(leftCanvas, leftRect.width, leftRect.height);
    }
    const stackRect = stack.getBoundingClientRect();
    if (stackRect.width && stackRect.height) {
      resizeCanvas(mirrorCanvas, stackRect.width, stackRect.height);
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
    wrapper.classList.toggle('character-annotation--registered', annotation.confirmed);
    wrapper.classList.toggle('character-annotation--active', annotation.needsReview);
    wrapper.classList.toggle('character-annotation--unknown', annotation.unknown);
    if (statusLabel) {
      if (annotation.confirmed) {
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

    const statusLabel = document.createElement('div');
    statusLabel.className = 'character-annotation__status';

    const choiceList = document.createElement('div');
    choiceList.className = 'character-annotation__choices';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'character-annotation__remove';
    removeButton.setAttribute('aria-label', '枠を削除');
    removeButton.textContent = '×';

    const unknownButton = document.createElement('button');
    unknownButton.type = 'button';
    unknownButton.className = 'character-annotation__unknown';
    unknownButton.setAttribute('aria-label', '未確定として登録');
    unknownButton.textContent = '?';

    wrapper.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target) return;
      target.confirmed = false;
      target.unknown = false;
      target.needsReview = true;
      target.candidates = [];
      target.char = '';
      activeAnnotationId = target.id;
      renderAnnotationState(target, wrapper);
      updateRecognizedText();
    });

    removeButton.addEventListener('click', () => {
      annotations = annotations.filter((annotation) => annotation.id !== item.id);
      if (activeAnnotationId === item.id) {
        activeAnnotationId = null;
      }
      wrapper.remove();
      updateRecognizedText();
      updatePlaceholder();
    });

    unknownButton.addEventListener('click', () => {
      const target = annotations.find((annotation) => annotation.id === item.id);
      if (!target) return;
      target.char = '？';
      target.confirmed = true;
      target.unknown = true;
      target.needsReview = false;
      activeAnnotationId = null;
      renderAnnotationState(target, wrapper);
    });

    wrapper.appendChild(statusLabel);
    wrapper.appendChild(choiceList);
    wrapper.appendChild(removeButton);
    wrapper.appendChild(unknownButton);
    characterLayer.appendChild(wrapper);
    renderAnnotationState(item, wrapper);
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

    const start = (event) => {
      if (!isEnabled()) return;
      const options = getOptions ? getOptions() : {};
      if (!options) return;
      drawing = true;
      lastPoint = getCanvasPoint(event, canvas);
      previousComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = options.composite || 'source-over';
      ctx.strokeStyle = options.color || '#ef4444';
      ctx.lineWidth = options.lineWidth || 3;
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
    clearCanvas(frameCanvas);
    clearAnnotations();
    const regions = detectInkRegions();
    if (regions.length) {
      addDetectedAnnotations(regions);
      updateHandwritingStatus(`文字判定で${regions.length}件を赤枠で囲みました。`);
    } else {
      updateHandwritingStatus('左側の手書きを解析枠に転送しました。');
    }
  };

  const clearAnnotations = () => {
    annotations = [];
    characterLayer.innerHTML = '';
    activeAnnotationId = null;
    updateRecognizedText();
    updatePlaceholder();
  };

  const renderTrainingSummary = () => {
    if (!trainingList) return;
    const training = readTrainingData();
    if (!training.samples.length) {
      trainingList.innerHTML = '<p class="muted-text">蓄積データはまだありません。</p>';
      return;
    }
    trainingList.innerHTML = '';
    const sorted = [...training.samples].sort((a, b) => (b.count || 0) - (a.count || 0));
    sorted.forEach((sample) => {
      const card = document.createElement('div');
      card.className = 'training-card';

      const charLabel = document.createElement('p');
      charLabel.className = 'training-card__char';
      charLabel.textContent = sample.unknown ? '？' : sample.char;

      const countLabel = document.createElement('p');
      countLabel.className = 'training-card__count';
      countLabel.textContent = `${sample.count || 0}件`;

      const sampleList = document.createElement('div');
      sampleList.className = 'training-card__samples';
      const sampleChar = sample.unknown ? '？' : sample.char;
      const sampleCount = Math.max(1, Math.min(sample.count || 0, 6));
      for (let i = 0; i < sampleCount; i += 1) {
        const chip = document.createElement('span');
        chip.className = 'training-sample';
        chip.textContent = sampleChar;
        sampleList.appendChild(chip);
      }
      if ((sample.count || 0) > sampleCount) {
        const more = document.createElement('span');
        more.className = 'training-sample training-sample--more';
        more.textContent = `+${(sample.count || 0) - sampleCount}`;
        sampleList.appendChild(more);
      }

      const meta = document.createElement('p');
      meta.className = 'training-card__meta';
      meta.textContent = `手書きサンプル: ${sample.count || 0}件`;

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
      trainingList.appendChild(card);
    });
  };

  const reanalyzeAnnotation = (annotation) => {
    if (!annotation || !annotation.needsReview) return;
    annotation.candidates = getSuggestionCandidates(Math.floor(Math.random() * 100));
    annotation.char = annotation.candidates[0] || '';
    annotation.needsReview = false;
    const element = characterLayer.querySelector(`[data-annotation-id="${annotation.id}"]`);
    if (element) {
      renderAnnotationState(annotation, element);
    }
    updateRecognizedText();
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
    if (mode === 'handwriting') {
      updateHandwritingStatus('青ペンで書き直した文字を再解析できます。');
    } else if (mode === 'eraser') {
      updateHandwritingStatus('消しゴムで青・赤ペンを消去できます。');
    } else if (mode === 'pen') {
      updateHandwritingStatus('赤ペンで枠内をなぞると再解析します。');
    } else {
      updateHandwritingStatus(defaultHandwritingStatus || '両枠とも手書き入力中');
    }
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

  createPenDrawer(
    leftCanvas,
    () => true,
    () => ({ color: '#0f172a', lineWidth: 3 }),
    () => {
      leftHasInk = true;
      updatePlaceholder();
    },
  );

  createPenDrawer(
    rightCanvas,
    () => ['pen', 'handwriting', 'eraser'].includes(currentMode),
    () => {
      if (currentMode === 'handwriting') {
        return { color: '#38bdf8', lineWidth: 3 };
      }
      if (currentMode === 'eraser') {
        return { composite: 'destination-out', lineWidth: 16 };
      }
      return { color: '#ef4444', lineWidth: 3 };
    },
    () => {
      rightHasInk = true;
      updatePlaceholder();
    },
    () => {
      if (!['pen', 'handwriting'].includes(currentMode)) return;
      const target = annotations.find((annotation) => annotation.id === activeAnnotationId);
      if (target) {
        reanalyzeAnnotation(target);
        if (currentMode === 'handwriting') {
          updateHandwritingStatus('青ペンで書き直した文字を再解析しました。');
        }
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
      updateHandwritingStatus(defaultHandwritingStatus || '両枠とも手書き入力中');
      updatePlaceholder();
    });
  }

  if (clearRightButton) {
    clearRightButton.addEventListener('click', () => {
      clearCanvas(rightCanvas);
      rightHasInk = false;
      clearAnnotations();
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
        const existing = trainingData.samples.find(
          (sample) => sample.char === item.char && Boolean(sample.unknown) === Boolean(item.unknown),
        );
        if (existing) {
          existing.count = (existing.count || 0) + 1;
        } else {
          trainingData.samples.push({ char: item.char, count: 1, unknown: item.unknown || false });
        }
      });
      trainingData.updatedAt = new Date().toISOString();
      saveTrainingData(trainingData);
      if (trainingStatus) {
        trainingStatus.textContent = `${confirmed.length}件の文字を学習データとして保存しました。`;
      }
      renderTrainingSummary();
    });
  }

  if (analyzeLeftButton) {
    analyzeLeftButton.addEventListener('click', () => {
      analyzeLeftHandwriting();
    });
  }

  const renderMirrorLayer = () => {
    const ctx = mirrorCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
      if (leftHasInk) {
        ctx.drawImage(leftCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
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
