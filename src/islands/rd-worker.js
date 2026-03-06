// Gray-Scott reaction-diffusion Web Worker
// 128x128 grid, 4 steps per message, posts Float32Array v-field via transferable

const W = 128;
const H = 128;
const SIZE = W * H;

// Parameters — coral growth
const Du = 0.16;
const Dv = 0.08;
const f = 0.035;
const k = 0.065;
const dt = 1.0;

// Double-buffered u/v fields
let u0 = new Float32Array(SIZE);
let v0 = new Float32Array(SIZE);
let u1 = new Float32Array(SIZE);
let v1 = new Float32Array(SIZE);

// Initialize: u=1 everywhere, seed v in center square
function init() {
  for (let i = 0; i < SIZE; i++) {
    u0[i] = 1.0;
    v0[i] = 0.0;
  }

  // Seed: small square of v-concentration at center
  const cx = W / 2;
  const cy = H / 2;
  const r = 4;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const idx = y * W + x;
      u0[idx] = 0.5;
      v0[idx] = 0.25;
    }
  }
}

function step() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;

      // Neighbors with wraparound
      const left = y * W + ((x - 1 + W) % W);
      const right = y * W + ((x + 1) % W);
      const up = ((y - 1 + H) % H) * W + x;
      const down = ((y + 1) % H) * W + x;

      // Laplacian
      const lapU = u0[left] + u0[right] + u0[up] + u0[down] - 4 * u0[idx];
      const lapV = v0[left] + v0[right] + v0[up] + v0[down] - 4 * v0[idx];

      const uv2 = u0[idx] * v0[idx] * v0[idx];

      u1[idx] = u0[idx] + (Du * lapU - uv2 + f * (1 - u0[idx])) * dt;
      v1[idx] = v0[idx] + (Dv * lapV + uv2 - (f + k) * v0[idx]) * dt;

      // Clamp
      u1[idx] = Math.max(0, Math.min(1, u1[idx]));
      v1[idx] = Math.max(0, Math.min(1, v1[idx]));
    }
  }

  // Swap buffers
  const tmpU = u0; u0 = u1; u1 = tmpU;
  const tmpV = v0; v0 = v1; v1 = tmpV;
}

init();

self.onmessage = function () {
  // Run 4 simulation steps per message
  for (let i = 0; i < 4; i++) {
    step();
  }

  // Send v-field as transferable
  const out = new Float32Array(v0);
  self.postMessage(out, [out.buffer]);
};
