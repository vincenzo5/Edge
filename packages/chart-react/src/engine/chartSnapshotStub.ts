export class SnapshotCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotCaptureError';
  }
}

export type SnapshotCaptureOptions = {
  backgroundColor?: string;
  pixelRatio?: number;
};

export function captureChartElement(): Promise<Blob> {
  return Promise.reject(new SnapshotCaptureError('Snapshot capture is not available in the public chart package'));
}
