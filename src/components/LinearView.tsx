import React, { useCallback, useRef, useState } from "react";
import { Stage, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { Viewport as PixiViewport } from "pixi-viewport";
import { Viewport } from "./Viewport";
import { DataChannel } from "./DataChannel";

interface Props {
  channels: number[];
  pointsPerChannel: number;
  linesPerChannel: number;
  renderedPointCountRef: React.MutableRefObject<number>;
  heightPixel: number;
  widthPixel: number;
  debugMode: boolean;
}

export const LinearView: React.FC<Props> = ({
  channels,
  pointsPerChannel,
  linesPerChannel,
  renderedPointCountRef,
  heightPixel,
  widthPixel,
  debugMode,
}) => {
  const viewportRef = useRef<PixiViewport>(null);

  const [cursorX, setCursorX] = useState(0);
  const [cursorWidth, setCursorWidth] = useState(2);
  const [worldBounds, setWorldBounds] = useState<[number, number]>([
    0,
    widthPixel * 2,
    // 1000,
  ]);
  const [worldStart, worldEnd] = worldBounds;
  const worldLength = worldEnd - worldStart;
  const [viewBounds, setViewBounds] = useState<[number, number]>([0, 50]);
  const viewMidPoint = (viewBounds[1] - viewBounds[0]) / 2 + viewBounds[0];

  const drawCursor = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle({
        width: cursorWidth,
        color: 0xffffff,
        join: PIXI.LINE_JOIN.BEVEL,
        native: true,
      });
      g.lineTo(0, heightPixel || 0);
    },
    [heightPixel, cursorWidth]
  );

  const onZoomedEnd = useCallback(
    ({ viewport }) => {
      if (!widthPixel) {
        return;
      }

      // todo: fix cursor position when zooming back out and hitting view bound
      setCursorWidth(viewport.screenWidthInWorldPixels / widthPixel);
    },
    [widthPixel]
  );

  const onMoved = useCallback((viewport) => {
    const { left, right } = viewport; // world pos
    setViewBounds([left, right]);
  }, []);

  const viewWidth = viewBounds[1] - viewBounds[0];

  return (
    <>
      <div className="flex w-full justify-between">
        <div>{worldStart.toFixed()}</div>
        <div>
          {viewBounds[0].toFixed(2)} - {viewBounds[1].toFixed(2)} (
          {viewWidth.toFixed()})
        </div>
        <div>{worldEnd.toFixed()}</div>
      </div>
      <input
        className="w-full"
        type="range"
        min={worldStart}
        max={worldEnd}
        step={0.01}
        value={viewMidPoint}
        onChange={(e) => {
          const viewLength = viewBounds[1] - viewBounds[0];
          const targetMidpoint = parseFloat(e.currentTarget.value);

          const halfViewLength = 0.5 * viewLength;
          const leftTarget = targetMidpoint - halfViewLength;
          const rightTarget = targetMidpoint + halfViewLength;

          if (leftTarget < worldStart) {
            setViewBounds([worldStart, worldStart + viewLength]);
          } else if (rightTarget > worldEnd) {
            setViewBounds([worldEnd - viewLength, worldEnd]);
          } else {
            setViewBounds([leftTarget, rightTarget]);
          }
        }}
      />
      <div
        onMouseMove={(e) => {
          if (!viewportRef.current) {
            return;
          }

          const { x } = e.currentTarget.getBoundingClientRect();
          const worldPosition = viewportRef.current.toWorld(e.clientX - x, 0);
          setCursorX(worldPosition.x);
        }}
      >
        <Stage
          height={heightPixel}
          width={widthPixel}
          options={{
            backgroundColor: 0xcccccc,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          }}
        >
          <Viewport
            screenWidth={widthPixel}
            screenHeight={heightPixel}
            worldHeight={heightPixel}
            worldWidth={worldLength}
            ref={viewportRef}
            onZoomedEnd={onZoomedEnd}
            onMoved={onMoved}
            viewBounds={viewBounds}
            onMovedEnd={() => (renderedPointCountRef.current = 0)}
          >
            {channels.map((id, i) => {
              const channelHeight = heightPixel / channels.length;

              return (
                <DataChannel
                  key={id}
                  dataCount={pointsPerChannel}
                  lineCount={linesPerChannel}
                  height={channelHeight}
                  y={i * channelHeight}
                  worldWidth={worldLength}
                  screenWidth={widthPixel}
                  worldViewBounds={viewBounds}
                  onPointsRendered={(count) => {
                    renderedPointCountRef.current += count;
                  }}
                  worldBounds={worldBounds}
                  debugMode={debugMode}
                />
              );
            })}
            <Graphics x={cursorX} y={0} draw={drawCursor} />
          </Viewport>
        </Stage>
      </div>
    </>
  );
};
