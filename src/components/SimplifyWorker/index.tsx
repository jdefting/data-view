export type SimplifyWorkerRequest = {
  values: number[];
  // screen pixels
  channelHeight: number;
  valueRange: [number, number];
  // world units
  viewBounds: [number, number];
}[];

export interface Point {
  x: number;
  y: number;
}

export const simplifyValues = (
  worker: Worker,
  data: SimplifyWorkerRequest
): Promise<Point[][]> => {
  return new Promise((resolve) => {
    worker.onmessage = (event: MessageEvent<Point[][]>) => {
      return resolve(event.data);
    };

    worker.postMessage(data);
  });
};
