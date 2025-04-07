const snakeCase = window._ && _.snakeCase ? _.snakeCase : function(str){ return str.toLowerCase().replace(/\s+/g, '_'); };

function createUploadOverlay() {
  // Create overlay element with inline styles.
  const overlay = document.createElement("div");
  overlay.className = "upload-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  
  // Create container element with inline styling.
  const container = document.createElement("div");
  container.className = "upload-container";
  container.style.background = "#fff";
  container.style.borderRadius = "8px";
  container.style.padding = "20px";
  container.style.width = "400px";
  container.style.position = "relative";
  container.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  
  // Set container inner HTML.
  container.innerHTML = `
    <button class="close-btn" id="upload-close-btn" 
            style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
    <h2 style="text-align:center; margin-top:0;">Upload CSV</h2>
    <div style="margin:20px 0;">
      <input type="file" id="upload-file-input" accept=".csv" style="display:none;" />
      <button id="browse-btn" style="padding:8px 12px; cursor:pointer;">Browse...</button>
      <input type="text" id="filename-input" placeholder="No file chosen" style="margin-left:10px; padding:8px; width:60%;" />
    </div>
    <button id="upload-submit-btn" style="width:100%; padding:10px; background-color:#0078d7; color:#fff; border:none; border-radius:4px; cursor:pointer;">Submit</button>
  `;
  overlay.appendChild(container);
  document.body.appendChild(overlay);
  
  // Events for Browse: trigger hidden file input.
  container.querySelector("#browse-btn").addEventListener("click", () => {
    document.getElementById("upload-file-input").click();
  });
  
  // When file is selected, update the filename input.
  document.getElementById("upload-file-input").addEventListener("change", function() {
    const file = this.files[0];
    if (file) {
      document.getElementById("filename-input").value = file.name;
    }
  });
  
  // Submit button event: upload file then remove overlay.
  container.querySelector("#upload-submit-btn").addEventListener("click", () => {
    const fileInput = document.getElementById("upload-file-input");
    const file = fileInput.files[0];
    if (!file) {
      alert("Please choose a CSV file.");
      return;
    }
    const filenameInput = document.getElementById("filename-input");
    const filename = filenameInput ? filenameInput.value : "";
    const formData = new FormData();
    formData.append("csvfile", file);
    // Append the custom filename so the data service can use it
    formData.append("filename", filename);
    fetch("http://localhost:5003/api/data/upload", {
      method: "POST",
      body: formData,
    })
      .then(resp => {
        if (!resp.ok) {
          return resp.text().then(text => { throw new Error("Upload failed: " + text); });
        }
        return resp.json();
      })
      .then(result => {
        console.log("CSV file uploaded successfully:", result);
        removeOverlay();
      })
      .catch(err => console.error("CSV upload error:", err));
  });
  
  // Close overlay when clicking the X button.
  container.querySelector("#upload-close-btn").addEventListener("click", removeOverlay);
  
  function removeOverlay() {
    // Use the modern remove() API if available, otherwise check before removal.
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    // Alternatively, simply: overlay.remove();
  }
}

function initCSVUpload() {
  const uploadButton = document.getElementById("upload");
  if (uploadButton) {
    uploadButton.addEventListener("click", (e) => {
      e.preventDefault();
      createUploadOverlay();
    });
  }

  // Attach common popup events (if these elements exist).
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      document.querySelector(".modal-overlay").style.display = "none";
    });
  }
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", e => {
      e.preventDefault();
      const file = popupFileInput.files[0];
      const filenameInput = document.getElementById("filename-input");
      const filename = filenameInput ? filenameInput.value : "";
      if (file) {
        const formData = new FormData();
        formData.append("csvfile", file);
        // Append the filename from the filename-input element
        formData.append("filename", filename);
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
      alert("Submitted!");
    });
  }
}

// Call the CSV upload initialization function
initCSVUpload();
