import type { Candle, Theme, VisibleRange } from '@edge/chart-core';
import type { PriceScaleSide } from '@edge/chart-core/layout';
import { plotHeight, plotLeftOffset, plotWidth } from '@edge/chart-core/layout';
import type { RequiredChartSettings } from '../chartSettings';
import { resolveSymbolColors } from '../chartSettings';
import { withAlphaByte } from './webglContext';
import {
  buildCandleGeometry,
  isWebGLSupportedChartType,
  type CandleChartType,
  type FillGeometry,
  type LineGeometry,
} from './candleGeometry';
import {
  colorToRgba,
  createWebGL2Context,
  linkProgram,
  type GL2,
} from './webglContext';

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

/** Offscreen WebGL2 renderer for main-pane OHLC geometry; blits into the 2D pane canvas. */
export class CandleWebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: GL2 | null = null;
  private fillProgram: GLProgramBundle | null = null;
  private lineProgram: GLProgramBundle | null = null;
  private fillBuffer: WebGLBuffer | null = null;
  private lineBuffer: WebGLBuffer | null = null;
  private width = 0;
  private height = 0;
  private cachedCandleCount = -1;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
  }

  /** Attempt WebGL2 init. Returns false when unavailable (headless, blocked, etc.). */
  tryCreate(): boolean {
    if (this.gl) return true;
    const gl = createWebGL2Context(this.canvas);
    if (!gl) return false;

    const fillProgram = this.createProgramBundle(gl, FRAG_FILL_SRC);
    const lineProgram = this.createProgramBundle(gl, FRAG_LINE_SRC);
    if (!fillProgram || !lineProgram) {
      return false;
    }

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
    this.cachedCandleCount = -1;
  }

  /** Render candles to the offscreen WebGL canvas, then composite into the pane 2D context. */
  drawInto(
    ctx: CanvasRenderingContext2D,
    params: {
      candles: Candle[];
      vp: VisibleRange;
      theme: Theme;
      chartType: string;
      chartSettings: RequiredChartSettings;
      effectiveShowTimeAxis: boolean;
      width: number;
      height: number;
      priceScaleSide: PriceScaleSide;
    },
  ): boolean {
    if (!this.isReady()) return false;
    if (!isWebGLSupportedChartType(params.chartType)) return false;

    const {
      candles,
      vp,
      theme,
      chartType,
      chartSettings,
      effectiveShowTimeAxis,
      width,
      height,
      priceScaleSide,
    } = params;
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

    const batch = buildCandleGeometry(
      candles,
      vp,
      chartType as CandleChartType,
      chartSettings,
      theme,
    );
    const colors = resolveSymbolColors(chartSettings.symbol, theme);

    if (chartType === 'area') {
      const fillColor = colorToRgba(withAlphaByte(colors.up, 0x33));
      const strokeColor = colorToRgba(colors.up);
      this.drawFill(gl, batch.areaFill, fillColor, width, height);
      this.drawLines(gl, batch.areaStroke, strokeColor, width, height, 2);
    } else {
      this.drawFill(gl, batch.bodiesUp, colorToRgba(colors.up), width, height);
      this.drawFill(gl, batch.bodiesDown, colorToRgba(colors.down), width, height);
      if (chartSettings.symbol.showWicks) {
        this.drawLines(gl, batch.wicksUp, colorToRgba(colors.wickUp), width, height, 1);
        this.drawLines(gl, batch.wicksDown, colorToRgba(colors.wickDown), width, height, 1);
      }
      if (chartType === 'ohlc') {
        this.drawLines(gl, batch.ohlcUp, colorToRgba(colors.up), width, height, 2);
        this.drawLines(gl, batch.ohlcDown, colorToRgba(colors.down), width, height, 2);
      }
    }

    gl.disable(gl.SCISSOR_TEST);
    this.cachedCandleCount = candles.length;
    ctx.drawImage(this.canvas, 0, 0);
    return true;
  }

  getCachedCandleCount(): number {
    return this.cachedCandleCount;
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

/** Dev/test flag: `NEXT_PUBLIC_WEBGL_CANDLES=1` enables WebGL candle backend when GL is available. */
let webglCandlesPreferredOverride: boolean | null = null;

export function isWebGLCandlesPreferred(): boolean {
  if (webglCandlesPreferredOverride != null) return webglCandlesPreferredOverride;
  const flag = readEnvFlag('NEXT_PUBLIC_WEBGL_CANDLES');
  return flag === '1' || flag === 'true';
}

/** Test hook to force WebGL preference without env vars. */
export function setWebGLCandlesPreferred(preferred: boolean | null): void {
  webglCandlesPreferredOverride = preferred;
}
