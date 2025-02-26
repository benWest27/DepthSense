document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("visualization-canvas");
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    let state = {
        focalPoint: { x: 0.5, y: 0.5 },
        zoom: 1,
        markerSize: 5,
        mouseControl: false,
        sliderFocal: true,
        layers: [],
        dataSource: null
    };

    document.getElementById("horizontal-focal").addEventListener("input", (e) => {
        if (state.sliderFocal) {
            state.focalPoint.x = e.target.value / 100;
            render();
        }
    });

    document.getElementById("vertical-focal").addEventListener("input", (e) => {
        if (state.sliderFocal) {
            state.focalPoint.y = e.target.value / 100;
            render();
        }
    });

    document.getElementById("zoom").addEventListener("input", (e) => {
        state.zoom = parseFloat(e.target.value);
        render();
    });

    document.getElementById("marker-size").addEventListener("input", (e) => {
        state.markerSize = parseInt(e.target.value);
        render();
    });

    document.getElementById("toggle-mouse-control").addEventListener("click", () => {
        state.mouseControl = !state.mouseControl;
    });

    document.getElementById("toggle-focal-mode").addEventListener("click", () => {
        state.sliderFocal = !state.sliderFocal;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (state.mouseControl && !state.sliderFocal) {
            state.focalPoint.x = e.offsetX / canvas.width;
            state.focalPoint.y = e.offsetY / canvas.height;
            render();
        }
    });

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.layers.sort((a, b) => b.z - a.z).forEach(layer => {
            const offsetX = (layer.z * (state.focalPoint.x - 0.5)) * canvas.width;
            const offsetY = (layer.z * (state.focalPoint.y - 0.5)) * canvas.height;
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(state.zoom, state.zoom);
            layer.data.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, state.markerSize, 0, Math.PI * 2);
                ctx.fillStyle = layer.color;
                ctx.fill();
            });
            ctx.restore();
        });
    }

    function addLayer() {
        const newLayer = {
            z: Math.random(),
            color: `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`,
            data: []
        };
        state.layers.push(newLayer);
        render();
    }

    document.getElementById("add-layer").addEventListener("click", addLayer);
    
    state.layers = [
        { z: 0.1, color: "rgba(255, 0, 0, 0.5)", data: [{x: 0.2, y: 0.3}, {x: 0.8, y: 0.7}] },
        { z: 0.5, color: "rgba(0, 255, 0, 0.5)", data: [{x: 0.4, y: 0.6}, {x: 0.6, y: 0.4}] },
    ];

    render();
});
