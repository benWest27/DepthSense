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
        layerSpacing: 2,
        layers: [ 
            { id: 1, z: 0.1, rowField: null, colField: null, rowdata: [], coldata: [], datasetId: null}
        ],
        currentLayerIndex: -1
        };

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
        const offsetX = (currentMouseX - rect.width / 2) * 0.05 * parseFloat(img.dataset.depth || 0.1);
        const offsetY = (currentMouseY - rect.height / 2) * 0.05 * parseFloat(img.dataset.depth || 0.1);
        const computedZoom = zoomValue / layer.z;
        // Apply scaling multiplier to make image smaller.
    
        img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${computedZoom * 0.5})`;
        // Compute opacity based on zoom thresholds.
    
        const fadeStart = 1, fadeEnd = 3;
        let alpha;
        if (computedZoom <= fadeStart) {
        alpha = 0.9;
        } else if (computedZoom >= fadeEnd) {
        alpha = 0.1;
        } else {
        alpha = 1 - ((computedZoom - fadeStart) / (fadeEnd - fadeStart));
        }
        img.style.opacity = alpha;
    }

    // Update transforms on all layer images.
    async updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, zoomValue) {
        //console.log("this.state.layers:", this.state.layers);
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
    
                        if (layer.rowField && layer.rowField.field) {
                            layer.rowdata = rowArray.map(row => row[layer.rowField.field]);
                        }
                        if (layer.colField && layer.colField.field) {
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

    // Restore the ParallaxChart state from a serialized state object
    //async setStateFromSerialized(serializedState) {
    //    if (!serializedState || typeof serializedState !== "object") return;
    //    // Deep copy to avoid reference issues
    //    this.state = JSON.parse(JSON.stringify(serializedState));
    //    // Update offscreen canvas size if dimensions changed
    //    if (this.state.canvasWidth && this.state.canvasHeight) {
    //        this.offscreenCanvas.width = this.state.canvasWidth;
    //        this.offscreenCanvas.height = this.state.canvasHeight;
    //    }
    //    // For each layer, fetch dataset rows and populate rowdata/coldata
    //    if (Array.isArray(this.state.layers)) {
    //        for (const layer of this.state.layers) {
    //            if (layer.datasetId) {
    //                try {
    //                    const rows = await window.fetchDataForSource(layer.datasetId);
    //                    const rowArray = Array.isArray(rows) ? rows : (rows && rows.csvRows ? rows.csvRows : []);
    //                    if (layer.rowField && layer.rowField.field) {
    //                        layer.rowdata = rowArray.map(row => row[layer.rowField.field]);
    //                    }
    //                    if (layer.colField && layer.colField.field) {
    //                        layer.coldata = rowArray.map(row => row[layer.colField.field]);
    //                    }
    //                } catch (err) {
    //                    layer.rowdata = [];
    //                    layer.coldata = [];
    //                }
    //            } else {
    //                layer.rowdata = [];
    //                layer.coldata = [];
    //            }
    //        }
    //    }
    //    // Trigger global UI updates after state restoration
    //    if (window.updateLayerPanel && typeof window.updateLayerPanel === "function") {
    //        window.updateLayerPanel();
    //    }
    //    if (window.updateAxisDropZones && typeof window.updateAxisDropZones === "function") {
    //        window.updateAxisDropZones();
    //    }
    //    if (window.updateCanvasProperties && typeof window.updateCanvasProperties === "function") {
    //        window.updateCanvasProperties();
    //    }
    //    // NEW: Trigger a re-render of the chart images so the dynamic layer updates.
    //    // Using default parameters (e.g., no mouse offset and current zoom)
    //    this.updateAllLayerImageTransforms(this.container, 0, 0, this.state.zoom);
//
    //    // NEW: Call tryGenerateChartForActiveLayer() via the global editorController.
    //    if (window.editorController && typeof window.editorController.tryGenerateChartForActiveLayer === "function") {
    //        // Assume DataSource and zoom slider exist globally (adjust parameter passing as needed)
    //        // const zoomSlider = document.getElementById("zoom");
    //        // const currentZoom = this.state.zoom;
    //        console.log("ParallaxChart, tryGenerateChartForActiveLayer:");
    //        // Here, window.DataSource should be defined in your editor context.
    //        window.editorController.tryGenerateChartForActiveLayer();
    //    }
    //    // NEW: Call editor.js functions after state restoration.
    //    if (window.updateAxisDropZones && typeof window.updateAxisDropZones === "function") {
    //        console.log("Calling updateAxisDropZones after state restoration.");
    //        window.updateAxisDropZones();
    //    }
    //    if (this.state.currentLayerIndex >= 0 && window.editorController && typeof window.editorController.generateChartImage === "function") {
    //        console.log("Calling generateChartImage this.state.currentLayerIndex:", this.state.currentLayerIndex);
    //        console.log("this.state.layers:", this.state.layers);
    //        console.log("this.state.layers[this.state.currentLayerIndex]:", this.state.layers[this.state.currentLayerIndex]);
    //        window.editorController.generateChartImage(this.state.layers[this.state.currentLayerIndex]);
    //        console.log("Calling generateChartImage for current layer after state restoration.");
    //    }
    //    if (window.render && typeof window.render === "function") {
    //        console.log("Calling render() after state restoration.");
    //        window.render();
    //    }
    //    
    //    // Also call tryGenerateChartForActiveLayer via editorController if available.
    //    if (window.editorController && typeof window.editorController.tryGenerateChartForActiveLayer === "function") {
    //        window.editorController.tryGenerateChartForActiveLayer();
    //    }
    //}
}

// Export for module usage (or attach to window for a browser environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = ParallaxChart;
} else {
  window.parallaxChart = new ParallaxChart();
}