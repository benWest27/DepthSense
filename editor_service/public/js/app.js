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
    layers: [ 
      { id: 1, z: 0.1, rowField: null, colField: null, data: [] }
    ], // Start with an empty layers array.
    currentLayerIndex: -1 // No current layer selected.
  };
  
  // Get DOM elements
  const container = document.getElementById("canvas-container");
  const dynamicCanvas = document.getElementById("dynamic-layer");
  const dataSourceSelect = document.getElementById("data-source-select");
  const fieldsContainer = document.getElementById("fields-container");
  const colDropZone = document.getElementById("column-drop-zone");
  const rowDropZone = document.getElementById("row-drop-zone");
  const layerPanel = document.getElementById("layer-panel");
  const zoomSlider = document.getElementById("zoom");
  const parallaxSlider = document.getElementById("layer-depth");
  // Global CSV data array
  let DataSource = [];
  let dataheader = [];

  const parallaxChart = require('../../services/parallaxChart.js')(state, container, dynamicCanvas, ctx);
  const editorController = require('../../controllers/editorController.js')(state, parallaxChart, container, ctx);

    /* --- Step 1: Data Source & Field Loading --- */
    function initDataSource() {
      dataSourceSelect.addEventListener("change", (e) => {
        const selected = e.target.value;
        if (selected === "csv") {
          fetchDataSource();
        } else {
          fieldsContainer.innerHTML = "";
        }
      });
    }
    initDataSource();

  dataSourceSelect.addEventListener("change", (e) => {
    const selectedSourceId = e.target.value;
    if (selectedSourceId) {
      console.log("Data source selected:", selectedSourceId);
      editorController.fetchDataForSource(selectedSourceId)
        .then(result => {
          console.log("Data fetched for source:", selectedSourceId, result.dataset);
          DataSource = result.csvRows;
          // Use editorController to create fields array.
          const fields = editorController.updateFieldsFromData(result.dataset.column_names, DataSource);
          // Optionally, render the fields into the container (you may want to update DOM accordingly)
          // ...existing code to update fieldsContainer...
          render();
          editorController.tryGenerateChartForActiveLayer(state, DataSource, parallaxChart, container, zoomSlider, currentMouseX, currentMouseY);
        })
        .catch(err => {
          console.error("Error fetching data for source:", selectedSourceId, err);
          alert("Failed to load data for the selected source.");
          DataSource = [];
          render();
          editorController.tryGenerateChartForActiveLayer(state, DataSource, parallaxChart, container, zoomSlider, currentMouseX, currentMouseY);
        });
    } else {
      console.log("No data source selected.");
      DataSource = [];
      render();
      editorController.tryGenerateChartForActiveLayer(state, DataSource, parallaxChart, container, zoomSlider, currentMouseX, currentMouseY);
    }
    // Instead of setting currentLayerIndex to -1, default to the first layer if available.
    state.currentLayerIndex = state.layers.length > 0 ? 0 : -1;
    updateLayerPanel();
    updateAxisDropZones();
  });
  
  // NEW: Add function fetchDataForSource to load dataset content by ID
  function fetchDataForSource(sourceId) {
    return fetch(`http://localhost:5003/api/datasets/${sourceId}`)
      .then(resp => {
        if (!resp.ok) throw new Error("Failed to fetch dataset " + sourceId);
        return resp.json();
      })
      .then(data => {
        console.log("Dataset fetched for source", sourceId, ":", data);
        dataheader = data.column_names;
        // Now fetch the full CSV rows by calling the new endpoint.
        return fetch(`http://localhost:5003/api/data/rows/${data.id}`)
          .then(resp => {
            if (!resp.ok) throw new Error("Failed to fetch CSV rows for dataset " + data.id);
            return resp.json();
          })
          .then(csvRows => {
            DataSource = csvRows;
            console.log("CSV rows fetched for dataset", data.id, ":", csvRows);
            updateFieldsFromData();
            render();
            return data;
          });
      })
      .catch(err => {
        console.error("fetchDataForSource:", err);
        throw err;
      });
  }

  
  function updateFieldsFromData() {
    console.log("updateFieldsFromData: Updating fields from dataheader. dataheader length:", dataheader.length);
    console.log("updateFieldsFromData: dataheader content:", dataheader);
    const fieldsContainer = document.getElementById("fields-container");
    fieldsContainer.innerHTML = "";
    if (dataheader.length > 0) {
      dataheader.forEach(field => {
        let type = "string";
        if (DataSource.length > 0 && DataSource[0][field] !== undefined) {
          const sampleValue = DataSource[0][field];
          console.log("updateFieldsFromData: Checking field", field, "with sample value:", sampleValue);
          // Require that the sample value contains "-" or ":" to consider it a date.
          if (typeof sampleValue === "string" && /[-:]/.test(sampleValue) && !isNaN(Date.parse(sampleValue))) {
            type = "date";
            console.log("updateFieldsFromData: Field", field, "is detected as a date.");
          } else if (!isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
            type = "number";
            console.log("updateFieldsFromData: Field", field, "is detected as a number.");
          }
        }
        const fieldEl = document.createElement("div");
        fieldEl.className = "draggable-field" + (type === "string" ? " draggable-string" : "");
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
  
  
  // --- Function: tryGenerateChartForActiveLayer ---
  function tryGenerateChartForActiveLayer() {
    if (state.currentLayerIndex < 0 || state.currentLayerIndex >= state.layers.length) {
      console.warn("No valid layer selected for chart generation.");
      return;
    }
    const layer = state.layers[state.currentLayerIndex];
    if (layer.colField && layer.rowField) {
      processLayerData(layer);
      generateChartImage(layer);
    }
  }

  // --- Function: processLayerData ---
  function processLayerData(layer) {
    if (DataSource.length > 0 && layer.colField && layer.rowField && layer.colField.type === "date") {
      const groups = {};
      DataSource.forEach(row => {
        // Use the field names set in the drop zones.
        const dateVal = row[layer.colField.field];
        const waitTime = parseFloat(row[layer.rowField.field]);
        const dt = new Date(dateVal);
        if (isNaN(dt)) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}`;
        groups[key] = groups[key] || { key, x: key, y: 0 };
        groups[key].y += waitTime;
      });
      // Sort the data points by the key.
      layer.data = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
    }
    console.log(`Layer ${layer.id} data updated; ${layer.data.length} items.`);
  }
  

// Draw a Chart.js bar chart using the processed data.
function generateChartImage(layer) {
  editorController.generateChartImage(layer, state, container, parallaxChart, zoomSlider, currentMouseX, currentMouseY);
}


  /* --- Step 4: Rendering into the Parallax View --- */
// function addOrUpdateLayerImage(layer) {
//   let img = document.getElementById("layer-img-" + layer.id);
//   if (!img) {
//     img = document.createElement("img");
//     img.id = "layer-img-" + layer.id;
//     img.style.position = "absolute";
//     img.style.top = 0;
//     img.style.left = 0;
//     img.style.width = "100%";
//     img.style.height = "100%";
//     container.appendChild(img);
//   }
//   img.src = layer.cachedImage;
//   // Store depth attribute for parallax (default value or later updated via control)
//   img.dataset.depth = layer.z || 0.1;
//   updateLayerImageTransform(img);
// }

/* --- Step 5: User Controls for Parallax and Interaction --- */
//function updateLayerImageTransform(img) {
//  const layerId = parseInt(img.id.replace("layer-img-", ""), 10);
//  const layer = state.layers.find(layer => layer.id === layerId);
//  const rect = container.getBoundingClientRect();
//  const offsetX = (currentMouseX - rect.width/2) * 0.05 * img.dataset.depth;
//  const offsetY = (currentMouseY - rect.height/2) * 0.05 * img.dataset.depth;
//  const zoom = parseFloat(zoomSlider.value) / layer.z;
//  console.log(`Layer ${layerId} offset: (${offsetX}, ${offsetY}) zoom:${zoom}`); // Log offsets for debugging
//  img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
//
//  // Compute effective distance from camera using depth, zoom, and layer spacing.
//  // effectiveDistance decreases as the image gets closer to the camera.
//  
//  // Define fade thresholds
//  const fadeStart = 1; // below this effective distance, alpha = 0
//  const fadeEnd = 1.5;   // above this, alpha = 1
//  let alpha;
//  if (zoom <= fadeStart) {
//    alpha = .9;
//  } else if (zoom >= fadeEnd) {
//    alpha = 0;
//  } else {
//    console.log(`(zoom - fadeStart) ${(zoom - fadeStart)} / (fadeEnd - fadeStart) ${(fadeEnd - fadeStart)}`); // Log for debugging
//    alpha = 1-((zoom - fadeStart) / (fadeEnd - fadeStart));
//  }
//  img.style.opacity = alpha;
//}

let currentMouseX = 0, currentMouseY = 0;
container.addEventListener("mousemove", (e) => {
  const rect = container.getBoundingClientRect();
  currentMouseX = e.clientX - rect.left;
  currentMouseY = e.clientY - rect.top;
  requestAnimationFrame(() => {
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
});

  // --- Function: updateAllLayerImageTransforms ---
 //function updateAllLayerImageTransforms() {
 //  state.layers.forEach(layer => {
 //    const img = document.getElementById("layer-img-" + layer.id);
 //    if (img) updateLayerImageTransform(img);
 //  });
 //}

  // New function: updateLayerDepths - adjust each layer's z property using state.layerSpacing.
  function updateLayerDepths() {
    state.layers.forEach((layer, index) => {
      // Set layer.z based on the index; adjust multiplier as needed.
      layer.z = (index + 1) * parseFloat(state.layerSpacing);
      // Update the depth attribute on the cached image if it exists.
      const img = document.getElementById("layer-img-" + layer.id);
      if (img) {
        img.dataset.depth = layer.z;
      }
    });
  }

  //fetchDataSourceList();

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
    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        let zoom = parseFloat(zoomSlider.value);
        zoom += e.deltaY * -0.001;
        zoom = Math.min(Math.max(zoom, 0.1), 3);
        zoomSlider.value = zoom;
        parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    });
  });

  document.getElementById("canvas-x").addEventListener("input", (e) => {
    state.canvasX = parseInt(e.target.value);
    console.log("canvas-x: Updated canvasX to", state.canvasX);
    updateCanvasProperties();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  document.getElementById("canvas-y").addEventListener("input", (e) => {
    state.canvasY = parseInt(e.target.value);
    console.log("canvas-y: Updated canvasY to", state.canvasY);
    updateCanvasProperties();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  document.getElementById("canvas-width").addEventListener("input", (e) => {
    state.canvasWidth = parseInt(e.target.value);
    console.log("canvas-width: Updated canvasWidth to", state.canvasWidth);
    updateCanvasProperties();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  document.getElementById("canvas-height").addEventListener("input", (e) => {
    state.canvasHeight = parseInt(e.target.value);
    console.log("canvas-height: Updated canvasHeight to", state.canvasHeight);
    updateCanvasProperties();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  document.getElementById("layer-spacing").addEventListener("input", (e) => {
    console.log("layer-spacing: Updated layerSpacing to", state.layerSpacing);
    state.layerSpacing = parseFloat(e.target.value);
    updateLayerDepths();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  // Layer Panel: handle layer tab selection and adding new layers.
  
  function updateLayerPanel() {
    // Clear all layer tabs except the add-layer button.
    const panel = document.getElementById("layer-panel");
    // Clear existing layer tabs except the "Add Layer" button.
    panel.querySelectorAll(".layer-tab").forEach(tab => tab.remove());
    state.layers.forEach((layer, index) => {
      const tab = document.createElement("div");
      tab.className = "layer-tab";
      
      if (index === state.currentLayerIndex) { 
        tab.classList.add("selected"); 
        console.log("Selected layer:", layer.id); // Added log for layer selection
      }
      tab.textContent = `Layer ${index+1}`;
      tab.dataset.layerIndex = index;
      tab.addEventListener("click", () => {
        state.currentLayerIndex = index;
        console.log("Selected layer:", state.layers[index].id); // Log when a layer is selected
        updateAxisDropZones();
      });
      panel.insertBefore(tab, document.getElementById("add-layer"));
    });
  }


  function updateAxisDropZones() {
    if (state.currentLayerIndex < 0 || state.currentLayerIndex >= state.layers.length) {
      console.warn("No valid layer selected for axis drop zones.");
      return;
    }
    const layer = state.layers[state.currentLayerIndex];
    const colDropZone = document.getElementById("column-drop-zone");
    const rowDropZone = document.getElementById("row-drop-zone");
    colDropZone.innerHTML = "";
    rowDropZone.innerHTML = "";
    if (layer.colField) {
      const el = document.createElement("div");
      el.className = "axis-field";
      el.textContent = layer.colField.field;
      colDropZone.appendChild(el);
    }
    if (layer.rowField) {
      const el = document.createElement("div");
      el.className = "axis-field";
      el.textContent = layer.rowField.field;
      rowDropZone.appendChild(el);
    }
  }

   // "Add Layer" button: Create a new layer in state and update UI.
   document.getElementById("add-layer").addEventListener("click", () => {
    const newId = state.layers.length + 1;
    const newLayer = { id: newId, z: newId * 0.1, rowField: null, colField: null, data: [] };
    state.layers.push(newLayer);
    state.currentLayerIndex = state.layers.length - 1;
    updateLayerPanel();
    updateAxisDropZones();
  });


  // Drop zones: each drop zone updates the current layer's mapping.
  const columnDropZone = document.getElementById("column-drop-zone");

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
    // Guard: Ensure a current layer exists.
    if (state.currentLayerIndex < 0 || !state.layers[state.currentLayerIndex]) {
      console.error("No current layer defined to map column field.");
      return;
    }
    state.layers[state.currentLayerIndex].colField = { field: data.field, type: data.type };
    updateAxisDropZones();
    render();
  });

  rowDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    rowDropZone.classList.remove('dragover');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log("drop: Field", data.field, "with type", data.type, "dropped into row-drop-zone");
    // Guard: Ensure a current layer exists.
    if (state.currentLayerIndex < 0 || !state.layers[state.currentLayerIndex]) {
      console.error("No current layer defined to map row field.");
      return;
    }
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


  function render() {
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    setTimeout(() => {
      editorController.processLayerData(state.layers[0], DataSource);
      editorController.generateChartImage(state.layers[0], state, container, parallaxChart, zoomSlider, currentMouseX, currentMouseY);
      render();
    }, 3000);
  } 

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