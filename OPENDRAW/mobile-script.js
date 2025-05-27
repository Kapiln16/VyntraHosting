window.addEventListener('load', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const brushSizeInput = document.getElementById('brushSize');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const customColorPicker = document.getElementById('customColorPicker');
  const colorPaletteDiv = document.getElementById('colorPalette');

  let strokes = [];
  let currentStroke = null;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  let brushColor = '#000000';
  let brushSize = parseInt(brushSizeInput.value, 10);

  // Predefined fancy colors for mobile palette
  const colors = [
    '#ff6b6b'
  ];

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    redraw();
  });

  // Screen to world coords
  function screenToWorld(x, y) {
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale,
    };
  }

  // World to screen coords
  function worldToScreen(x, y) {
    return {
      x: x * scale + offsetX,
      y: y * scale + offsetY,
    };
  }

  // Draw all strokes
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * scale;

      ctx.beginPath();
      const start = worldToScreen(stroke[0].x, stroke[0].y);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < stroke.length; i++) {
        const pt = worldToScreen(stroke[i].x, stroke[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }

  // Batch redraw with requestAnimationFrame to reduce lag
  let needsRedraw = false;
  function scheduleRedraw() {
    if (!needsRedraw) {
      needsRedraw = true;
      requestAnimationFrame(() => {
        redraw();
        needsRedraw = false;
      });
    }
  }

  // Drawing state
  let drawing = false;

  function pointerDownHandler(e) {
    e.preventDefault();
    const pos = screenToWorld(e.clientX, e.clientY);
    currentStroke = [{ x: pos.x, y: pos.y }];
    strokes.push({
      color: brushColor,
      size: brushSize,
      points: currentStroke,
      length: 1,
      get length() {
        return this.points.length;
      }
    });
    drawing = true;
    scheduleRedraw();
  }

  function pointerMoveHandler(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = screenToWorld(e.clientX, e.clientY);
    currentStroke.push({ x: pos.x, y: pos.y });
    scheduleRedraw();
  }

  function pointerUpHandler(e) {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    currentStroke = null;
    saveToStorage();
  }

  // Event listeners - pointer events (work for mouse & touch)
  canvas.addEventListener('pointerdown', pointerDownHandler);
  canvas.addEventListener('pointermove', pointerMoveHandler);
  canvas.addEventListener('pointerup', pointerUpHandler);
  canvas.addEventListener('pointercancel', pointerUpHandler);
  canvas.addEventListener('pointerout', pointerUpHandler);
  canvas.addEventListener('pointerleave', pointerUpHandler);

  // Brush size change
  brushSizeInput.addEventListener('input', e => {
    brushSize = parseInt(e.target.value, 10);
  });

  // Zoom functions
  function zoom(factor) {
    // Zoom towards center of canvas
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Convert center to world coords
    const worldCenter = screenToWorld(cx, cy);

    scale *= factor;

    // Recalculate offset to keep center stable
    offsetX = cx - worldCenter.x * scale;
    offsetY = cy - worldCenter.y * scale;

    scheduleRedraw();
  }

  zoomInBtn.addEventListener('click', () => zoom(1.25));
  zoomOutBtn.addEventListener('click', () => zoom(0.8));

  // Color palette rendering
  function createColorSwatches() {
    colorPaletteDiv.innerHTML = '';
    colors.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = c;
      if (c === brushColor) swatch.classList.add('selected');
      swatch.addEventListener('click', () => {
        brushColor = c;
        customColorPicker.value = c;
        updateSelectedSwatch();
      });
      colorPaletteDiv.appendChild(swatch);
    });
  }
  function updateSelectedSwatch() {
    [...colorPaletteDiv.children].forEach(swatch => {
      if (swatch.style.backgroundColor === brushColor) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });
  }
  createColorSwatches();

  // Custom color picker
  customColorPicker.addEventListener('input', e => {
    brushColor = e.target.value;
    updateSelectedSwatch();
  });

  // Save/Load/Clear functions
  function saveToStorage() {
    try {
      localStorage.setItem('infiniteCanvasStrokes', JSON.stringify(strokes));
    } catch {
      // ignore quota exceeded or errors
    }
  }
  function loadFromStorage() {
    const data = localStorage.getItem('infiniteCanvasStrokes');
    if (data) {
      try {
        strokes = JSON.parse(data);
        // Fix strokes with points array instead of length property
        strokes = strokes.map(stroke => {
          if (!stroke.length && stroke.points) {
            stroke.length = stroke.points.length;
            return { ...stroke, length: stroke.points.length, points: stroke.points };
          }
          return stroke;
        });
        scheduleRedraw();
      } catch {
        strokes = [];
      }
    }
  }

  saveBtn.addEventListener('click', () => {
    saveToStorage();
    alert('Drawing saved!');
  });

  loadBtn.addEventListener('click', () => {
    loadFromStorage();
    alert('Drawing loaded!');
  });

  clearBtn.addEventListener('click', () => {
    strokes = [];
    scheduleRedraw();
    saveToStorage();
  });

  // Initial load
  loadFromStorage();
  scheduleRedraw();
});
