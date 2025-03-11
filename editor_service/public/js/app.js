document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded: Editor service is starting.");

  const canvas = document.getElementById("dynamic-layer");
  const ctx = canvas.getContext("2d");
  // INITIAL STATE: No layers are created until Test is clicked.
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
    layers: [], // Start with an empty layers array.
    currentLayerIndex: -1 // No current layer selected.
  };
  
  // Global CSV data array
  let DataSource = [];

  // NEW: Add function fetchDataForSource to load dataset content by ID
  function fetchDataForSource(sourceId) {
    fetch(`http://localhost:5003/api/datasets/${sourceId}`)
      .then(resp => {
        if (!resp.ok) throw new Error("Failed to fetch dataset " + sourceId);
        return resp.json();
      })
      .then(data => {
        // Assume the returned data is an array of CSV rows.
        DataSource = data;
        updateFieldsFromData();
        render();
      })
      .catch(err => console.error("fetchDataForSource:", err));
  }

  // NEW: Helper function to populate the fields container from DataSource
  function updateFieldsFromData() {
    const fieldsContainer = document.getElementById("fields-container");
    fieldsContainer.innerHTML = "";
    if (DataSource.length > 0) {
      const sampleRow = DataSource[0];
      Object.keys(sampleRow).forEach(field => {
        let value = sampleRow[field].trim();
        let type = "string";
        if (!isNaN(parseFloat(value)) && isFinite(value)) {
          type = "number";
        } else if (!isNaN(Date.parse(value))) {
          type = "date";
        }
        const fieldEl = document.createElement("div");
        fieldEl.className = "draggable-field";
        fieldEl.setAttribute("draggable", "true");
        fieldEl.setAttribute("data-field", field);
        fieldEl.setAttribute("data-type", type);
        fieldEl.innerHTML = `${field} <span class="field-type">${type}</span>`;
        fieldsContainer.appendChild(fieldEl);
        fieldEl.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({ field, type }));
        });
      });
    }
  }

    // ---------------------------
  // Function: generateMockLayer
  // Returns an object representing a layer, with fallback data, axis ranges, and a defined z value.
  function generateMockLayer(id, z, color, numPoints, xRange, yRange) {
    console.log("generateMockLayer: Generating fallback layer with id =", id, "z =", z);
    const data = [];
    for (let i = 0; i < numPoints; i++) {
      const x = i / (numPoints - 1);
      const y = 0.5 + 0.4 * Math.sin(x * Math.PI * 2) + (Math.random() - 0.5) * 0.1;
      data.push({ x, y });
    }
    return {
      id: id,
      z: z,
      color: color,
      data: data,
      xAxisRange: xRange || [0, 100],
      yAxisRange: yRange || [0, 100],
      rowField: null, // to be set when a field is dropped
      colField: null  // to be set when a field is dropped
    };
  }

  // Data Source selection changes.
  const dataSourceSelect = document.getElementById("data-source-select");
  dataSourceSelect.addEventListener("change", (e) => {
    const selectedSource = e.target.value;
    console.log("Data Source selected:", selectedSource);
    if (selectedSource) {
      fetchDataForSource(selectedSource);
    } else {
      fieldsContainer.innerHTML = "";
    }
  });

  // NEW: Modified fetchDataSourceList to optionally select a new source if provided.
  function fetchDataSourceList(newSourceId) {
    fetch("http://localhost:5003/api/datasets")
      .then(resp => { 
        if (!resp.ok) throw new Error("Failed to fetch data source list");
        return resp.json();
      })
      .then(sources => {
        dataSourceSelect.innerHTML = '<option value="">Select Data Source</option>';
        sources.forEach(source => {
          const option = document.createElement("option");
          option.value = source.id;
          option.textContent = source.name;
          dataSourceSelect.appendChild(option);
        });
        if (newSourceId) {
          dataSourceSelect.value = newSourceId;
          dataSourceSelect.dispatchEvent(new Event('change'));
        }
      })
      .catch(err => console.error(err));
  }

  // In initUploadButton, pass the newly uploaded source id to fetchDataSourceList.
  function initUploadButton() {
    const uploadButton = document.getElementById("upload");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    uploadButton.addEventListener("click", () => {
      fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("csvfile", file);
        fetch("http://localhost:5003/api/data/upload", {
          method: "POST",
          body: formData
        })
          .then(resp => {
            if (!resp.ok) throw new Error("Upload failed");
            return resp.json();
          })
          .then(result => {
            console.log("Upload successful:", result);
            // Assume the result contains newSourceId property for the uploaded dataset.
            fetchDataSourceList(result.sourceId);
          })
          .catch(err => console.error(err));
      }
    });
  }

  // NEW: Function to handle CSV file upload through the "Upload" button
  function initCSVUpload() {
    const uploadButton = document.getElementById("upload");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  
    uploadButton.addEventListener("click", () => {
      fileInput.click();
    });
  
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        const formData = new FormData();
        formData.append("csvfile", file);
        fetch("http://localhost:5003/api/data/upload", {
          method: "POST",
          body: formData,
        })
          .then(resp => {
            if (!resp.ok) throw new Error("Upload failed");
            return resp.json();
          })
          .then(result => {
            console.log("CSV file uploaded successfully:", result);
          })
          .catch(err => console.error("CSV upload error:", err));
      }
    });
  }
  
  // Call the CSV upload initialization function
  initCSVUpload();

  // NEW: Add event listener for "Add Data Source" button to refresh the data source list.
  const addDataSourceButton = document.getElementById("add-data-source");
  addDataSourceButton.addEventListener("click", () => {
    fetchDataSourceList(); // Refresh and populate the data source dropdown
    console.log("Data source list refreshed.");
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
      tab.textContent = `Layer ${index}`;
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
  
// ---------------------------
  // Test Button: When clicked, generate a set of mock layers.
  // All fallback/mock data is hidden until this button is clicked.
  document.getElementById("test").addEventListener("click", () => {
    console.log("Test button clicked: Generating test layers.");
    // Generate, for example, three test layers with sequential z values.
    state.layers = [
      generateMockLayer(0.1, "rgba(255, 0, 0, 0.8)", 20, [0, 100], [0, 100]),
      generateMockLayer(0.2, "rgba(0, 255, 0, 0.8)", 20, [0, 150], [0, 150]),
      generateMockLayer(0.3, "rgba(0, 0, 255, 0.8)", 20, [0, 200], [0, 200])
    ];
    state.currentLayerIndex = 0;
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

  // Draw axes (with tickers) for a specific layer.
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

  // Render layers with parallax + zoom.
  // The algorithm:
  // 1. If CSV mapping exists for the current layer and CSV data is loaded, build distinct marks,
  //    compute axis ranges, and store them in the current layer.
  // 2. Compute parallax transform for each layer using:
  //    effectiveZ = layer.z - state.layerOffset
  //    perspective = 1 / (1 + effectiveZ)
  //    parallaxX = (focalPoint.x - 0.5) * canvas.width * (1 - perspective)
  //    parallaxY = (focalPoint.y - 0.5) * canvas.height * (1 - perspective)
  // 3. Draw each layer's axes and data marks using the calculated transforms.
  // 4. Only layers that have data (or CSV mapping) are rendered.
  function render() {
    console.log("render: Rendering layers with state:", state);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentLayer = state.layers[state.currentLayerIndex];
    if (currentLayer && currentLayer.rowField && currentLayer.colField && DataSource.length > 0) {
      console.log("render: Using CSV mapping for current layer:", currentLayer);
      const isRowDate = currentLayer.rowField.type === "date";
      const isColDate = currentLayer.colField.type === "date";
      const distinctMarks = {};
      DataSource.forEach(row => {
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
      console.log("render: Computed CSV axis ranges:", { rowMinVal, rowMaxVal, colMinVal, colMaxVal });

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

      // Draw axes for the current layer.
      ctx.save();
      ctx.translate(parallaxX, parallaxY);
      drawLayerAxes(currentLayer);
      ctx.restore();

      // Draw marks for each layer that has a CSV mapping.
      state.layers.forEach(layer => {
        if (!layer.rowField || !layer.colField) {
          console.log(`render: Skipping Layer ${layer.id} (no CSV mapping).`);
          return;
        }
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
          // For the x position (row axis):
          const rowRange = xRange[1] - xRange[0];
          const safeRowRange = rowRange === 0 ? 1 : rowRange;
          const x = ((mark.rowVal - xRange[0]) / safeRowRange) * (canvas.width - 80) + 40;
        
          // For the y position (column axis):
          const colRange = yRange[1] - yRange[0];
          const safeColRange = colRange === 0 ? 1 : colRange;
          const y = ((mark.colVal - yRange[0]) / safeColRange) * (canvas.height - 80) + 40 + (layer.id - 1) * state.layerSpacing;
          
          ctx.beginPath();
          ctx.arc(x, y, state.markerSize, 0, Math.PI * 2);
          ctx.fillStyle = layer.color;
          ctx.fill();
          console.log(`render: Layer ${layer.id} mark: data (rowVal: ${mark.rowVal}, colVal: ${mark.colVal}) -> pixel (x: ${x.toFixed(2)}, y: ${y.toFixed(2)})`);
        });
        // Draw this layer's axes.
        drawLayerAxes(layer);
        ctx.restore();
      });

    } else {
      console.log("render: No CSV mapping exists for current layer; skipping CSV rendering.");
    }
    console.log("render: END");
  }
    
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
