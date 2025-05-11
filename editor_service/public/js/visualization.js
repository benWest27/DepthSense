function createSavePopup(onSave) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "save-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  // Container
  const container = document.createElement("div");
  container.style.background = "#fff";
  container.style.borderRadius = "8px";
  container.style.padding = "20px";
  container.style.width = "350px";
  container.style.position = "relative";
  container.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  container.innerHTML = `
    <button id="save-close-btn" style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
    <h2 style="text-align:center; margin-top:0;">Save Visualization</h2>
    <label style="display:block; margin-bottom:10px; color: black;">Visualization Name</label>
    <input type="text" id="viz-name-input" style="width:100%; padding:8px; margin-bottom:20px;" placeholder="Enter a name..." />
    <button id="save-submit-btn" style="width:100%; padding:10px; background-color:#0078d7; color:#fff; border:none; border-radius:4px; cursor:pointer;">Save</button>
  `;
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  container.querySelector("#save-close-btn").onclick = () => overlay.remove();
  container.querySelector("#save-submit-btn").onclick = () => {
    const name = document.getElementById("viz-name-input").value.trim();
    if (!name) {
      alert("Please enter a name.");
      return;
    }
    overlay.remove();
    if (onSave) onSave(name);
  };
}

async function fetchUserVisualizationsFromDataService() {
  const token = localStorage.getItem("jwt");
  try {
    const resp = await fetch("/api/visualization", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!resp.ok) throw new Error("Failed to fetch visualizations.");
    return await resp.json();
  } catch (err) {
    alert("Failed to fetch visualizations from data service.");
    return [];
  }
}

function createLoadPopup(visualizations, onLoad) {
  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "load-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  // Container
  const container = document.createElement("div");
  container.style.background = "#fff";
  container.style.borderRadius = "8px";
  container.style.padding = "20px";
  container.style.width = "350px";
  container.style.position = "relative";
  container.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  container.style.color = "black";

  let dropdownHtml;
  if (visualizations.length) {
    dropdownHtml = `
      <label for="viz-select" style="display:block; margin-bottom:10px; color:black;">Select Visualization</label>
      <select id="viz-select" style="width:100%; padding:8px; margin-bottom:20px; color:black;">
        ${visualizations.map(v => `<option value="${v.id}" style="color:black;">${v.title || v.name}</option>`).join("")}
      </select>
      <button id="load-select-btn" style="width:100%; padding:10px; background-color:#0078d7; color:#fff; border:none; border-radius:4px; cursor:pointer;">Load</button>
    `;
  } else {
    dropdownHtml = `<div style="color:black;">No visualizations found.</div>`;
  }

  container.innerHTML = `
    <button id="load-close-btn" class="load-close-btn">&times;</button>
    <h2 class="load-title">Load Visualization</h2>
    ${dropdownHtml}
  `;
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  container.querySelector("#load-close-btn").onclick = () => overlay.remove();
  if (visualizations.length) {
    container.querySelector("#load-select-btn").onclick = () => {
      const select = document.getElementById("viz-select");
      const selectedId = select.value;
      overlay.remove();
      if (onLoad) onLoad(selectedId);
    };
  }
}

// Save the current ParallaxChart state to the data_service
async function saveVisualizationToDataService(title, description = "") {
  if (!window.parallaxChart || typeof window.parallaxChart.getSerializableState !== "function") {
    alert("Visualization state is not available.");
    return;
  }
  const data = window.parallaxChart.getSerializableState();
  const token = localStorage.getItem("jwt");
  try {
    const resp = await fetch("/api/visualization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        title,
        description,
        data
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err || "Failed to save visualization.");
    }
    document.getElementById("status-message").textContent = "Visualization saved successfully!";
  } catch (err) {
    document.getElementById("status-message").textContent = "Error saving visualization: " + err.message;
  }
}

// Fetch a specific visualization by ID from the data_service
async function fetchVisualizationByIdFromDataService(id) {
  const token = localStorage.getItem("jwt");
  try {
    const resp = await fetch(`/api/visualization/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!resp.ok) throw new Error("Failed to fetch visualization.");
    return await resp.json();
  } catch (err) {
    alert("Failed to fetch visualization from data service.");
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save");
  if (saveBtn) {
    saveBtn.addEventListener("click", e => {
      e.preventDefault();
      createSavePopup(name => {
        // Save visualization via data_service
        saveVisualizationToDataService(name);
      });
    });
  }

  const loadBtn = document.getElementById("load");
  if (loadBtn) {
    loadBtn.addEventListener("click", async e => {
      e.preventDefault();
      // Fetch user's visualizations from data_service
      const visualizations = await fetchUserVisualizationsFromDataService();
      createLoadPopup(visualizations, async vizId => {
        // Fetch the selected visualization and load into parallaxChart
        const viz = await fetchVisualizationByIdFromDataService(vizId);
        if (viz && viz.data && window.parallaxChart && typeof window.parallaxChart.setStateFromSerialized === "function") {
          window.parallaxChart.setStateFromSerialized(viz.data);
          // Update the visualization name label and store the current visualization id globally.
          document.getElementById("visualization-name").textContent = viz.title || viz.name || "Unnamed Visualization";
          window.currentVisualizationId = viz.id;
          alert("Visualization loaded!");
        } else {
          alert("Failed to load visualization data.");
        }
      });
    });
  }
  // New: Attach click event to view button
const viewBtn = document.getElementById("view");
if (viewBtn) {
    viewBtn.addEventListener("click", () => {
        // Check that both the parallaxChart exists and has a current visualization ID to send
        if (window.parallaxChart && window.currentVisualizationId) {
            window.location.href = `/viewer/?id=${window.currentVisualizationId}`;
        } else {
            alert("No visualization loaded to view.");
        }
    });
}
});