import simplify from "simplify-js";
import { Point, SimplifyWorkerRequest } from "./index";

const getRelativePoints = (
  values: number[],
  // screen pixels
  channelHeight: number,
  valueRange: [number, number],
  // world unit
  viewBounds: [number, number]
): Point[] => {
  const [minVal, maxVal] = valueRange;
  const [viewStart, viewEnd] = viewBounds;
  const viewLength = viewEnd - viewStart;

  const rawPoints = values.map((value, i) => {
    const yPercent = (value - minVal) / (maxVal - minVal);
    return {
      y: (1 - yPercent) * channelHeight,
      x: viewStart + i * (viewLength / values.length),
    };
  });

  // simplification should be relative to channelHeight and viewLength
  const simplificationAmount = 13; // (higher -> less simplification)
  const relativeTolerance =
    channelHeight * viewLength * simplificationAmount ** -5;

  return simplify(rawPoints, relativeTolerance);
};

onmessage = ({ data }: MessageEvent<SimplifyWorkerRequest>) => {
  const response = data.map(
    ({ values, channelHeight, valueRange, viewBounds }) => {
      return getRelativePoints(values, channelHeight, valueRange, viewBounds);
    }
  );
  postMessage(response);
};

export {};
