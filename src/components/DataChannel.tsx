import React, { useCallback, useMemo, useRef } from "react";
import { Container, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { DATA_MAX, DATA_MIN, getRandomData } from "../fake-data";
import { chunk, mean } from "lodash-es";

const DATA_RANGE = DATA_MAX - DATA_MIN;
const DEBUG_MODE = false;
const BACKGROUND_COLOR = 0xaaaaaa;

const colors = [
  0xaa4a44, 0xff7f50, 0x6495ed, 0x9fe2bf, 0xffbf00, 0xf25f5c, 0x50514f,
  0x70c1b3,
];

const convertToWorldY = (value: number, channelHeight: number) => {
  const percent = value / DATA_RANGE;
  return (1 - percent) * channelHeight;
};

const computeData = (
  values: number[],
  viewWidth: number,
  channelHeight: number
): number[] => {
  const pointsPerPixel = values.length / viewWidth;
  const dataChunks = chunk(values, pointsPerPixel);
  return dataChunks
    .map((chunk) => mean(chunk))
    .map((point) => convertToWorldY(point, channelHeight));
};

interface Props {
  dataCount: number;
  lineCount: number;
  height: number;
  worldWidth: number;
  worldViewBounds: [number, number];
  // true screen pixels
  screenWidth: number;
  y: number;
  onPointsRendered: (count: number) => void;
  worldBounds: [number, number];
}

export const DataChannel: React.FC<Props> = ({
  dataCount,
  lineCount,
  height,
  worldWidth,
  worldViewBounds,
  screenWidth,
  y,
  onPointsRendered,
  worldBounds,
}) => {
  const highResTimeout = useRef<number>(0);

  const dataLines = useMemo(() => {
    const lines = [];

    for (let i = 0; i < lineCount; i++) {
      lines.push({
        data: getRandomData(dataCount),
        color: colors[i % colors.length],
      });
    }

    return lines;
  }, [dataCount, lineCount]);

  const drawLowResData = useCallback(
    (g: PIXI.Graphics) => {
      // draw data across the entire world
      g.clear();

      // background
      g.beginFill(DEBUG_MODE ? 0x888888 : BACKGROUND_COLOR);
      g.drawRect(0, 0, worldWidth, height);
      g.endFill();

      dataLines.forEach(({ data, color }) => {
        // data
        const lowResData = computeData(data, worldWidth, height);
        g.lineStyle({
          width: 1,
          color,
          join: PIXI.LINE_JOIN.BEVEL,
        });

        g.moveTo(0, lowResData[0]);
        lowResData.forEach((point, i) => {
          g.lineTo(i, point);
        });
      });
    },
    [worldWidth, height, dataLines]
  );

  const drawHighResData = useCallback(
    (g: PIXI.Graphics) => {
      clearTimeout(highResTimeout.current);

      highResTimeout.current = setTimeout(() => {
        let [viewStart, viewEnd] = worldViewBounds;
        const bufferPercent = DEBUG_MODE ? -0.1 : 0.5;

        const originalViewLength = viewEnd - viewStart;
        const bufferAmount = bufferPercent * originalViewLength;

        viewStart = Math.max(viewStart - bufferAmount, worldBounds[0]);
        viewEnd = Math.min(viewEnd + bufferAmount, worldBounds[1]);

        const bufferRatio = (viewEnd - viewStart) / originalViewLength;

        const viewLength = viewEnd - viewStart;
        const viewLengthScreen = screenWidth * bufferRatio;

        g.clear();

        // background
        g.beginFill(BACKGROUND_COLOR);
        g.drawRect(viewStart, 0, viewLength, height);
        g.endFill();

        console.log('drawing hi res');
        let renderCount = 0;
        dataLines.forEach(({ data, color }) => {
          // only draw data in view
          const startPercent = viewStart / worldWidth;
          const endPercent = viewEnd / worldWidth;
          const startIndex = startPercent * data.length;
          const endIndex = endPercent * data.length;
          const dataInView = data.slice(startIndex, endIndex);
          const pointsPerPixel = Math.max(dataInView.length / viewLengthScreen, 1);

          const dataChunks = chunk(dataInView, pointsPerPixel);
          const highResData = dataChunks.map((chunk) =>
            convertToWorldY(mean(chunk), height)
          );
          const viewPercent = viewLength / viewLengthScreen;

          renderCount += highResData.length;

          // data
          g.lineStyle({
            width: viewPercent * 3,
            color: DEBUG_MODE ? color + 0xaaaaaa : color,
            join: PIXI.LINE_JOIN.BEVEL,
          });
          g.moveTo(viewStart, highResData[0]);
          highResData.forEach((point, i) => {
            g.lineTo(viewStart + i * (viewLength / dataChunks.length), point);
          });
        });

        onPointsRendered(renderCount);
      }, 100);
    },
    [dataLines, screenWidth, worldWidth, height, worldViewBounds]
  );

  const drawLine = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle({
        width: 4,
        color: 0x333333,
        join: PIXI.LINE_JOIN.BEVEL,
      });
      g.moveTo(0, 0);
      g.lineTo(worldWidth, 0);
    },
    [worldWidth, height]
  );

  return (
    <Container y={y}>
      <Graphics x={0} draw={drawLowResData} interactiveChildren={false} />
      <Graphics x={0} draw={drawHighResData} interactiveChildren={false} />
      <Graphics draw={drawLine} y={height + 1} />
    </Container>
  );
};
