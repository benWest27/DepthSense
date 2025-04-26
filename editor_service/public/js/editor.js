document.addEventListener("DOMContentLoaded", () => {
  // Authentication check: ensure user is logged in with admin or creator role.
  const token = localStorage.getItem("jwt");
  if (!token) {
    alert("You must be logged in to use the editor service.");
    window.location.href = "/"; // Redirect to login page
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== "admin" && payload.role !== "creator") {
      alert("Access denied: insufficient privileges.");
      window.location.href = "/";
      return;
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    window.location.href = "/";
    return;
  }

  console.log("DOMContentLoaded: Editor service is starting.");

  // With globals:
  const parallaxChart = window.parallaxChart;
  const editorController = window.editorController;
  // Get DOM elements first.
  const container = document.getElementById("canvas-container");
  const dynamicCanvas = document.getElementById("dynamic-layer");
  const canvas = dynamicCanvas;
  const ctx = canvas.getContext("2d");

  // Initialize state.
  const state = parallaxChart.state; // now editor.js uses parallaxChart.state for all layer handling

  // Replace the following require calls:
  // const parallaxChart = require('../../services/parallax.js')(state, container, dynamicCanvas, ctx);
  // const editorController = require('../../controllers/editorController.js')(state, parallaxChart, container, ctx);
  

  const dataSourceSelect = document.getElementById("data-source-select");
  const fieldsContainer = document.getElementById("fields-container");
  const colDropZone = document.getElementById("column-drop-zone");
  const rowDropZone = document.getElementById("row-drop-zone");
  const layerPanel = document.getElementById("layer-panel");
  const zoomSlider = document.getElementById("zoom");
  //const parallaxSlider = document.getElementById("layer-depth");
  // Global CSV data array
  let DataSource = [];
  let dataheader = [];

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
      fetchDataForSource(selectedSourceId)
        .then(() => {
          // Do not overwrite DataSource here because it was already set.
          updateFieldsFromData();
          render();
          tryGenerateChartForActiveLayer();
        })
        .catch(err => {
          console.error("Error fetching data for source:", selectedSourceId, err);
          alert("Failed to load data for the selected source.");
          DataSource = [];
          updateFieldsFromData();
          render();
          tryGenerateChartForActiveLayer();
        });
    } else {
      console.log("No data source selected.");
      DataSource = [];
      updateFieldsFromData();
      render();
      tryGenerateChartForActiveLayer();
    }
    state.currentLayerIndex = state.layers.length > 0 ? 0 : -1;
    updateLayerPanel();
    updateAxisDropZones();
  });
  
  // NEW: Add function fetchDataForSource to load dataset content by ID
  function fetchDataForSource(sourceId) {
    const token = localStorage.getItem("jwt");
    if (!token) {
      console.error("JWT token is missing. User must log in.");
      alert("You must be logged in to fetch data sources.");
      window.location.href = "/"; // Redirect to login page
      return;
    }

    return fetch(`http://localhost:5003/api/datasets/${sourceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // Include the token in the Authorization header
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    })
      .then(resp => {
        if (!resp.ok) throw new Error("Failed to fetch dataset " + sourceId);
        return resp.json();
      })
      .then(data => {
        console.log("Dataset fetched for source", sourceId, ":", data);
        dataheader = data.column_names;
        return fetch(`http://localhost:5003/api/data/rows/${data.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`, // Include the token for fetching rows
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        })
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
          // Check for date format
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
        // Use getAttribute("data-type") in the drag event to capture the correct type.
        fieldEl.addEventListener("dragstart", (e) => {
          const fieldType = fieldEl.getAttribute("data-type");
          e.dataTransfer.setData("text/plain", JSON.stringify({ field, type: fieldType }));
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
    if (layer.colField && layer.rowField&& layer.coldata.length && layer.rowdata.length) {
      processLayerData(layer);
      generateChartImage(layer);
    }
  }

  // --- Function: processLayerData ---
  function processLayerData(layer) {
    // Determine the actual rows array from DataSource.
    let rows = [];
    if (Array.isArray(DataSource)) {
      rows = DataSource;
    } else if (DataSource && Array.isArray(DataSource.csvRows)) {
      rows = DataSource.csvRows;
    } else {
      console.error("DataSource does not contain an array of rows:", DataSource);
      return;
    }
  
    if (rows.length > 0 && layer.colField && layer.rowField && layer.colField.type === "date") {
      const groups = {};
      rows.forEach(row => {
        // Use the field names set in the drop zones.
        const dateVal = row[layer.colField.field];
        const waitTime = parseFloat(row[layer.rowField.field]);
        const dt = new Date(dateVal);
        if (isNaN(dt)) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}`;
        groups[key] = groups[key] || { key, x: key, y: 0 };
        groups[key].y += waitTime;
      });
      // Sort the data points by key.
      layer.data = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
    }
    console.log(`Layer ${layer.id} data updated; ${layer.data ? layer.data.length : 0} items.`);
  }
  

// Draw a Chart.js bar chart using the processed data.
function generateChartImage(layer) {
    console.log("generateChartImage: Generating chart image for layer", layer.id);
    const offscreen = document.createElement("canvas");
    offscreen.width = state.canvasWidth;
    offscreen.height = state.canvasHeight;
    const ctxOffscreen = offscreen.getContext("2d");

    // Determine dropped fields.
    const colFields = layer.colFields ? layer.colFields : (layer.colField ? [layer.colField] : []);
    const rowFields = layer.rowFields ? layer.rowFields : (layer.rowField ? [layer.rowField] : []);

    // Default labels and datasets.
    let labels = layer.coldata || [];
    let datasets = [];
    
    // If the row field is a string, group by distinct row values.
    if (rowFields.length > 0 && layer.rowdata && rowFields[0].type === "string") {
        const rField = rowFields[0];
        const rowCounts = {};
        layer.rowdata.forEach(row => {
            const value = row[rField.field];
            if (value != null) {
                rowCounts[value] = (rowCounts[value] || 0) + 1;
            }
        });
        labels = Object.keys(rowCounts).sort();
        datasets.push({
            label: rField.field,
            data: labels.map(val => rowCounts[val]),
            backgroundColor: (layer.colors && layer.colors[rField.field]) || "rgba(0,123,255,0.7)"
        });
    } else if (rowFields.length > 0 && layer.rowdata) {
        // Fallback: use existing logic.
        rowFields.forEach(rField => {
            let data =
              layer.rowdata && layer.rowdata[rField.field]
                ? layer.rowdata[rField.field]
                : layer.rowdata;
            datasets.push({
              label: rField.field,
              data: data,
              backgroundColor:
                (layer.colors && layer.colors[rField.field]) || "rgba(0,123,255,0.7)"
            });
        });
    }

    // Additional: if the col field is string, group distinct values.
    if (colFields.length > 0 && layer.coldata && colFields[0].type === "string") {
        const cField = colFields[0];
        const colCounts = {};
        layer.coldata.forEach(val => {
            if (val != null) {
                colCounts[val] = (colCounts[val] || 0) + 1;
            }
        });
        // Merge or override labels if needed.
        labels = Object.keys(colCounts).sort();
        datasets.push({
            label: cField.field,
            data: labels.map(val => colCounts[val]),
            backgroundColor:
              (layer.colors && layer.colors[cField.field]) || "rgba(255,99,132,0.7)"
        });
    }
    
    // Create the Chart.js chart.
    const chart = new Chart(ctxOffscreen, {
      type: "bar",
      data: {
          labels: labels,
          datasets: datasets
      },
      options: {
          responsive: false,
          maintainAspectRatio: false,
          scales: {
              x: {
                  type: "category",
                  grid: { display: false },
                  title: { 
                    display: true,
                    text: colFields.length > 0 ? colFields[0].field : "X Axis"
                  },
                  markerSize: state.markerSize
              },
              y: {
                  grid: { display: false },
                  title: { 
                    display: true,
                    text: rowFields.length > 0 ? rowFields.map(r => r.field).join(", ") : "Y Axis"
                  },
                  markerSize: state.markerSize
              }
          },
          plugins: { legend: { display: datasets.length > 1 } }
      }
    });

    // If a numeric field was dropped, add a blue border to the corresponding drop zone.
    if (rowFields.length > 0 && rowFields[0].type === "number") {
      const rowDropZone = document.getElementById("row-drop-zone");
      if (rowDropZone) { rowDropZone.style.border = "2px solid blue"; }
    } else {
      const rowDropZone = document.getElementById("row-drop-zone");
      if (rowDropZone) { rowDropZone.style.border = ""; }
    }
    if (colFields.length > 0 && colFields[0].type === "number") {
      const colDropZone = document.getElementById("column-drop-zone");
      if (colDropZone) { colDropZone.style.border = "2px solid blue"; }
    } else {
      const colDropZone = document.getElementById("column-drop-zone");
      if (colDropZone) { colDropZone.style.border = ""; }
    }

    // Allow the chart to render, then capture its image.
    setTimeout(() => {
      const dataURL = offscreen.toDataURL();
      layer.cachedImage = dataURL;
      parallaxChart.addOrUpdateLayerImage(layer, container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    }, 500);
}

  // --- Render loop ---
  let currentMouseX = 0, currentMouseY = 0;
  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    currentMouseX = e.clientX - rect.left;
    currentMouseY = e.clientY - rect.top;
    requestAnimationFrame(() => {
      parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    });
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


  // NEW: Modified fetchDataSourceList to optionally select a new source if provided.
  function fetchDataSourceList(newSourceId) {
    const token = localStorage.getItem("jwt");
    if (!token) {
      console.error("JWT token is missing. User must log in.");
      alert("You must be logged in to fetch data sources.");
      window.location.href = "/"; // Redirect to login page
      return;
    }

    fetch("http://localhost:5003/api/datasets", {
      headers: {
        'Authorization': `Bearer ${token}`, // Ensure the token is included
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    })
      .then(resp => { 
        if (!resp.ok) throw new Error("Failed to fetch data source list");
        return resp.json();
      })
      .then(sources => {
        if (!Array.isArray(sources)) {
          console.error("Invalid response format: expected an array", sources);
          throw new Error("Invalid data format received for datasets");
        }
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
      .catch(err => console.error("Error fetching data source list:", err));
  }

  fetchDataSourceList();
  // NEW: Function to handle CSV file upload through the "Upload" button
 // function initCSVUpload() {
 //   const uploadButton = document.getElementById("upload");
 //   const fileInput = document.createElement("input");
 //   fileInput.type = "file";
 //   fileInput.accept = ".csv";
 //   fileInput.style.display = "none";
 //   document.body.appendChild(fileInput);
 // 
 //   uploadButton.addEventListener("click", () => {
 //     fileInput.click();
 //   });
 // 
 //   fileInput.addEventListener("change", () => {
 //     const file = fileInput.files[0];
 //     if (file) {
 //       const formData = new FormData();
 //       formData.append("csvfile", file);
 //       fetch("http://localhost:5003/api/data/upload", {
 //         method: "POST",
 //         body: formData,
 //       })
 //         .then(resp => {
 //           if (!resp.ok) throw new Error("Upload failed");
 //           return resp.json();
 //         })
 //         .then(result => {
 //           console.log("CSV file uploaded successfully:", result);
 //         })
 //         .catch(err => console.error("CSV upload error:", err));
 //     }
 //   });
 // }
  
  // Call the CSV upload initialization function
 // initCSVUpload();

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
      console.log("horizontal-focal slider fired with value:", e.target.value);
      state.focalPoint.x = parseFloat(e.target.value) / 100;
      console.log("horizontal-focal: Updated focalPoint.x to", state.focalPoint.x);
      render();
    }
  });
  document.getElementById("vertical-focal").addEventListener("input", (e) => {
    if (state.sliderFocal) {
      console.log("vertical-focal slider fired with value:", e.target.value);
      state.focalPoint.y = parseFloat(e.target.value) / 100;
      console.log("vertical-focal: Updated focalPoint.y to", state.focalPoint.y);
      render();
    }
  });

  document.getElementById("zoom").addEventListener("input", (e) => {
    state.zoom = parseFloat(e.target.value);
    console.log("zoom: Updated zoom to", state.zoom);
    render();
  });

  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    // Adjust the zoom value: a small negative deltaY increases zoom, positive decreases.
    let zoom = state.zoom;
    zoom += e.deltaY * -0.001;
    zoom = Math.min(Math.max(zoom, 0.0001), 1.5);
    state.zoom = zoom;
    zoomSlider.value = zoom;
    // Update the parallax image transforms with the new zoom value.
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, zoom);
  });

  document.getElementById("marker-size").addEventListener("input", (e) => {
    state.markerSize = parseInt(e.target.value);
    console.log("marker-size: Updated markerSize to", state.markerSize);
    state.layers.forEach(element => {
      generateChartImage(element); // Regenerate the chart for each layer with the new marker size
    });
    render();
  });
  //document.getElementById("toggle-mouse-control").addEventListener("click", () => {
  //  state.mouseControl = !state.mouseControl;
  //  console.log("toggle-mouse-control: mouseControl is now", state.mouseControl);
  //});
  //document.getElementById("toggle-focal-mode").addEventListener("click", () => {
  //  state.sliderFocal = !state.sliderFocal;
  //  console.log("toggle-focal-mode: sliderFocal is now", state.sliderFocal);
  //});
  canvas.addEventListener("mousemove", (e) => {
    if (state.mouseControl && !state.sliderFocal) {
      state.focalPoint.x = e.offsetX / canvas.width;
      state.focalPoint.y = e.offsetY / canvas.height;
      console.log("mousemove: Updated focalPoint to", state.focalPoint);
      render();
    }
  });

  // Add mouseenter to update booleans when mouse is over canvas-container
  container.addEventListener("mouseenter", () => {
    state.mouseControl = true;
    state.sliderFocal = false;
    console.log("mouseenter: Set state.mouseControl =",state.mouseControl," and state.sliderFocal = ", state.sliderFocal);
  });


  //document.getElementById("layer-depth").addEventListener("input", (e) => {
  //  state.layerOffset = parseFloat(e.target.value);
  //  console.log("layer-depth: Updated layerOffset to", state.layerOffset);
  //  container.addEventListener("wheel", (e) => {
  //      e.preventDefault();
  //      let zoom = parseFloat(zoomSlider.value);
  //      zoom += e.deltaY * -0.001;
  //      zoom = Math.min(Math.max(zoom, 0.1), 3);
  //      zoomSlider.value = zoom;
  //      parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  //  });
  //});

  container.addEventListener("mouseleave", () => {
    // Use slider values exclusively to set focal point
    state.mouseControl = false;
    state.sliderFocal = true;
    const horFocal = parseFloat(document.getElementById("horizontal-focal").value) / 100;
    const verFocal = parseFloat(document.getElementById("vertical-focal").value) / 100;
    state.focalPoint.x = horFocal;
    state.focalPoint.y = verFocal;
    console.log("mouseenter: Set state.mouseControl =",state.mouseControl," and state.sliderFocal = ", state.sliderFocal);
    render();
  });

  document.getElementById("layer-spacing").addEventListener("input", (e) => {
    console.log("layer-spacing: Updated layerSpacing to", state.layerSpacing);
    state.layerSpacing = parseFloat(e.target.value);
    updateLayerDepths();
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
  });
  // Layer Panel: handle layer tab selection and adding new layers.
  
  function updateLayerPanel() {
    const panel = document.getElementById("layer-panel");
    // Clear existing layer tabs except the "Add Layer" button.
    panel.querySelectorAll(".layer-tab").forEach(tab => tab.remove());
    state.layers.forEach((layer, index) => {
      const tab = document.createElement("div");
      tab.className = "layer-tab";
      
      if (index === state.currentLayerIndex) { 
        tab.classList.add("selected"); 
        tab.style.backgroundColor = "#0078d7"; // selected layer color
        console.log("Selected layer:", layer.id); // Added log for layer selection
      } else {
        tab.style.backgroundColor = "white"; // deselected layer color
      }
      tab.textContent = `Layer ${index+1}`;
      tab.dataset.layerIndex = index;
      tab.addEventListener("click", () => {
        state.currentLayerIndex = index;
        console.log("Selected layer:", state.layers[index].id); // Log when a layer is selected
        updateAxisDropZones();
        updateLayerPanel(); // Refresh to update colors
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

  colDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    colDropZone.classList.remove('dragover');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log("drop: Field", data.field, "with type", data.type, "dropped into column-drop-zone");
    
    if (state.currentLayerIndex < 0 || !state.layers[state.currentLayerIndex]) {
      console.error("No current layer defined to map column field.");
      return;
    }
    // Assume DataSource is an array or has csvRows.
    const sourceArray = Array.isArray(DataSource) ? DataSource : DataSource.csvRows;
    if (!Array.isArray(sourceArray)) {
      console.error("DataSource is not an array:", DataSource);
      return;
    }
    // Map the field values.
    const fieldValues = sourceArray.map(row => row[data.field]);
    state.layers[state.currentLayerIndex].colField = { field: data.field, type: data.type };
    state.layers[state.currentLayerIndex].coldata = fieldValues;

    // --- Recalculate chart: X axis = unique bins, Y axis = count per label ---
    const valueCounts = {};
    fieldValues.forEach(val => {
      if (val !== undefined && val !== null) {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      }
    });
    state.layers[state.currentLayerIndex].data = Object.entries(valueCounts).map(([label, count]) => ({
      x: label,
      y: count
    }));

    updateAxisDropZones();
    generateChartImage(state.layers[state.currentLayerIndex]);
    render();
  });

  
  rowDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    rowDropZone.classList.remove('dragover');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log("drop: Field", data.field, "with type", data.type, "dropped into row-drop-zone");
    
    if (state.currentLayerIndex < 0 || !state.layers[state.currentLayerIndex]) {
      console.error("No current layer defined to map row field.");
      return;
    }
    const sourceArray = Array.isArray(DataSource) ? DataSource : DataSource.csvRows;
    if (!Array.isArray(sourceArray)) {
      console.error("DataSource is not an array:", DataSource);
      return;
    }
    const fieldValues = sourceArray.map(row => row[data.field]);
    state.layers[state.currentLayerIndex].rowField = { field: data.field, type: data.type };
    state.layers[state.currentLayerIndex].rowdata = fieldValues;

    // --- Recalculate chart: X axis = unique bins, Y axis = count per label ---
    const valueCounts = {};
    fieldValues.forEach(val => {
      if (val !== undefined && val !== null) {
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      }
    });
    state.layers[state.currentLayerIndex].data = Object.entries(valueCounts).map(([label, count]) => ({
      x: label,
      y: count
    }));

    updateAxisDropZones();
    generateChartImage(state.layers[state.currentLayerIndex]);
    render();
  });


  function render() {
    parallaxChart.updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
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

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.location.href = "http://localhost:80";
    });
  }
  
});

// Remove require(...) calls and use globally attached objects.
const parallaxChart = window.parallaxChart;
const editorController = window.editorController; // Ensure editorController is attached to window (via a similar change in its file)