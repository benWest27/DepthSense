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
    layerSpacing: 20,
    layers: [
      // Use generateMockLayer to create fallback data and assign z = 0.1
      generateMockLayer(0.1, "rgba(255, 0, 0, 0.8)", 20, [0, 100], [0, 100])
    ],
    currentLayerIndex: 0
  };
  
  // Global CSV data array
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
        render();
      })
      .catch(error => console.error("fetchMockData: Error fetching mock data:", error));
  }
  
  // Update the Fields container by detecting each field's type using the first row.
  function updateDataFields() {
    console.log("updateDataFields: Updating fields based on CSV data.");
    const fieldsContainer = document.getElementById('fields-container');
    fieldsContainer.innerHTML = "";
    if (mockDataSource.length > 0) {
      const firstRow = mockDataSource[0];
      Object.keys(firstRow).forEach(field => {
        let value = firstRow[field].trim();
        let type = "string";
        if (!isNaN(parseFloat(value)) && isFinite(value)) {
          type = "number";
        } else if (!isNaN(Date.parse(value)) && /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}$/.test(value)) {
          type = "date";
        }
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'draggable-field';
        fieldDiv.setAttribute('draggable', 'true');
        fieldDiv.setAttribute('data-field', field);
        fieldDiv.setAttribute('data-type', type);
        fieldDiv.innerHTML = `${field} <span class="field-type">${type}</span>`;
        fieldsContainer.appendChild(fieldDiv);
        console.log(`updateDataFields: Added field '${field}' as draggable with type ${type}.`);
        fieldDiv.addEventListener('dragstart', (e) => {
          console.log(`dragstart: Field '${field}' is being dragged.`);
          e.dataTransfer.setData('text/plain', JSON.stringify({ field, type }));
        });
      });
    } else {
      console.log("updateDataFields: No data available to extract fields.");
    }
  }

  // Listen to data source selection changes.
  const dataSourceSelect = document.getElementById("data-source-select");
  dataSourceSelect.addEventListener("change", (e) => {
    const selectedSource = e.target.value;
    console.log("Data Source selected:", selectedSource);
    if (selectedSource === "csv") {
      fetchMockData();
    } else {
      document.getElementById('fields-container').innerHTML = "";
      console.log("Data Source cleared, no valid source selected.");
    }
  });

  // Update canvas properties.
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
    render();
  });

  // Input controls (focal, zoom, marker size, etc.)
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

  document.getElementById("layer-depth").addEventListener("input", (e) => {
    state.layerOffset = parseFloat(e.target.value);
    console.log("layer-depth: Updated layerOffset to", state.layerOffset);
    render();
  });
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
  document.getElementById("layer-spacing").addEventListener("input", (e) => {
    state.layerSpacing = parseInt(e.target.value);
    console.log("layer-spacing: Updated layerSpacing to", state.layerSpacing);
    render();
  });

  // Layer Panel: handle layer tab selection and adding new layers.
  const layerPanel = document.getElementById("layer-panel");
  function updateLayerPanel() {
    // Clear all layer tabs except the add-layer button.
    const tabs = layerPanel.querySelectorAll(".layer-tab");
    tabs.forEach(tab => tab.remove());
    // Create a tab for each layer.
    state.layers.forEach((layer, index) => {
      const tab = document.createElement("div");
      tab.className = "layer-tab";
      if (index === state.currentLayerIndex) tab.classList.add("selected");
      tab.textContent = `Layer ${layer.id}`;
      tab.dataset.layerIndex = index;
      tab.addEventListener("click", () => {
        state.currentLayerIndex = index;
        updateAxisDropZones();
        updateLayerPanel();
        render();
      });
      layerPanel.insertBefore(tab, document.getElementById("add-layer"));
    });
  }
  updateLayerPanel();

  document.getElementById("add-layer").addEventListener("click", () => {
    const newId = state.layers.length + 1;
    // Set the new z value as newId * 0.1 (first layer: 0.1, second: 0.2, etc.)
    const newZ = newId * 0.1;
    const randomColor = `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},0.8)`;
    
    // Create the new layer using the generateMockLayer function,
    // which now returns an object that includes a defined z value.
    const newLayer = generateMockLayer(newZ, randomColor, 20, [0, 100], [0, 100]);
    // Initialize CSV mapping as null for now.
    newLayer.rowField = null;
    newLayer.colField = null;
    
    state.layers.push(newLayer);
    state.currentLayerIndex = state.layers.length - 1;
    updateLayerPanel();
    updateAxisDropZones();
    render();
  });
  


  // Update axis drop zones to reflect the mapping for the current layer.
  function updateAxisDropZones() {
    const currentLayer = state.layers[state.currentLayerIndex];
    const colDropZone = document.getElementById("column-drop-zone");
    const rowDropZone = document.getElementById("row-drop-zone");
    colDropZone.innerHTML = "";
    rowDropZone.innerHTML = "";
    if (currentLayer.colField) {
      const div = document.createElement("div");
      div.className = "axis-field";
      div.textContent = currentLayer.colField.field;
      colDropZone.appendChild(div);
    }
    if (currentLayer.rowField) {
      const div = document.createElement("div");
      div.className = "axis-field";
      div.textContent = currentLayer.rowField.field;
      rowDropZone.appendChild(div);
    }
  }

  // Drop zones: each drop zone updates the current layer's mapping.
  const columnDropZone = document.getElementById("column-drop-zone");
  const rowDropZone = document.getElementById("row-drop-zone");

  [columnDropZone, rowDropZone].forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
  });

  columnDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    columnDropZone.classList.remove('dragover');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log("drop: Field", data.field, "with type", data.type, "dropped into column-drop-zone");
    state.layers[state.currentLayerIndex].colField = { field: data.field, type: data.type };
    updateAxisDropZones();
    render();
  });

  rowDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    rowDropZone.classList.remove('dragover');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log("drop: Field", data.field, "with type", data.type, "dropped into row-drop-zone");
    state.layers[state.currentLayerIndex].rowField = { field: data.field, type: data.type };
    updateAxisDropZones();
    render();
  });

// Draw axes (with tickers) for a specific layer
function drawLayerAxes(layer) {
  console.log("drawLayerAxes: Drawing axes for layer", layer.id, "with z =", layer.z);
  const margin = 40;
  ctx.save();
  ctx.strokeStyle = "#333";
  ctx.fillStyle = "#333";
  ctx.lineWidth = 1;

  // --- Horizontal Axis ---
  const xAxisY = canvas.height - margin;
  console.log("drawLayerAxes: Calculated xAxisY =", xAxisY);
  ctx.beginPath();
  ctx.moveTo(margin, xAxisY);
  ctx.lineTo(canvas.width - margin, xAxisY);
  ctx.stroke();
  console.log("drawLayerAxes: Drew horizontal axis from x =", margin, "to", canvas.width - margin);

  const tickCount = 10;
  const tickSpacing = (canvas.width - 2 * margin) / tickCount;
  console.log("drawLayerAxes: Calculated tickSpacing =", tickSpacing);
  const xRange = layer.xAxisRange;
  console.log("drawLayerAxes: xAxisRange =", xRange);
  const xValueStep = (xRange[1] - xRange[0]) / tickCount;
  console.log("drawLayerAxes: xValueStep =", xValueStep);

  for (let i = 0; i <= tickCount; i++) {
    const x = margin + i * tickSpacing;
    console.log("drawLayerAxes: Horizontal tick", i, "at x =", x);
    ctx.beginPath();
    ctx.moveTo(x, xAxisY);
    ctx.lineTo(x, xAxisY + 5);
    ctx.stroke();
    const tickValue = xRange[0] + i * xValueStep;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tickValue.toFixed(0), x, xAxisY + 15);
    console.log("drawLayerAxes: Horizontal tick", i, "label =", tickValue.toFixed(0));
  }

  // --- Vertical Axis ---
  const yAxisX = margin;
  console.log("drawLayerAxes: Calculated yAxisX =", yAxisX);
  ctx.beginPath();
  ctx.moveTo(yAxisX, margin);
  ctx.lineTo(yAxisX, canvas.height - margin);
  ctx.stroke();
  console.log("drawLayerAxes: Drew vertical axis from y =", margin, "to", canvas.height - margin);

  const yTickSpacing = (canvas.height - 2 * margin) / tickCount;
  console.log("drawLayerAxes: Calculated yTickSpacing =", yTickSpacing);
  const yRange = layer.yAxisRange;
  console.log("drawLayerAxes: yAxisRange =", yRange);
  const yValueStep = (yRange[1] - yRange[0]) / tickCount;
  console.log("drawLayerAxes: yValueStep =", yValueStep);

  for (let i = 0; i <= tickCount; i++) {
    const y = canvas.height - margin - i * yTickSpacing;
    console.log("drawLayerAxes: Vertical tick", i, "at y =", y);
    ctx.beginPath();
    ctx.moveTo(yAxisX, y);
    ctx.lineTo(yAxisX - 5, y);
    ctx.stroke();
    const tickValue = yRange[0] + i * yValueStep;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tickValue.toFixed(0), yAxisX - 7, y + 3);
    console.log("drawLayerAxes: Vertical tick", i, "label =", tickValue.toFixed(0));
  }

  ctx.restore();
}

  // Render layers with parallax + zoom (draw farthest layers first)
  function render() {
    console.log("render: Rendering layers with state:", state);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const currentLayer = state.layers[state.currentLayerIndex];
    if (currentLayer.rowField && currentLayer.colField && mockDataSource.length > 0) {
      console.log("render: Using CSV mapping for current layer:", currentLayer);
      const isRowDate = currentLayer.rowField.type === "date";
      const isColDate = currentLayer.colField.type === "date";
      const distinctMarks = {};
      mockDataSource.forEach(row => {
        let rowVal = isRowDate
          ? Date.parse(row[currentLayer.rowField.field])
          : parseFloat(row[currentLayer.rowField.field]);
        let colVal = isColDate
          ? Date.parse(row[currentLayer.colField.field])
          : parseFloat(row[currentLayer.colField.field]);
        if (!isNaN(rowVal) && !isNaN(colVal)) {
          const key = `${rowVal}-${colVal}`;
          if (!distinctMarks[key]) {
            distinctMarks[key] = { rowVal, colVal };
          }
        }
      });
      const marks = Object.values(distinctMarks);
      console.log("render: Number of distinct marks =", marks.length);
      if (marks.length === 0) {
        console.log("render: No distinct marks found.");
        return;
      }
      
      // Calculate axis ranges from marks.
      const rowValues = marks.map(m => m.rowVal);
      const colValues = marks.map(m => m.colVal);
      const rowMinVal = Math.min(...rowValues);
      const rowMaxVal = Math.max(...rowValues);
      const colMinVal = Math.min(...colValues);
      const colMaxVal = Math.max(...colValues);
      console.log("render: Computed axis ranges:", { rowMinVal, rowMaxVal, colMinVal, colMaxVal });
      
      // Store computed ranges in the current layer.
      currentLayer.xAxisRange = [rowMinVal, rowMaxVal];
      currentLayer.yAxisRange = [colMinVal, colMaxVal];
      
      // Compute parallax transform for the current layer.
      let effectiveZ = currentLayer.z - state.layerOffset;
      if (effectiveZ < 0) effectiveZ = 0;
      const perspective = 1 / (1 + effectiveZ);
      const parallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - perspective);
      const parallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - perspective);
      console.log("render: Current layer effectiveZ =", effectiveZ, "perspective =", perspective);
      console.log("render: Current layer parallax offset: X =", parallaxX, "Y =", parallaxY);
      
      // Draw axes for the current layer using its parallax transform.
      ctx.save();
      ctx.translate(parallaxX, parallaxY);
      drawLayerAxes(currentLayer);
      ctx.restore();
      
      // Draw marks for each layer.
      state.layers.forEach(layer => {
        let layerEffectiveZ = layer.z - state.layerOffset;
        if (layerEffectiveZ < 0) layerEffectiveZ = 0;
        const layerPerspective = 1 / (1 + layerEffectiveZ);
        const layerParallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - layerPerspective);
        const layerParallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - layerPerspective);
        
        console.log(`render: Layer ${layer.id} effectiveZ = ${layerEffectiveZ}, perspective = ${layerPerspective}`);
        console.log(`render: Layer ${layer.id} parallax offset: X = ${layerParallaxX}, Y = ${layerParallaxY}`);
        
        ctx.save();
        ctx.translate(layerParallaxX, layerParallaxY);
        // Use axis ranges stored in the layer; if not present, fallback to current layer's.
        const xRange = layer.xAxisRange || [rowMinVal, rowMaxVal];
        const yRange = layer.yAxisRange || [colMinVal, colMaxVal];
        
        marks.forEach(mark => {
          // Formula: 
          // x_pixel = ((mark_value - min_value) / (max_value - min_value)) * (canvas.width - 80) + 40
          const x = ((mark.rowVal - xRange[0]) / (xRange[1] - xRange[0])) * (canvas.width - 80) + 40;
          // y_pixel = ((mark_value - min_value) / (max_value - min_value)) * (canvas.height - 80) + 40 + layer vertical offset
          const y = ((mark.colVal - yRange[0]) / (yRange[1] - yRange[0])) * (canvas.height - 80) + 40 + (layer.id - 1) * state.layerSpacing;
          ctx.beginPath();
          ctx.arc(x, y, state.markerSize, 0, Math.PI * 2);
          ctx.fillStyle = layer.color;
          ctx.fill();
          console.log(`render: Layer ${layer.id} mark at data (rowVal: ${mark.rowVal}, colVal: ${mark.colVal}) -> pixel (x: ${x.toFixed(2)}, y: ${y.toFixed(2)})`);
        });
        // Draw this layer's axes.
        drawLayerAxes(layer);
        ctx.restore();
      });
      
    } else {
      console.log("render: No CSV mapping exists; using fallback generated data.");
      // Fallback: Render each layer using generated data.
      state.layers.sort((a, b) => (b.z - state.layerOffset) - (a.z - state.layerOffset));
      state.layers.forEach(layer => {
        if (!layer.data || !Array.isArray(layer.data)) {
          console.log(`render: Layer ${layer.id} has no data; generating fallback data.`);
          const fallback = generateMockLayer(layer.z, layer.color, 20, [0, 100], [0, 100]);
          layer.data = fallback.data;
          layer.xAxisRange = fallback.xAxisRange;
          layer.yAxisRange = fallback.yAxisRange;
        }
        let effectiveZ = layer.z - state.layerOffset;
        if (effectiveZ < 0) effectiveZ = 0;
        const perspective = 1 / (1 + effectiveZ);
        const parallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - perspective);
        const parallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - perspective);
        console.log(`render (fallback): Layer ${layer.id} effectiveZ = ${effectiveZ}, perspective = ${perspective}`);
        ctx.save();
        ctx.translate(parallaxX, parallaxY);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(state.zoom * perspective, state.zoom * perspective);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        layer.data.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, state.markerSize, 0, Math.PI * 2);
          ctx.fillStyle = layer.color;
          ctx.fill();
        });
        drawLayerAxes(layer);
        ctx.restore();
      });
    }
  }
  
    // Render layers with parallax + zoom (draw farthest layers first)
//   function render() {
//     console.log("render: Rendering layers...");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     // Sort layers so that layers with higher effective z (further away) are drawn first
//     state.layers.sort((a, b) => (b.z - state.layerOffset) - (a.z - state.layerOffset));
// 
//     state.layers.forEach(layer => {
//       let effectiveZ = layer.z - state.layerOffset;
//       if (effectiveZ < 0) effectiveZ = 0;
//       const perspective = 1 / (1 + effectiveZ);
// 
//       const parallaxX = (state.focalPoint.x - 0.5) * canvas.width * (1 - perspective);
//       const parallaxY = (state.focalPoint.y - 0.5) * canvas.height * (1 - perspective);
// 
//       ctx.save();
//       ctx.translate(parallaxX, parallaxY);
//       // Zoom transformation centered on canvas
//       ctx.translate(canvas.width / 2, canvas.height / 2);
//       ctx.scale(state.zoom * perspective, state.zoom * perspective);
//       ctx.translate(-canvas.width / 2, -canvas.height / 2);
// 
//       // Draw data points for the layer
//       layer.data.forEach(point => {
//         ctx.beginPath();
//         ctx.arc(
//           point.x * canvas.width,
//           point.y * canvas.height,
//           state.markerSize,
//           0,
//           Math.PI * 2
//         );
//         ctx.fillStyle = layer.color;
//         ctx.fill();
//       });
// 
//       // Draw axes for the layer
//       drawLayerAxes(layer);
// 
//       ctx.restore();
//     });
//   }

function generateMockLayer(z, color, numPoints, xRange, yRange) {
  console.log("generateMockLayer: Generating fallback layer with z =", z);
  const data = [];
  for (let i = 0; i < numPoints; i++) {
    const x = i / (numPoints - 1);
    const y = 0.5 + 0.4 * Math.sin(x * Math.PI * 2) + (Math.random() - 0.5) * 0.1;
    data.push({ x, y });
  }
  return { 
    id: state.layers ? state.layers.length + 1 : 1, // if needed
    z: z, 
    color: color,
    data: data,
    xAxisRange: xRange || [0, 100],
    yAxisRange: yRange || [0, 100]
  };
}


  // Initialize with three mock layers
  state.layers = [
    generateMockLayer(0.1, "rgba(255, 0, 0, 0.8)", 20, [0, 100], [0, 100]),
    generateMockLayer(0.5, "rgba(0, 255, 0, 0.8)", 20, [0, 150], [0, 150]),
    generateMockLayer(0.8, "rgba(0, 0, 255, 0.8)", 20, [0, 200], [0, 200])
  ];
  render();


  // Setup drag & drop for any preexisting draggable fields.
  console.log("Setting up drag and drop for fields...");
  document.querySelectorAll('.draggable-field').forEach(field => {
    field.addEventListener('dragstart', (e) => {
      console.log("dragstart: Field", field.getAttribute('data-field'), "is being dragged.");
      e.dataTransfer.setData('text/plain', JSON.stringify({ 
        field: field.getAttribute('data-field'), 
        type: field.getAttribute('data-type') 
      }));
    });
  });

  

});
