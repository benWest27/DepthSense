class ParallaxService {
    constructor() {
        this.state = {
            focalPoint: { x: 0.5, y: 0.5 },
            zoom: 1,
            markerSize: 5,
            layers: [],
        };
    }

    /**
     * Updates the visualization state
     * @param {Object} newState - New state properties to update
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Applies parallax effect to layers based on focal point and zoom
     * @returns {Array} Transformed layers with adjusted positions
     */
    applyParallax() {
        return this.state.layers.map(layer => {
            const offsetX = (layer.z * (this.state.focalPoint.x - 0.5)) * 100;
            const offsetY = (layer.z * (this.state.focalPoint.y - 0.5)) * 100;
            return {
                ...layer,
                transformedData: layer.data.map(point => ({
                    x: point.x + offsetX * this.state.zoom,
                    y: point.y + offsetY * this.state.zoom,
                    size: this.state.markerSize
                }))
            };
        });
    }

    /**
     * Adds a new layer to the visualization
     * @param {Number} z - Depth value (higher = farther)
     * @param {String} color - Layer color
     * @param {Array} data - Data points [{x, y}]
     */
    addLayer(z, color, data = []) {
        this.state.layers.push({ z, color, data });
    }

    /**
     * Removes a layer by index
     * @param {Number} index - Index of the layer to remove
     */
    removeLayer(index) {
        this.state.layers.splice(index, 1);
    }

    /**
     * Updates a layer's color
     * @param {Number} index - Index of the layer
     * @param {String} color - New color
     */
    updateLayerColor(index, color) {
        if (this.state.layers[index]) {
            this.state.layers[index].color = color;
        }
    }

    /**
     * Renders visualization data with parallax adjustments
     * @returns {Array} Processed visualization layers
     */
    renderVisualization() {
        return this.applyParallax();
    }
}

module.exports = new ParallaxService();
