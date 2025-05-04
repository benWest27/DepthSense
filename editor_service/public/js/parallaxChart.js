// Added debug mode flag:
const debugMode = false; // Set to true for detailed logs

// --- In parallaxChart.js ---
class ParallaxChart {
    constructor(state, container, dynamicCanvas, ctx) {
        // Use provided state or defaults.
        this.state = state || {
        focalPoint: { x: 0.5, y: 0.5 },
        zoom: 0.1,
        markerSize: 5,
        mouseControl: false,
        sliderFocal: true,
        layerOffset: 0,
        canvasX: 50,
        canvasY: 50,
        canvasWidth: 600,
        canvasHeight: 600,
        layerSpacing: 0.1,
        MinimumLayerSpacing: 0.00001,
        layers: [ 
            { id: 1, z: 0.1, rowField: null, colField: null, rowdata: [], coldata: [], datasetId: null}
        ],
        currentLayerIndex: -1
        };
        this.state.layers = this.state.layers || [];
        // Store DOM elements.
        this.container = container;
        this.dynamicCanvas = dynamicCanvas;
        this.ctx = ctx;
        // For performance, reuse an offscreen canvas.
        this.offscreenCanvas = document.createElement("canvas");
        this.offscreenCanvas.width = this.state.canvasWidth;
        this.offscreenCanvas.height = this.state.canvasHeight;
    }

    // Update a layer image's transform with a scaling factor.
    async updateLayerImageTransform(img, container, currentMouseX, currentMouseY, zoomValue) {
        const layerId = parseInt(img.id.replace("layer-img-", ""), 10);
        const layer = this.state.layers.find(layer => layer.id === layerId);
        if (!layer) return;
        const rect = container.getBoundingClientRect();
        const offsetX = (currentMouseX - rect.width * 1.1) * 0.1 * parseFloat(img.dataset.depth || 0.1);
        const offsetY = (currentMouseY - rect.height * 1.1) * 0.1 * parseFloat(img.dataset.depth || 0.1);
        const computedZoom = (zoomValue / layer.z)/4;
        // Apply scaling multiplier to make image smaller.
    
        img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${computedZoom * 0.5})`;
        // Compute opacity based on zoom thresholds.
    
        const fadeStart = 1.3, fadeEnd = 2.5;
        let alpha;
        if (computedZoom <= fadeStart) {
        alpha = 0.95;
        } else if (computedZoom >= fadeEnd) {
        alpha = 0;
        } else {
        alpha = 1 - ((computedZoom - fadeStart) / (fadeEnd - fadeStart));
        }
        img.style.opacity = alpha;
    }

    // Update transforms on all layer images.
    async updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, zoomValue) {
        //console.log("this.state.layers:", this.state.layers);
        if (!this.state || !Array.isArray(this.state.layers)) {
            console.warn("Invalid state or missing layers:", this.state);
            return;
        }
        
        for (const layer of this.state.layers) {
            const img = document.getElementById("layer-img-" + layer.id);
            if (img) {
                await this.updateLayerImageTransform(img, container, currentMouseX, currentMouseY, zoomValue);
            }
        }
    }

    // Add or update a layer image in the container.
    async addOrUpdateLayerImage(layer, container, currentMouseX, currentMouseY, zoomValue) {
        let img = document.getElementById("layer-img-" + layer.id);
        if (!img) {
        img = document.createElement("img");
        img.id = "layer-img-" + layer.id;
        img.style.position = "absolute";
        img.style.top = "0";
        img.style.left = "0";
        img.style.width = "100%";
        img.style.height = "100%";
        container.appendChild(img);
        }
        img.src = layer.cachedImage;
        img.dataset.depth = layer.z || 0.1;
        await this.updateLayerImageTransform(img, container, currentMouseX, currentMouseY, zoomValue);
    }

    getSerializableState() {
        // Deep copy state, but remove any non-serializable or DOM references
        const stateCopy = JSON.parse(JSON.stringify(this.state));
        // Remove cachedImage, rowdata, coldata from layers to avoid storing large base64 images and row data
        if (Array.isArray(stateCopy.layers)) {
            stateCopy.layers.forEach(layer => {
                if (layer.cachedImage) delete layer.cachedImage;
                if (layer.rowdata) delete layer.rowdata;
                if (layer.coldata) delete layer.coldata;
            });
        }
        // Update visualization name label if a visualizationName is saved in state
        if (stateCopy.visualizationName) {
            const label = document.getElementById("visualization-name");
            if (label) {
                label.textContent = stateCopy.visualizationName;
            }
        }
        return stateCopy;
    }

    async setStateFromSerialized(serializedState) {
        if (!serializedState || typeof serializedState !== "object") return;
        this.state = JSON.parse(JSON.stringify(serializedState));

        if (typeof window.fetchDataForSource !== "function") {
            console.warn("window.fetchDataForSource is not yet defined.");
            return;
        }
    
        if (this.state.canvasWidth && this.state.canvasHeight) {
            this.offscreenCanvas.width = this.state.canvasWidth;
            this.offscreenCanvas.height = this.state.canvasHeight;
        }
    
        if (Array.isArray(this.state.layers)) {
            for (const layer of this.state.layers) {
                if (layer.datasetId) {
                    try {
                        const fetchedData = await window.fetchDataForSource(layer.datasetId);
                        const rowArray = Array.isArray(fetchedData) ? fetchedData : (fetchedData && fetchedData.csvRows ? fetchedData.csvRows : []);
    
                        if(debugMode) console.log("rowArray:", rowArray);
                        if (layer.rowField && layer.rowField.field) {
                            if(debugMode) console.log("layer.rowField:", layer.rowField);
                            layer.rowdata = rowArray.map(row => row[layer.rowField.field]);
                        }
                        if (layer.colField && layer.colField.field) {
                            if(debugMode) console.log("layer.colField:", layer.colField);
                            layer.coldata = rowArray.map(row => row[layer.colField.field]);
                        }
    
                        // After fetching, update layer data again
                        window.editorController.processLayerData(layer);
                        window.editorController.generateChartImage(layer);
    
                    } catch (err) {
                        console.error(`Error fetching data for datasetId ${layer.datasetId}:`, err);
                        layer.rowdata = [];
                        layer.coldata = [];
                    }
                }
            }
        }
    
        // Update UI after data fetching is complete
        
        if (window.updateLayerPanel) window.updateLayerPanel();
        if (window.updateAxisDropZones) window.updateAxisDropZones();
        if (window.updateCanvasProperties) window.updateCanvasProperties();
        if (window.editorController.generateChartImage) window.editorController.generateChartImage(this.state.layers[this.state.currentLayerIndex]);
        if (window.render) window.render();
    }

    // New: Add method updateLayerDepths to adjust each layer's z property using state.layerSpacing
    updateLayerDepths() {
        // percentShrink: 0.1 = 10% smaller each layer, 0.5 = 50% smaller each layer
        const baseZ = 1; // Layer 0 starts with z=1 (closest)
        this.state.layers.forEach((layer, index) => {
            const shrinkFactor = 1 - this.state.layerSpacing; // e.g. 0.9
            layer.z = baseZ * Math.pow(1 / shrinkFactor, index); // Exponential growth of z
            const img = document.getElementById("layer-img-" + layer.id);
            if (img) {
                img.dataset.depth = layer.z;
            }
        });
    }

   // updateLayerDepths() {
   //     this.state.layers.forEach((layer, index) => {
   //         // Set layer.z based on index; adjust multiplier as needed.
   //         layer.z = (index+ 0.1) * parseFloat(this.state.layerSpacing);
   //         console.log(`Layer ${layer.id} depth set to: ${layer.z}`);
   //         // Update the depth attribute on the cached image if it exists.
   //         const img = document.getElementById("layer-img-" + layer.id);
   //         if (img) {
   //             img.dataset.depth = layer.z;
   //         }
   //     });
   // }
}

// Export for module usage (or attach to window for a browser environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = ParallaxChart;
} else {
    const container = document.getElementById("canvas-container");
    const dynamicCanvas = document.getElementById("dynamic-layer");
    const ctx = dynamicCanvas ? dynamicCanvas.getContext("2d") : null;
    const defaultState = window.parallaxChartState || {}; // or construct manually
    
    window.parallaxChart = new ParallaxChart(defaultState, container, dynamicCanvas, ctx);
}

// In generateChartImage method, wrap debug logs:
window.editorController.generateChartImage = function (layer) {
    if (!layer || typeof layer !== "object") {
      console.error("generateChartImage: Invalid layer object.");
      return;
    }
    if (!Array.isArray(layer.rowdata) || !Array.isArray(layer.coldata)) {
      console.warn("generateChartImage: Missing or invalid data arrays for layer", layer.id);
      return;
    }
    if(debugMode) console.log("Generating chart image: canvasWidth =", this.state.canvasWidth, "canvasHeight =", this.state.canvasHeight);
    // ...existing code...
    setTimeout(() => {
      if(debugMode) {
        console.log("Offscreen canvas size:", offscreen.width, offscreen.height);
        console.log("toDataURL result (first 30 chars):", dataURL.slice(0, 30));
        console.log("Chart rendered, layer.cachedImage length:", layer.cachedImage?.length);
      }
      parallaxChart.addOrUpdateLayerImage(layer, window.container, currentMouseX, currentMouseY, parseFloat(zoomSlider.value));
    }, 500);
}