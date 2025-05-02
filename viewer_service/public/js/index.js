document.addEventListener("DOMContentLoaded", () => {
  const staticLayer = document.getElementById("static-layer");
  const dynamicLayer = document.getElementById("dynamic-layer");
  
  if (window.initialVisualization && window.initialVisualization.data) {
    // Assume visualization.data contains chart config or simple data to render a chart.
    const ctx = dynamicLayer.getContext("2d");
    const vizData = window.initialVisualization.data;
    // Use provided chartConfig if available, or default to a sample bar chart.
    const chartConfig = vizData.chartConfig || {
      type: "bar",
      data: {
        labels: vizData.labels || ["A", "B", "C", "D"],
        datasets: [{
          label: vizData.title || "Visualization",
          data: vizData.values || [10, 20, 30, 40],
          backgroundColor: "rgba(0,123,255,0.5)",
          borderColor: "rgba(0,123,255,1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
    new Chart(ctx, chartConfig);
  } else {
    // Fallback display if no visualization data is available.
    const container = document.getElementById("canvas-container");
    container.innerHTML = "<p style='color: red; text-align: center;'>No visualization data available.</p>";
  }
});