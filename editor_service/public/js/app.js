document.addEventListener("DOMContentLoaded", () => {

  /* --- Step 0: INITIAL STATE & ELEMENT SELECTION --- */
  let state = {
    focalPoint: { x: 0.5, y: 0.5 },
    zoom: 1,
    markerSize: 5,
    mouseControl: false,
    sliderFocal: true,
    layerOffset: 0,
    canvasWidth: 600,
    canvasHeight: 600,
    layerSpacing: 20,
    layers: [ 
      { id: 1, z: 0.1, rowField: null, colField: null, data: [] }
    ],
    currentLayerIndex: 0
  };
  let DataSource = [];

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
  function fetchDataSource() {
    fetch('http://localhost:5003/api/data/mock')
      .then(resp => { if (!resp.ok) throw new Error("Network error"); return resp.json(); })
      .then(data => {
        DataSource = data;
        populateFields();
      })
      .catch(err => console.error(err));
  }
  function populateFields() {
    fieldsContainer.innerHTML = "";
    if (DataSource.length > 0) {
      const firstRow = DataSource[0];
      Object.keys(firstRow).forEach(field => {
        const type = (!isNaN(Date.parse(firstRow[field])) ? "date" :
                      (!isNaN(parseFloat(firstRow[field])) ? "number" : "string"));
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
  
  /* --- Step 2: Drag & Drop for Axis Controls --- */
  function initDragDrop() {
    [colDropZone, rowDropZone].forEach(zone => {
      zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
      zone.addEventListener("dragleave", () => { zone.classList.remove("dragover"); });
    });
    colDropZone.addEventListener("drop", handleDropColumn);
    rowDropZone.addEventListener("drop", handleDropRow);
  }
  function handleDropColumn(e) {
    e.preventDefault();
    colDropZone.classList.remove("dragover");
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    state.layers[state.currentLayerIndex].colField = { field: data.field, type: data.type };
    console.log("Column set:", data);
    tryGenerateChartForActiveLayer();
  }
  function handleDropRow(e) {
    e.preventDefault();
    rowDropZone.classList.remove("dragover");
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    state.layers[state.currentLayerIndex].rowField = { field: data.field, type: data.type };
    console.log("Row set:", data);
    tryGenerateChartForActiveLayer();
  }
  
  /* --- Step 3: Chart Generation and Caching --- */
  // When both axes are set, generate chart on offscreen canvas and cache its image.
  function tryGenerateChartForActiveLayer() {
    const layer = state.layers[state.currentLayerIndex];
    if (layer.colField && layer.rowField) {
      processLayerData(layer);
      generateChartImage(layer);
    }
  }
  // Process Data: Similar to your existing processLayerData function.
  function processLayerData(layer) {
    if (DataSource.length > 0 && layer.colField.type === "date") {
      const groups = {};
      DataSource.forEach(row => {
        const dateVal = row[layer.colField.field];
        const waitTime = parseFloat(row[layer.rowField.field]);
        const dt = new Date(dateVal);
        if (isNaN(dt)) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}`;
        groups[key] = groups[key] || { key, x: key, y: 0 };
        groups[key].y += waitTime;
      });
      layer.data = Object.values(groups).sort((a,b) => a.key.localeCompare(b.key));
    }
    // Log data change for the layer.
    console.log(`Layer ${layer.id} data updated; ${layer.data.length} items.`);
    // (Handle non-date fields if needed)
    console.log("Layer", layer.id, "data set with", layer.data.length, "items.");
  }
  // Use Chart.js to render chart on offscreen canvas and cache image
  function generateChartImage(layer) {
    const offscreen = document.createElement("canvas");
    offscreen.width = state.canvasWidth;
    offscreen.height = state.canvasHeight;
    const ctx = offscreen.getContext("2d");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: layer.data.map(d => d.x),
        datasets: [{
          label: "Wait Time",
          data: layer.data.map(d => d.y),
          backgroundColor: layer.color || "rgba(0,123,255,0.7)"
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
          x: { type: "category", grid: { display: false }, title: { display: true, text: "Time" } },
          y: { grid: { display: false }, title: { display: true, text: "Total Wait Time" } }
        },
        plugins: { legend: { display: false } }
      }
    });
    // Allow chart to render, then capture image
    setTimeout(() => {
      const dataURL = offscreen.toDataURL();
      // Save the image in the layer data model
      layer.cachedImage = dataURL;
      addOrUpdateLayerImage(layer);
    }, 500); // delay may be adjusted
  }
  
  /* --- Step 4: Rendering into the Parallax View --- */
  function addOrUpdateLayerImage(layer) {
    let img = document.getElementById("layer-img-" + layer.id);
    if (!img) {
      img = document.createElement("img");
      img.id = "layer-img-" + layer.id;
      img.style.position = "absolute";
      img.style.top = 0;
      img.style.left = 0;
      img.style.width = "100%";
      img.style.height = "100%";
      container.appendChild(img);
    }
    img.src = layer.cachedImage;
    // Store depth attribute for parallax (default value or later updated via control)
    img.dataset.depth = layer.z || 0.1;
    updateLayerImageTransform(img);
  }
  
  /* --- Step 5: User Controls for Parallax and Interaction --- */
  function updateLayerImageTransform(img) {
    const layerId = parseInt(img.id.replace("layer-img-", ""), 10);
    const layer = state.layers.find(layer => layer.id === layerId);
    const rect = container.getBoundingClientRect();
    const offsetX = (currentMouseX - rect.width/2) * 0.05 * img.dataset.depth;
    const offsetY = (currentMouseY - rect.height/2) * 0.05 * img.dataset.depth;
    const zoom = parseFloat(zoomSlider.value) / layer.z;
    console.log(`Layer ${layerId} offset: (${offsetX}, ${offsetY}) zoom:${zoom}`); // Log offsets for debugging
    img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

    // Compute effective distance from camera using depth, zoom, and layer spacing.
    // effectiveDistance decreases as the image gets closer to the camera.
    
    // Define fade thresholds
    const fadeStart = 1; // below this effective distance, alpha = 0
    const fadeEnd = 1.5;   // above this, alpha = 1
    let alpha;
    if (zoom <= fadeStart) {
      alpha = .9;
    } else if (zoom >= fadeEnd) {
      alpha = 0;
    } else {
      console.log(`(zoom - fadeStart) ${(zoom - fadeStart)} / (fadeEnd - fadeStart) ${(fadeEnd - fadeStart)}`); // Log for debugging
      alpha = 1-((zoom - fadeStart) / (fadeEnd - fadeStart));
    }
    img.style.opacity = alpha;
  }
  let currentMouseX = 0, currentMouseY = 0;
  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    currentMouseX = e.clientX - rect.left;
    currentMouseY = e.clientY - rect.top;
    requestAnimationFrame(updateAllLayerImageTransforms);
  });
  function updateAllLayerImageTransforms() {
    state.layers.forEach(layer => {
      const img = document.getElementById("layer-img-" + layer.id);
      if (img) updateLayerImageTransform(img);
    });
  }
  parallaxSlider.addEventListener("input", () => updateAllLayerImageTransforms());
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    let zoom = parseFloat(zoomSlider.value);
    zoom += e.deltaY * -0.001;
    zoom = Math.min(Math.max(zoom, 0.1), 3);
    zoomSlider.value = zoom;
    updateAllLayerImageTransforms();
  });

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

  // Update "layer-spacing" input event to recalc layer depths and update transforms.
  document.getElementById("layer-spacing").addEventListener("input", (e) => {
    state.layerSpacing = parseFloat(e.target.value);
    updateLayerDepths();
    updateAllLayerImageTransforms();
  });

  /* --- Step 6: Integration with Existing UI --- */
  // Layer Panel management:
  function updateLayerPanel() {
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
    const layer = state.layers[state.currentLayerIndex];
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

  /* --- Existing Functions: Data Processing, Drag and Drop, etc. --- */
  // (Reuse processLayerData defined above; drag and drop events already set up in initDragDrop())
  
  // Initialize the UI
  initDataSource();
  initDragDrop();
  updateLayerPanel();

  // Render function triggers UI update.
  function render() {
    updateAllLayerImageTransforms();
  }

  // Example: Simulate new data for active layer after 3 seconds.
  setTimeout(() => {
    // For the active layer (layer 1), set the processed data.
    state.layers[0].data = [
      { x: "2025-01-01 08", y: 5 },
      { x: "2025-01-01 09", y: 12 },
      { x: "2025-01-01 10", y: 8 },
      { x: "2025-01-01 11", y: 10 }
    ];
    // Ensure both fields are set to trigger chart generation.
    state.layers[0].colField = { field: "Date/Time", type: "date" };
    state.layers[0].rowField = { field: "Wait Time", type: "number" };
    processLayerData(state.layers[0]);
    generateChartImage(state.layers[0]);
    render();
  }, 3000);

  /* ...existing drag & drop and other event handlers as needed... */
});
