
// --- In parallaxChart.js ---
class ParallaxChart {
    constructor(state, container, dynamicCanvas, ctx) {
      // Use provided state or defaults.
      this.state = state || {
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
          { id: 1, z: 0.1, rowField: null, colField: null, rowdata: [], coldata: [] }
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
      img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${computedZoom * 0.8})`;
      // Compute opacity based on zoom thresholds.
      const fadeStart = 1, fadeEnd = 1.5;
      let alpha;
      if (computedZoom <= fadeStart) {
        alpha = 0.9;
      } else if (computedZoom >= fadeEnd) {
        alpha = 0;
      } else {
        alpha = 1 - ((computedZoom - fadeStart) / (fadeEnd - fadeStart));
      }
      img.style.opacity = alpha;
    }
  
    // Update transforms on all layer images.
    async updateAllLayerImageTransforms(container, currentMouseX, currentMouseY, zoomValue) {
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
  }

// Export for module usage (or attach to window for a browser environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = ParallaxChart;
} else {
  window.parallaxChart = new ParallaxChart();
}