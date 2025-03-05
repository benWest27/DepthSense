document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded: Editor service is starting.");

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

  // Variable to hold the fetched CSV data
  let mockDataSource = [];

  
  // Fetch CSV mock data from data service endpoint
  function fetchMockData() {
    console.log("fetchMockData: Fetching CSV data from http://localhost:5003/api/data/mock...");
    fetch('http://localhost:5003/api/data/mock')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        console.log("fetchMockData: Response OK, parsing JSON.");
        return response.json();
      })
      .then(data => {
        console.log("fetchMockData: Data received:", data);
        mockDataSource = data;
        updateDataFields();
      })
      .catch(error => console.error("fetchMockData: Error fetching mock data:", error));
  }
  
  // Update the Fields container with CSV field names
  function updateDataFields() {
    console.log("updateDataFields: Updating fields based on CSV data.");
    if (mockDataSource.length > 0) {
      const fieldNames = Object.keys(mockDataSource[0]);
      console.log("updateDataFields: Available Fields:", fieldNames);
      const fieldsContainer = document.getElementById('fields-container');
      fieldsContainer.innerHTML = ""; // Clear existing fields
      fieldNames.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'draggable-field';
        fieldDiv.setAttribute('draggable', 'true');
        fieldDiv.setAttribute('data-field', field);
        fieldDiv.innerHTML = `${field} <span class="field-type">string</span>`;
        fieldsContainer.appendChild(fieldDiv);

        // Debug log
        console.log(`updateDataFields: Added field '${field}' as draggable.`);

        // Setup drag event for this field
        fieldDiv.addEventListener('dragstart', (e) => {
          console.log(`dragstart: Field '${field}' is being dragged.`);
          e.dataTransfer.setData('text/plain', fieldDiv.getAttribute('data-field'));
        });
      });
    } else {
      console.log("updateDataFields: No data available to extract fields.");
    }
  }

  // Listen to data source selection changes
  const dataSourceSelect = document.getElementById("data-source-select");
  dataSourceSelect.addEventListener("change", (e) => {
    const selectedSource = e.target.value;
    console.log("Data Source selected:", selectedSource);
    if (selectedSource === "csv") {
      // When CSV is selected, fetch the CSV data and update the fields container
      fetchMockData();
    } else {
      // If another data source is selected (or cleared), empty the fields container
      document.getElementById('fields-container').innerHTML = "";
      console.log("Data Source cleared, no valid source selected.");
    }
  });
  // Update canvas CSS properties and dimensions.
  function updateCanvasProperties() {
    console.log("updateCanvasProperties: Updating canvas dimensions.");
    canvas.style.left = state.canvasX + "px";
    canvas.style.top = state.canvasY + "px";
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
  }
  updateCanvasProperties();
  window.addEventListener("resize", () => {
    console.log("resize: Window resized, updating canvas.");
    updateCanvasProperties();
  });

  // Input Controls for focal point, zoom, marker size
  document.getElementById("horizontal-focal").addEventListener("input", (e) => {
    if (state.sliderFocal) {
      state.focalPoint.x = e.target.value / 100;
      console.log("horizontal-focal: Updated focalPoint.x to", state.focalPoint.x);
      render();
    }
  });
  document.getElementById("vertical-focal").addEventListener("input", (e) => {
    if (state.sliderFocal) {
      state.focalPoint.y = e.target.value / 100;
      console.log("vertical-focal: Updated focalPoint.y to", state.focalPoint.y);
      render();
    }
  });
  document.getElementById("zoom").addEventListener("input", (e) => {
    state.zoom = parseFloat(e.target.value);
    console.log("zoom: Updated zoom to", state.zoom);
    render();
  });
  document.getElementById("marker-size").addEventListener("input", (e) => {
    state.markerSize = parseInt(e.target.value);
    console.log("marker-size: Updated markerSize to", state.markerSize);
    render();
  });
  document.getElementById("toggle-mouse-control").addEventListener("click", () => {
    state.mouseControl = !state.mouseControl;
    console.log("toggle-mouse-control: mouseControl is now", state.mouseControl);
  });
  document.getElementById("toggle-focal-mode").addEventListener("click", () => {
    state.sliderFocal = !state.sliderFocal;
    console.log("toggle-focal-mode: sliderFocal is now", state.sliderFocal);
  });
  canvas.addEventListener("mousemove", (e) => {
    if (state.mouseControl && !state.sliderFocal) {
      state.focalPoint.x = e.offsetX / canvas.width;
      state.focalPoint.y = e.offsetY / canvas.height;
      console.log("mousemove: Updated focalPoint to", state.focalPoint);
      render();
    }
  });

  // Layer depth control
  document.getElementById("layer-depth").addEventListener("input", (e) => {
    state.layerOffset = parseFloat(e.target.value);
    console.log("layer-depth: Updated layerOffset to", state.layerOffset);
    render();
  });

  // Canvas positioning & size controls
  document.getElementById("canvas-x").addEventListener("input", (e) => {
    state.canvasX = parseInt(e.target.value);
    console.log("canvas-x: Updated canvasX to", state.canvasX);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-y").addEventListener("input", (e) => {
    state.canvasY = parseInt(e.target.value);
    console.log("canvas-y: Updated canvasY to", state.canvasY);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-width").addEventListener("input", (e) => {
    state.canvasWidth = parseInt(e.target.value);
    console.log("canvas-width: Updated canvasWidth to", state.canvasWidth);
    updateCanvasProperties();
    render();
  });
  document.getElementById("canvas-height").addEventListener("input", (e) => {
    state.canvasHeight = parseInt(e.target.value);
    console.log("canvas-height: Updated canvasHeight to", state.canvasHeight);
    updateCanvasProperties();
    render();
  });

  // Generate a mock layer with data
  function generateMockLayer(z, color, numPoints, xRange, yRange) {
    console.log("generateMockLayer: Generating layer with z =", z);
    const data = [];
    for (let i = 0; i < numPoints; i++) {
      const x = i / (numPoints - 1);
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
    console.log("drawLayerAxes: Drawing axes for layer with z =", layer.z);
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

  // Render layers with parallax + zoom (draw farthest layers first)
  function render() {
    console.log("render: Rendering layers...");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sort layers so that layers with higher effective z (further away) are drawn first
    state.layers.sort((a, b) => (b.z - state.layerOffset) - (a.z - state.layerOffset));

    state.layers.forEach(layer => {
      let effectiveZ = layer.z - state.layerOffset;
      if (effectiveZ < 0) effectiveZ = 0;
      const perspective = 1 / (1 + effectiveZ);

      const parallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - perspective);
      const parallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - perspective);

      ctx.save();
      ctx.translate(parallaxX, parallaxY);
      // Zoom transformation centered on canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(state.zoom * perspective, state.zoom * perspective);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw data points for the layer
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

      // Draw axes for the layer
      drawLayerAxes(layer);

      ctx.restore();
    });
  }

  // Add a new layer with random properties
  function addLayer() {
    console.log("addLayer: Adding new layer...");
    const randomZ = Math.random();
    const randomColor = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.8)`;
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
  console.log("Setting up drag and drop for fields...");
  // Ensure all current draggable fields have dragstart events
  document.querySelectorAll('.draggable-field').forEach(field => {
    field.addEventListener('dragstart', (e) => {
      console.log("dragstart: Field", field.getAttribute('data-field'), "is being dragged.");
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

      const fieldName = e.dataTransfer.getData('text/plain');
      console.log("drop: Field", fieldName, "dropped into", zone.id);

      const newField = document.createElement('div');
      newField.className = 'axis-field';
      newField.textContent = fieldName;
      zone.appendChild(newField);
    });
  });
});
