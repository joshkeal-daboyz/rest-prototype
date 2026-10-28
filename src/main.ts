// Entry point. Wiring of render, play and ui happens here once their tickets land.
const canvas = document.getElementById("panel") as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e8e2d0";
    ctx.font = "16px system-ui";
    ctx.fillText("Rest: Circuits — nothing to show yet.", 24, 40);
  }
}
