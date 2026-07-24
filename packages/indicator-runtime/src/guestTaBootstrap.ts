/**
 * Guest-side TA bootstrap injected into QuickJS.
 * Keep in sync with host implementations in taSdk.ts.
 */
export const GUEST_TA_BOOTSTRAP = `
const __edgeWilderSmooth = function(values, period, n) {
  const wout = new Array(n).fill(null);
  if (n < period) return wout;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  wout[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    if (wout[i - 1] != null) wout[i] = (wout[i - 1] * (period - 1) + values[i]) / period;
  }
  return wout;
};
const __edgeTa = {
  sma(values, period) {
    const out = new Array(values.length).fill(null);
    if (period < 1) return out;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v == null || !Number.isFinite(v)) { sum = 0; count = 0; continue; }
      sum += v; count += 1;
      if (count > period) {
        const old = values[i - period];
        if (old != null && Number.isFinite(old)) { sum -= old; count -= 1; }
      }
      if (count >= period) out[i] = sum / period;
    }
    return out;
  },
  ema(values, period) {
    const out = new Array(values.length).fill(null);
    if (period < 1) return out;
    const k = 2 / (period + 1);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v == null || !Number.isFinite(v)) { out[i] = null; prev = null; continue; }
      prev = prev == null ? v : v * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  },
  wma(values, period) {
    const out = new Array(values.length).fill(null);
    if (period < 1) return out;
    const denom = (period * (period + 1)) / 2;
    for (let i = period - 1; i < values.length; i++) {
      let sum = 0;
      let valid = true;
      for (let j = 0; j < period; j++) {
        const v = values[i - period + 1 + j];
        if (v == null || !Number.isFinite(v)) { valid = false; break; }
        sum += v * (j + 1);
      }
      if (valid) out[i] = sum / denom;
    }
    return out;
  },
  vwma(candles, period) {
    const out = new Array(candles.length).fill(null);
    if (period < 1) return out;
    for (let i = period - 1; i < candles.length; i++) {
      let sumPv = 0;
      let sumV = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const c = candles[j];
        const vol = c.v != null ? c.v : 0;
        sumPv += c.c * vol;
        sumV += vol;
      }
      if (sumV > 0) out[i] = sumPv / sumV;
    }
    return out;
  },
  stddev(values, period, mean) {
    const out = new Array(values.length).fill(null);
    const means = mean || __edgeTa.sma(values, period);
    for (let i = period - 1; i < values.length; i++) {
      const m = means[i];
      if (m == null) continue;
      let sumSq = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const v = values[j];
        if (v == null || !Number.isFinite(v)) continue;
        sumSq += (v - m) * (v - m);
        count += 1;
      }
      if (count >= period) out[i] = Math.sqrt(sumSq / period);
    }
    return out;
  },
  rsi(closes, period) {
    const out = new Array(closes.length).fill(null);
    if (period < 1 || closes.length === 0) return out;
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i < closes.length; i++) {
      const cur = closes[i];
      const prev = closes[i - 1];
      if (cur == null || prev == null) continue;
      const change = cur - prev;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      if (i <= period) {
        avgGain += gain;
        avgLoss += loss;
        if (i === period) {
          avgGain /= period;
          avgLoss /= period;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          out[i] = 100 - 100 / (1 + rs);
        }
        continue;
      }
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
    return out;
  },
  highest(values, period) {
    const out = new Array(values.length).fill(null);
    if (period < 1) return out;
    for (let i = period - 1; i < values.length; i++) {
      let max = null;
      for (let j = i - period + 1; j <= i; j++) {
        const v = values[j];
        if (v == null || !Number.isFinite(v)) continue;
        max = max == null ? v : Math.max(max, v);
      }
      out[i] = max;
    }
    return out;
  },
  lowest(values, period) {
    const out = new Array(values.length).fill(null);
    if (period < 1) return out;
    for (let i = period - 1; i < values.length; i++) {
      let min = null;
      for (let j = i - period + 1; j <= i; j++) {
        const v = values[j];
        if (v == null || !Number.isFinite(v)) continue;
        min = min == null ? v : Math.min(min, v);
      }
      out[i] = min;
    }
    return out;
  },
  roc(closes, period) {
    const out = new Array(closes.length).fill(null);
    if (period < 1) return out;
    for (let i = period; i < closes.length; i++) {
      const cur = closes[i];
      const prev = closes[i - period];
      if (cur == null || prev == null || prev === 0) continue;
      out[i] = ((cur - prev) / prev) * 100;
    }
    return out;
  },
  change(series, length) {
    const len = length != null ? length : 1;
    const out = new Array(series.length).fill(null);
    if (len < 1) return out;
    for (let i = len; i < series.length; i++) {
      const cur = series[i];
      const prev = series[i - len];
      if (cur == null || prev == null) continue;
      out[i] = cur - prev;
    }
    return out;
  },
  percentChange(series, length) {
    const len = length != null ? length : 1;
    const out = new Array(series.length).fill(null);
    if (len < 1) return out;
    for (let i = len; i < series.length; i++) {
      const cur = series[i];
      const prev = series[i - len];
      if (cur == null || prev == null || prev === 0) continue;
      out[i] = ((cur - prev) / prev) * 100;
    }
    return out;
  },
  crossover(a, b) {
    const n = Math.min(a.length, b.length);
    const out = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const a0 = a[i - 1];
      const b0 = b[i - 1];
      const a1 = a[i];
      const b1 = b[i];
      if (a0 == null || b0 == null || a1 == null || b1 == null) { out[i] = null; continue; }
      out[i] = a0 <= b0 && a1 > b1 ? 1 : 0;
    }
    return out;
  },
  crossunder(a, b) {
    const n = Math.min(a.length, b.length);
    const out = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const a0 = a[i - 1];
      const b0 = b[i - 1];
      const a1 = a[i];
      const b1 = b[i];
      if (a0 == null || b0 == null || a1 == null || b1 == null) { out[i] = null; continue; }
      out[i] = a0 >= b0 && a1 < b1 ? 1 : 0;
    }
    return out;
  },
  macd(closes, fast, slow, signalPeriod) {
    const f = fast != null ? fast : 12;
    const s = slow != null ? slow : 26;
    const sig = signalPeriod != null ? signalPeriod : 9;
    const n = closes.length;
    const macdLine = new Array(n).fill(null);
    const signalLine = new Array(n).fill(null);
    const histogram = new Array(n).fill(null);
    const emaFast = __edgeTa.ema(closes, f);
    const emaSlow = __edgeTa.ema(closes, s);
    for (let i = 0; i < n; i++) {
      const ef = emaFast[i];
      const es = emaSlow[i];
      if (ef != null && es != null) macdLine[i] = ef - es;
    }
    const signalEma = __edgeTa.ema(macdLine, sig);
    for (let i = 0; i < n; i++) {
      signalLine[i] = signalEma[i];
      const m = macdLine[i];
      const sg = signalLine[i];
      if (m != null && sg != null) histogram[i] = m - sg;
    }
    return { macd: macdLine, signal: signalLine, histogram: histogram };
  },
  stoch(candles, kPeriod, dPeriod) {
    const kp = kPeriod != null ? kPeriod : 9;
    const dp = dPeriod != null ? dPeriod : 3;
    const n = candles.length;
    const k = new Array(n).fill(null);
    for (let i = kp - 1; i < n; i++) {
      let hi = null;
      let lo = null;
      for (let j = i - kp + 1; j <= i; j++) {
        const c = candles[j];
        hi = hi == null ? c.h : Math.max(hi, c.h);
        lo = lo == null ? c.l : Math.min(lo, c.l);
      }
      const close = candles[i].c;
      if (hi != null && lo != null) {
        const range = hi - lo;
        k[i] = range > 0 ? (100 * (close - lo)) / range : 50;
      }
    }
    const d = __edgeTa.sma(k, dp);
    return { k: k, d: d };
  },
  bollinger(closes, period, mult) {
    const p = period != null ? period : 20;
    const m = mult != null ? mult : 2;
    const n = closes.length;
    const middle = __edgeTa.sma(closes, p);
    const dev = __edgeTa.stddev(closes, p, middle);
    const upper = new Array(n).fill(null);
    const lower = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const mid = middle[i];
      const sd = dev[i];
      if (mid != null && sd != null) {
        upper[i] = mid + m * sd;
        lower[i] = mid - m * sd;
      }
    }
    return { middle: middle, upper: upper, lower: lower };
  },
  cci(candles, period) {
    const p = period != null ? period : 20;
    const n = candles.length;
    const out = new Array(n).fill(null);
    const tp = candles.map((c) => (c.h + c.l + c.c) / 3);
    const meanTp = __edgeTa.sma(tp, p);
    for (let i = p - 1; i < n; i++) {
      const m = meanTp[i];
      if (m == null) continue;
      let md = 0;
      for (let j = i - p + 1; j <= i; j++) md += Math.abs(tp[j] - m);
      md /= p;
      if (md > 0) out[i] = (tp[i] - m) / (0.015 * md);
    }
    return out;
  },
  obv(candles) {
    const n = candles.length;
    const out = new Array(n).fill(null);
    if (n === 0) return out;
    out[0] = 0;
    for (let i = 1; i < n; i++) {
      const vol = candles[i].v != null ? candles[i].v : 0;
      const prev = out[i - 1] != null ? out[i - 1] : 0;
      const curClose = candles[i].c;
      const prevClose = candles[i - 1].c;
      if (curClose > prevClose) out[i] = prev + vol;
      else if (curClose < prevClose) out[i] = prev - vol;
      else out[i] = prev;
    }
    return out;
  },
  dmi(candles, diPeriod, adxSmoothing) {
    const dp = diPeriod != null ? diPeriod : 14;
    const asp = adxSmoothing != null ? adxSmoothing : 14;
    const n = candles.length;
    const plusDi = new Array(n).fill(null);
    const minusDi = new Array(n).fill(null);
    const adx = new Array(n).fill(null);
    if (n < dp) return { plusDi: plusDi, minusDi: minusDi, adx: adx };
    const tr = new Array(n).fill(0);
    const plusDm = new Array(n).fill(0);
    const minusDm = new Array(n).fill(0);
    tr[0] = candles[0].h - candles[0].l;
    for (let i = 1; i < n; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const upMove = c.h - prev.h;
      const downMove = prev.l - c.l;
      plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
      minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
      tr[i] = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
    }
    const wilder = (values, period) => __edgeWilderSmooth(values, period, n);
    const smoothTr = wilder(tr, dp);
    const smoothPlusDm = wilder(plusDm, dp);
    const smoothMinusDm = wilder(minusDm, dp);
    const dx = new Array(n).fill(null);
    for (let i = dp - 1; i < n; i++) {
      const str = smoothTr[i];
      if (str == null || str === 0) continue;
      const pdi = (100 * (smoothPlusDm[i] != null ? smoothPlusDm[i] : 0)) / str;
      const mdi = (100 * (smoothMinusDm[i] != null ? smoothMinusDm[i] : 0)) / str;
      plusDi[i] = pdi;
      minusDi[i] = mdi;
      const sumDi = pdi + mdi;
      if (sumDi > 0) dx[i] = (100 * Math.abs(pdi - mdi)) / sumDi;
    }
    const adxStart = 2 * dp - 2;
    if (n > adxStart) {
      let adxSum = 0;
      for (let i = dp - 1; i <= adxStart; i++) adxSum += dx[i] != null ? dx[i] : 0;
      adx[adxStart] = adxSum / dp;
      for (let i = adxStart + 1; i < n; i++) {
        const prevAdx = adx[i - 1];
        const curDx = dx[i];
        if (prevAdx != null && curDx != null) {
          adx[i] = (prevAdx * (asp - 1) + curDx) / asp;
        }
      }
    }
    return { plusDi: plusDi, minusDi: minusDi, adx: adx };
  },
  atr(candles, period) {
    const out = new Array(candles.length).fill(null);
    if (period < 1 || candles.length === 0) return out;
    const tr = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = i > 0 ? candles[i - 1].c : c.c;
      tr.push(Math.max(c.h - c.l, Math.abs(c.h - prevClose), Math.abs(c.l - prevClose)));
    }
    return __edgeTa.ema(tr, period);
  },
  source(candles, priceSource) {
    return candles.map((c) => {
      let value;
      switch (priceSource) {
        case 'open': value = c.o; break;
        case 'high': value = c.h; break;
        case 'low': value = c.l; break;
        case 'hlc3': value = (c.h + c.l + c.c) / 3; break;
        case 'ohlcv': value = c.v; break;
        case 'close':
        default: value = c.c; break;
      }
      return Number.isFinite(value) ? value : null;
    });
  },
};
`;
