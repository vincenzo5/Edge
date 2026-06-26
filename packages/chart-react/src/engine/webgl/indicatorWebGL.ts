import type { IndicatorConfig, Theme, VisibleRange } from '@edge/chart-core';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import { plotHeight, plotLeftOffset, plotWidth } from '@edge/chart-core/layout';
import type { FillGeometry, LineGeometry } from './candleGeometry';
import { buildIndicatorDrawBatches, type IndicatorDrawBatch } from './indicatorGeometry';
import { colorToRgba, createWebGL2Context, linkProgram, type GL2 } from './webglContext';

const VERT_SRC = `#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const FRAG_FILL_SRC = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

const FRAG_LINE_SRC = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

type GLProgramBundle = {
  program: WebGLProgram;
  positionLoc: number;
  resolutionLoc: WebGLUniformLocation | null;
  colorLoc: WebGLUniformLocation | null;
};

/** Offscreen WebGL2 renderer for declarative indicator line/histogram series. */
export class IndicatorWebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: GL2 | null = null;
  private fillProgram: GLProgramBundle | null = null;
  private lineProgram: GLProgramBundle | null = null;
  private fillBuffer: WebGLBuffer | null = null;
  private lineBuffer: WebGLBuffer | null = null;
  private width = 0;
  private height = 0;
  private lastBatchCount = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
  }

  tryCreate(): boolean {
    if (this.gl) return true;
    const gl = createWebGL2Context(this.canvas);
    if (!gl) return false;

    const fillProgram = this.createProgramBundle(gl, FRAG_FILL_SRC);
    const lineProgram = this.createProgramBundle(gl, FRAG_LINE_SRC);
    if (!fillProgram || !lineProgram) return false;

    this.gl = gl;
    this.fillProgram = fillProgram;
    this.lineProgram = lineProgram;
    this.fillBuffer = gl.createBuffer();
    this.lineBuffer = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  isReady(): boolean {
    return this.gl != null && this.fillProgram != null && this.lineProgram != null;
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.fillBuffer) gl.deleteBuffer(this.fillBuffer);
    if (this.lineBuffer) gl.deleteBuffer(this.lineBuffer);
    if (this.fillProgram) gl.deleteProgram(this.fillProgram.program);
    if (this.lineProgram) gl.deleteProgram(this.lineProgram.program);
    this.gl = null;
    this.fillProgram = null;
    this.lineProgram = null;
    this.fillBuffer = null;
    this.lineBuffer = null;
    this.lastBatchCount = 0;
  }

  drawInto(
    ctx: CanvasRenderingContext2D,
    params: {
      indicators: IndicatorConfig[];
      candles: import('@edge/chart-core').Candle[];
      vp: VisibleRange;
      theme: Theme;
      effectiveShowTimeAxis: boolean;
      width: number;
      height: number;
      priceScaleSide: PriceScaleSide;
    },
  ): boolean {
    if (!this.isReady()) return false;

    const { indicators, candles, vp, theme, effectiveShowTimeAxis, width, height, priceScaleSide } =
      params;
    const batches = buildIndicatorDrawBatches(indicators, candles, vp, theme);
    if (batches.length === 0) return false;

    this.resize(width, height);
    const gl = this.gl!;
    const pw = plotWidth(width, priceScaleSide);
    const ph = plotHeight(height, effectiveShowTimeAxis, vp.reserveEventRail ?? false);
    const plotOffset = plotLeftOffset(priceScaleSide);

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(plotOffset, height - ph, pw, ph);

    for (const batch of batches) {
      if (batch.type === 'histogram') {
        this.drawFill(gl, batch.geometry, colorToRgba(batch.color), width, height);
      } else {
        this.drawLines(
          gl,
          batch.geometry,
          colorToRgba(batch.color),
          width,
          height,
          batch.lineWidth,
        );
      }
    }

    gl.disable(gl.SCISSOR_TEST);
    this.lastBatchCount = batches.length;
    ctx.drawImage(this.canvas, 0, 0);
    return true;
  }

  getLastBatchCount(): number {
    return this.lastBatchCount;
  }

  private createProgramBundle(gl: GL2, fragSrc: string): GLProgramBundle | null {
    const program = linkProgram(gl, VERT_SRC, fragSrc);
    if (!program) return null;
    return {
      program,
      positionLoc: gl.getAttribLocation(program, 'a_position'),
      resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
      colorLoc: gl.getUniformLocation(program, 'u_color'),
    };
  }

  private drawFill(
    gl: GL2,
    geometry: FillGeometry,
    color: [number, number, number, number],
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (geometry.vertexCount < 3 || !this.fillProgram || !this.fillBuffer) return;
    const bundle = this.fillProgram;
    gl.useProgram(bundle.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(bundle.positionLoc);
    gl.vertexAttribPointer(bundle.positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(bundle.resolutionLoc, canvasWidth, canvasHeight);
    gl.uniform4f(bundle.colorLoc, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, geometry.vertexCount);
  }

  private drawLines(
    gl: GL2,
    geometry: LineGeometry,
    color: [number, number, number, number],
    canvasWidth: number,
    canvasHeight: number,
    lineWidth: number,
  ): void {
    if (geometry.vertexCount < 2 || !this.lineProgram || !this.lineBuffer) return;
    const bundle = this.lineProgram;
    gl.useProgram(bundle.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.enableVertexAttribArray(bundle.positionLoc);
    gl.vertexAttribPointer(bundle.positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.DYNAMIC_DRAW);
    gl.uniform2f(bundle.resolutionLoc, canvasWidth, canvasHeight);
    gl.uniform4f(bundle.colorLoc, color[0], color[1], color[2], color[3]);
    gl.lineWidth(lineWidth);
    gl.drawArrays(gl.LINES, 0, geometry.vertexCount);
  }
}

function readEnvFlag(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

let webglIndicatorsPreferredOverride: boolean | null = null;

/** Dev/test flag: `NEXT_PUBLIC_WEBGL_INDICATORS=1` enables WebGL indicator backend when GL is available. */
export function isWebGLIndicatorsPreferred(): boolean {
  if (webglIndicatorsPreferredOverride != null) return webglIndicatorsPreferredOverride;
  const flag = readEnvFlag('NEXT_PUBLIC_WEBGL_INDICATORS');
  return flag === '1' || flag === 'true';
}

export function setWebGLIndicatorsPreferred(preferred: boolean | null): void {
  webglIndicatorsPreferredOverride = preferred;
}
