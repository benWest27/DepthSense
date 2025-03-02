

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("visualization-canvas");
  const ctx = canvas.getContext("2d");

  let state = {
    focalPoint: { x: 0.5, y: 0.5 },
    zoom: 1,
    markerSize: 5,
    mouseControl: false,
    sliderFocal: true,
    layerOffset: 0,
    canvasX: 50,
    canvasY: 50,
    canvasWidth: 600,
    canvasHeight: 600,
    layers: [],
    dataSource: null
    };
  // app.js (editor service)
  let mockDataSource = [];

  // Function to fetch mock CSV data from the data service
  function fetchMockData() {
    fetch('/api/data/mock')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        mockDataSource = data;
        console.log('Mock Data:', mockDataSource);
        // Extract field names from the first row
        updateDataFields();
      })
      .catch(error => console.error('Error fetching mock data:', error));
  }

  function updateDataFields() {
    if (mockDataSource.length > 0) {
      const fieldNames = Object.keys(mockDataSource[0]);
      console.log('Available Fields:', fieldNames);
      // Update your UI (for example, display draggable field items) using these field names.
      // For example, you could dynamically add draggable elements to a container:
      const fieldsContainer = document.getElementById('fields-container');
      fieldsContainer.innerHTML = ''; // Clear existing fields
      fieldNames.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'draggable-field';
        fieldDiv.setAttribute('draggable', 'true');
        fieldDiv.setAttribute('data-field', field);
        fieldDiv.innerHTML = `${field} <span class="field-type">string</span>`;
        fieldsContainer.appendChild(fieldDiv);

        // Set up drag event for the new field
        fieldDiv.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', fieldDiv.getAttribute('data-field'));
        });
      });
    }
  }

  fetchMockData();

  // Update canvas CSS properties and dimensions.
  function updateCanvasProperties() {
    canvas.style.left = state.canvasX + "px";
    canvas.style.top = state.canvasY + "px";
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
  }
  updateCanvasProperties();
  window.addEventListener("resize", updateCanvasProperties);

  // Input Controls for focal point, zoom, marker size
  document.getElementById("horizontal-focal").addEventListener("input", (e) => {
    if (state.sliderFocal) {
      state.focalPoint.x = e.target.value / 100;
      render();
    }
  });
  document.getElementById("vertical-focal").addEventListener("input", (e) => {
    if (state.sliderFocal) {
      state.focalPoint.y = e.target.value / 100;
      render();
    }
  });
  document.getElementById("zoom").addEventListener("input", (e) => {
    state.zoom = parseFloat(e.target.value);
    render();
  });
  document.getElementById("marker-size").addEventListener("input", (e) => {
    state.markerSize = parseInt(e.target.value);
    render();
  });
  document.getElementById("toggle-mouse-control").addEventListener("click", () => {
    state.mouseControl = !state.mouseControl;
  });
  document.getElementById("toggle-focal-mode").addEventListener("click", () => {
    state.sliderFocal = !state.sliderFocal;
  });
  canvas.addEventListener("mousemove", (e) => {
    if (state.mouseControl && !state.sliderFocal) {
      state.focalPoint.x = e.offsetX / canvas.width;
      state.focalPoint.y = e.offsetY / canvas.height;
      render();
    }
  });

  // Layer depth control
  document.getElementById("layer-depth").addEventListener("input", (e) => {
    state.layerOffset = parseFloat(e.target.value);
    render();
  });

  // Canvas positioning & size controls
  document.getElementById("canvas-x").addEventListener("input", (e) => {
    state.canvasX = parseInt(e.target.value);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-y").addEventListener("input", (e) => {
    state.canvasY = parseInt(e.target.value);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-width").addEventListener("input", (e) => {
    state.canvasWidth = parseInt(e.target.value);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-height").addEventListener("input", (e) => {
    state.canvasHeight = parseInt(e.target.value);
    updateCanvasProperties();
    render();
  });

  // Generate a mock layer with data
  function generateMockLayer(z, color, numPoints, xRange, yRange) {
    const data = [];
    for (let i = 0; i < numPoints; i++) {
      const x = i / (numPoints - 1);
      // Sine wave with a bit of randomness
      const y = 0.5 + 0.4 * Math.sin(x * Math.PI * 2) + (Math.random() - 0.5) * 0.1;
      data.push({ x, y });
    }
    return {
      z,
      color,
      data,
      xAxisRange: xRange || [0, 100],
      yAxisRange: yRange || [0, 100]
    };
  }

  // Draw axes (with tickers) for a specific layer
  function drawLayerAxes(layer) {
    const margin = 40;
    ctx.save();
    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#333";
    ctx.lineWidth = 1;

    // X-axis
    const xAxisY = canvas.height - margin;
    ctx.beginPath();
    ctx.moveTo(margin, xAxisY);
    ctx.lineTo(canvas.width - margin, xAxisY);
    ctx.stroke();

    const tickCount = 10;
    const tickSpacing = (canvas.width - 2 * margin) / tickCount;
    const xRange = layer.xAxisRange;
    const xValueStep = (xRange[1] - xRange[0]) / tickCount;

    for (let i = 0; i <= tickCount; i++) {
      const x = margin + i * tickSpacing;
      ctx.beginPath();
      ctx.moveTo(x, xAxisY);
      ctx.lineTo(x, xAxisY + 5);
      ctx.stroke();
      const tickValue = xRange[0] + i * xValueStep;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(tickValue.toFixed(0), x, xAxisY + 15);
    }

    // Y-axis
    const yAxisX = margin;
    ctx.beginPath();
    ctx.moveTo(yAxisX, margin);
    ctx.lineTo(yAxisX, canvas.height - margin);
    ctx.stroke();

    const yTickSpacing = (canvas.height - 2 * margin) / tickCount;
    const yRange = layer.yAxisRange;
    const yValueStep = (yRange[1] - yRange[0]) / tickCount;

    for (let i = 0; i <= tickCount; i++) {
      const y = canvas.height - margin - i * yTickSpacing;
      ctx.beginPath();
      ctx.moveTo(yAxisX, y);
      ctx.lineTo(yAxisX - 5, y);
      ctx.stroke();
      const tickValue = yRange[0] + i * yValueStep;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(tickValue.toFixed(0), yAxisX - 7, y + 3);
    }

    ctx.restore();
  }

  // Render layers with parallax + zoom
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sort by effective depth
    state.layers.sort((a, b) => (b.z - state.layerOffset) - (a.z - state.layerOffset));


    state.layers.forEach(layer => {
      let effectiveZ = layer.z - state.layerOffset;
      if (effectiveZ < 0) effectiveZ = 0;
      const perspective = 1 / (1 + effectiveZ);

      // Parallax offsets
      const parallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - perspective);
      const parallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - perspective);

      ctx.save();
      ctx.translate(parallaxX, parallaxY);
      // Zoom from canvas center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(state.zoom * perspective, state.zoom * perspective);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw data points
      layer.data.forEach(point => {
        ctx.beginPath();
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          state.markerSize,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = layer.color;
        ctx.fill();
      });

      // Draw axes for this layer
      drawLayerAxes(layer);

      ctx.restore();
    });
  }

  // Add a new layer
  function addLayer() {
    const randomZ = Math.random();
    const randomColor = `rgba(${Math.floor(Math.random() * 255)}, 
                              ${Math.floor(Math.random() * 255)}, 
                              ${Math.floor(Math.random() * 255)}, 0.8)`;
    const xRange = randomZ < 0.5 ? [0, 100] : [0, 200];
    const yRange = randomZ < 0.5 ? [0, 100] : [0, 150];
    const newLayer = generateMockLayer(randomZ, randomColor, 20, xRange, yRange);
    state.layers.push(newLayer);
    render();
  }
  document.getElementById("add-layer").addEventListener("click", addLayer);

  // Initialize with three mock layers
  state.layers = [
    generateMockLayer(0.1, "rgba(255, 0, 0, 0.8)", 20, [0, 100], [0, 100]),
    generateMockLayer(0.5, "rgba(0, 255, 0, 0.8)", 20, [0, 150], [0, 150]),
    generateMockLayer(0.8, "rgba(0, 0, 255, 0.8)", 20, [0, 200], [0, 200])
  ];
  render();

  //-------------------------------------------
  // Drag & Drop Logic for Fields
  //-------------------------------------------
  // Mark each field in the left sidebar as draggable
  document.querySelectorAll('.draggable-field').forEach(field => {
    field.addEventListener('dragstart', (e) => {
      // Transfer the field's data attribute
      e.dataTransfer.setData('text/plain', field.getAttribute('data-field'));
    });
  });

  // Setup drop zones for Column and Row
  const columnDropZone = document.getElementById('column-drop-zone');
  const rowDropZone = document.getElementById('row-drop-zone');

  [columnDropZone, rowDropZone].forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');

      // Get the dragged field name
      const fieldName = e.dataTransfer.getData('text/plain');

      // Create a new element to display the field
      const newField = document.createElement('div');
      newField.className = 'axis-field';
      newField.textContent = fieldName;
      zone.appendChild(newField);
    });
  });
});
