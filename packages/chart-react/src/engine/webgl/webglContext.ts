/** Low-level WebGL2 helpers for the candle renderer. */

export type GL2 = WebGL2RenderingContext;

declare global {
  // eslint-disable-next-line no-var
  var __edgeWebGLLiveContextCount: number | undefined;
}

function incrementLiveContextCount(): void {
  if (typeof globalThis === 'undefined') return;
  const current = globalThis.__edgeWebGLLiveContextCount ?? 0;
  globalThis.__edgeWebGLLiveContextCount = current + 1;
}

function decrementLiveContextCount(): void {
  if (typeof globalThis === 'undefined') return;
  const current = globalThis.__edgeWebGLLiveContextCount ?? 0;
  globalThis.__edgeWebGLLiveContextCount = Math.max(0, current - 1);
}

export function getWebGLLiveContextCount(): number {
  return globalThis.__edgeWebGLLiveContextCount ?? 0;
}

export function createWebGL2Context(
  canvas: HTMLCanvasElement,
): GL2 | null {
  try {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (gl instanceof WebGL2RenderingContext) {
      incrementLiveContextCount();
      return gl;
    }
    return null;
  } catch {
    return null;
  }
}

/** Release a WebGL2 context and keep the lab live-context counter accurate. */
export function releaseWebGL2Context(gl: GL2 | null): void {
  if (!gl) return;
  const loseExt = gl.getExtension('WEBGL_lose_context');
  loseExt?.loseContext();
  decrementLiveContextCount();
}

export function compileShader(
  gl: GL2,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function linkProgram(
  gl: GL2,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** Parse #RRGGBB or #RRGGBBAA into normalized RGBA. */
export function colorToRgba(color: string): [number, number, number, number] {
  const hex = color.startsWith('#') ? color.slice(1) : color;
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
      1,
    ];
  }
  if (hex.length === 8) {
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
      parseInt(hex.slice(6, 8), 16) / 255,
    ];
  }
  return [1, 1, 1, 1];
}

/** Append #RRGGBB + alpha byte (0–255). */
export function withAlphaByte(color: string, alphaByte: number): string {
  const base = color.startsWith('#') ? color.slice(1, 7) : color.slice(0, 6);
  const a = Math.max(0, Math.min(255, alphaByte)).toString(16).padStart(2, '0');
  return `#${base}${a}`;
}
