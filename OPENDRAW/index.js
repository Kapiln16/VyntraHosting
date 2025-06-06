window.addEventListener('load', () => {
  const overlay = document.getElementById('loadingOverlay');
  const toolbar = document.getElementById('toolbar');
  const canvas = document.getElementById('canvas');

  setTimeout(() => {
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
      toolbar.style.display = 'flex';
      canvas.style.display = 'block';
      initDrawingApp();
    }, 500);
  }, 2000);
});

function initDrawingApp() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const colorPalette = document.getElementById('colorPalette');
  const customColorPicker = document.getElementById('customColorPicker');
  const brushSizeInput = document.getElementById('brushSize');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');

  const paletteColors = [
    '#000000', '#444444', '#888888', '#FFFFFF',
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
    '#f58231', '#911eb4', '#46f0f0', '#f032e6',
    '#bcf60c', '#fabebe', '#008080', '#e6beff',
  ];

  let brushColor = paletteColors[0]; 
  let brushSize = +brushSizeInput.value;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDrawing = false;
  let lastPos = null;
  let isPanning = false;
  let panStart = null;

  let strokes = [];
  let currentStroke = null;

  function resizeCanvas() {
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    redraw();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  paletteColors.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    if(color === brushColor) swatch.classList.add('selected');
    swatch.addEventListener('click', () => {
      brushColor = color;
      updateSelectedSwatch();
      customColorPicker.value = brushColor;
    });
    colorPalette.appendChild(swatch);
  });

  function updateSelectedSwatch() {
    const swatches = colorPalette.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      if (normalizeColor(swatch.style.backgroundColor) === normalizeColor(brushColor)) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });
  }

  function normalizeColor(color) {
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    return computed;
  }

  customColorPicker.value = brushColor;
  customColorPicker.addEventListener('input', e => {
    brushColor = e.target.value;
    updateSelectedSwatch();
  });

  brushSizeInput.addEventListener('input', e => {
    brushSize = +e.target.value;
  });

  function screenToWorld(x, y) {
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale
    };
  }

  function worldToScreen(x, y) {
    return {
      x: x * scale + offsetX,
      y: y * scale + offsetY
    };
  }

  function drawStroke(stroke) {
    if (!stroke.points.length) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const p0 = worldToScreen(stroke.points[0].x, stroke.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = worldToScreen(stroke.points[i].x, stroke.points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const stroke of strokes) {
      drawStroke(stroke);
    }
    if (currentStroke) drawStroke(currentStroke);
  }

  function saveToLocal() {
    try {
      localStorage.setItem('infiniteCanvasStrokes', JSON.stringify(strokes));
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }


  canvas.addEventListener('mousedown', e => {
    if (e.button === 1 || e.shiftKey) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;
    isDrawing = true;
    const pos = screenToWorld(e.offsetX, e.offsetY);
    currentStroke = {
      color: brushColor,
      size: brushSize,
      points: [pos]
    };
    lastPos = pos;
  });

  canvas.addEventListener('mouseup', e => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'crosshair';
      return;
    }
    if (isDrawing) {
      isDrawing = false;
      if (currentStroke.points.length > 1) {
        strokes.push(currentStroke);
        saveToLocal();
      }
      currentStroke = null;
      redraw();
    }
  });

  canvas.addEventListener('mouseout', e => {
    if (isDrawing) {
      isDrawing = false;
      if (currentStroke && currentStroke.points.length > 1) {
        strokes.push(currentStroke);
        saveToLocal();
      }
      currentStroke = null;
      redraw();
    }
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'crosshair';
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      offsetX += dx;
      offsetY += dy;
      panStart = { x: e.clientX, y: e.clientY };
      redraw();
      return;
    }

    if (!isDrawing) return;

    const pos = screenToWorld(e.offsetX, e.offsetY);
    currentStroke.points.push(pos);
    lastPos = pos;
    redraw();
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    isDrawing = true;
    const pos = screenToWorld(offsetX, offsetY);
    currentStroke = {
      color: brushColor,
      size: brushSize,
      points: [pos]
    };
    lastPos = pos;
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!isDrawing) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    const pos = screenToWorld(offsetX, offsetY);
    currentStroke.points.push(pos);
    lastPos = pos;
    redraw();
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke);
      saveToLocal();
    }
    currentStroke = null;
    redraw();
  }, { passive: false });

  canvas.addEventListener('touchcancel', e => {
    e.preventDefault();
    if (!isDrawing) return;
    isDrawing = false;
    currentStroke = null;
    redraw();
  }, { passive: false });

  
  canvas.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const wheel = e.deltaY < 0 ? 1.1 : 0.9;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    const worldPosBeforeZoom = screenToWorld(mouseX, mouseY);
    scale *= wheel;
    scale = Math.min(Math.max(scale, 0.1), 10);
    const worldPosAfterZoom = screenToWorld(mouseX, mouseY);
    offsetX += (worldPosAfterZoom.x - worldPosBeforeZoom.x) * scale;
    offsetY += (worldPosAfterZoom.y - worldPosBeforeZoom.y) * scale;

    redraw();
  }, { passive: false });

  zoomInBtn.addEventListener('click', () => {
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const worldCenterBefore = screenToWorld(centerX, centerY);
    scale *= 1.2;
    scale = Math.min(scale, 10);
    const worldCenterAfter = screenToWorld(centerX, centerY);
    offsetX += (worldCenterAfter.x - worldCenterBefore.x) * scale;
    offsetY += (worldCenterAfter.y - worldCenterBefore.y) * scale;
    redraw();
  });

  zoomOutBtn.addEventListener('click', () => {
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const worldCenterBefore = screenToWorld(centerX, centerY);
    scale /= 1.2;
    scale = Math.max(scale, 0.1);
    const worldCenterAfter = screenToWorld(centerX, centerY);
    offsetX += (worldCenterAfter.x - worldCenterBefore.x) * scale;
    offsetY += (worldCenterAfter.y - worldCenterBefore.y) * scale;
    redraw();
  });

  saveBtn.addEventListener('click', () => {
    saveToLocal();
    alert('Drawing saved to local storage!');
  });

  loadBtn.addEventListener('click', () => {
    const data = localStorage.getItem('infiniteCanvasStrokes');
    if (!data) {
      alert('No saved drawing found!');
      return;
    }
    strokes = JSON.parse(data);
    redraw();
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all drawing?')) return;
    strokes = [];
    currentStroke = null;
    saveToLocal();
    redraw();
  });

  const savedData = localStorage.getItem('infiniteCanvasStrokes');
  if (savedData) {
    try {
      strokes = JSON.parse(savedData);
    } catch {}
  }

  redraw();
}
