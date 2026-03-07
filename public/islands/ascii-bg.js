// WebGL2 ASCII background shader
// Receives reaction-diffusion field from rd-worker, renders as ASCII characters
// Audio level uniform modulates contrast when Webamp plays

(function () {
  if (window.__asciiBgInit) return;
  window.__asciiBgInit = true;
  const canvas = document.getElementById('ascii-bg');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) return;

  // --- Config ---
  const CHARS = ' .:-=+*#%@';
  const CELL_W = 8;
  const CELL_H = 16;
  const RD_SIZE = 128;

  let audioLevel = 0;
  window.__setAsciiAudioLevel = function (level) {
    audioLevel = level;
  };

  // --- Char Atlas ---
  function buildCharAtlas() {
    const c = document.createElement('canvas');
    const cols = CHARS.length;
    c.width = CELL_W * cols;
    c.height = CELL_H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = `${CELL_H - 2}px "JetBrains Mono", "Courier New", monospace`;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    for (let i = 0; i < cols; i++) {
      ctx.fillText(CHARS[i], i * CELL_W + 1, 1);
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  // --- RD Field Texture ---
  const rdTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, rdTex);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.R32F, RD_SIZE, RD_SIZE, 0,
    gl.RED, gl.FLOAT, new Float32Array(RD_SIZE * RD_SIZE)
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // --- Shaders ---
  const VERT = `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

  const FRAG = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 fragColor;

    uniform sampler2D u_charAtlas;
    uniform sampler2D u_rdField;
    uniform vec2 u_resolution;
    uniform float u_numChars;
    uniform float u_cellW;
    uniform float u_cellH;
    uniform float u_audioLevel;

    void main() {
      // Which cell are we in?
      vec2 cellCount = floor(u_resolution / vec2(u_cellW, u_cellH));
      vec2 cellId = floor(v_uv * cellCount);
      vec2 cellUv = fract(v_uv * cellCount);

      // Sample RD field at cell center
      vec2 rdUv = (cellId + 0.5) / cellCount;
      float rdVal = texture(u_rdField, rdUv).r;

      // Audio modulates contrast
      float contrast = 1.0 + u_audioLevel * 0.5;
      rdVal = clamp(rdVal * contrast, 0.0, 1.0);

      // Map value to char index
      float charIdx = floor(rdVal * (u_numChars - 1.0));

      // Sample char atlas
      float atlasX = (charIdx * u_cellW + cellUv.x * u_cellW) / (u_numChars * u_cellW);
      float atlasY = cellUv.y;
      float charSample = texture(u_charAtlas, vec2(atlasX, atlasY)).r;

      // Visible but restrained — warm gold on void
      vec3 bgColor = vec3(0.02);  // just above void
      vec3 charColor = vec3(0.28, 0.22, 0.12);  // warm gold, readable
      float warmBoost = u_audioLevel * 0.15;
      charColor += vec3(warmBoost, warmBoost * 0.6, 0.0);

      // RD field drives both char selection and brightness
      float brightness = rdVal * 1.8;
      vec3 color = mix(bgColor, charColor * brightness, charSample * clamp(rdVal * 2.0, 0.0, 1.0));
      fragColor = vec4(color, 1.0);
    }`;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('ASCII shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compileShader(VERT, gl.VERTEX_SHADER);
  const fs = compileShader(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('ASCII shader link error:', gl.getProgramInfoLog(program));
    return;
  }

  // --- Geometry: fullscreen quad ---
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // --- Uniforms ---
  gl.useProgram(program);
  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uNumChars = gl.getUniformLocation(program, 'u_numChars');
  const uCellW = gl.getUniformLocation(program, 'u_cellW');
  const uCellH = gl.getUniformLocation(program, 'u_cellH');
  const uAudioLevel = gl.getUniformLocation(program, 'u_audioLevel');
  const uCharAtlas = gl.getUniformLocation(program, 'u_charAtlas');
  const uRdField = gl.getUniformLocation(program, 'u_rdField');

  gl.uniform1f(uNumChars, CHARS.length);
  gl.uniform1f(uCellW, CELL_W);
  gl.uniform1f(uCellH, CELL_H);
  gl.uniform1i(uCharAtlas, 0);
  gl.uniform1i(uRdField, 1);

  const charAtlasTex = buildCharAtlas();

  // --- Resize ---
  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- RD Worker ---
  let worker = null;
  try {
    const workerUrl = new URL('./rd-worker.js', import.meta.url);
    worker = new Worker(workerUrl);

    worker.onmessage = function (e) {
      const field = e.data;
      gl.bindTexture(gl.TEXTURE_2D, rdTex);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, RD_SIZE, RD_SIZE,
        gl.RED, gl.FLOAT, field
      );
      // Request next computation
      worker.postMessage(null);
    };

    // Kick off first computation
    worker.postMessage(null);
  } catch (err) {
    console.warn('RD worker failed to start:', err.message);
  }

  // --- Render loop ---
  function render() {
    gl.useProgram(program);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uAudioLevel, audioLevel);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, charAtlasTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rdTex);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
