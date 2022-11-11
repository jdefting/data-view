import "./App.css";
import { LinearView } from "./components/LinearView";
import React, { useMemo, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";

const App = function App() {
  const [channelCount, setChannelCount] = useState(1);
  const [linesPerChannel, setLinesPerChannel] = useState(1);
  const [pointsRendered, setPointsRendered] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [simplifyLevel, setSimplifyLevel] = useState(0);
  const [worldBounds, setWorldBounds] = useState<[number, number]>([0, 2000]);
  const [worldStart, worldEnd] = worldBounds;

  const [cursorX, setCursorX] = useState(0);
  const [viewBounds, setViewBounds] = useState<[number, number]>([0, 50]);
  const viewMidPoint = (viewBounds[1] - viewBounds[0]) / 2 + viewBounds[0];

  const { width, height, ref } = useResizeDetector({
    refreshMode: "debounce",
    refreshRate: 1,
  });

  // const width = 100;

  const renderedPointCount = useRef(0);
  setInterval(() => {
    setPointsRendered(renderedPointCount.current);
  }, 100);

  const pointsPerChannel = 10_000;

  const channels = useMemo(() => {
    const channels = [];

    for (let i = 0; i < channelCount; i++) {
      channels.push(i);
    }

    return channels;
  }, [channelCount]);

  const viewWidth = viewBounds[1] - viewBounds[0];

  return (
    <div
      className="App flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-100"
      style={{
        height: "100vh",
        width: "100vw",
      }}
    >
      <div className="flex gap-3 flex-col  border border-gray-600 p-2 ">
        <div>
          Debug Mode:{" "}
          <input
            type="checkbox"
            onChange={(e) => setDebugMode(e.currentTarget.checked)}
            checked={debugMode}
          />
        </div>
        <div>
          Simplify Data:{" "}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            onChange={(e) => {
              renderedPointCount.current = 0;
              setSimplifyLevel(parseFloat(e.currentTarget.value));
            }}
            value={simplifyLevel}
          />
        </div>
        <div>
          Channels:{" "}
          <input
            type="number"
            value={channelCount}
            onChange={(e) => {
              setChannelCount(parseInt(e.currentTarget.value));
            }}
          />
        </div>
        <div>
          Lines/Channel:{" "}
          <input
            type="number"
            value={linesPerChannel}
            onChange={(e) => {
              setLinesPerChannel(parseInt(e.currentTarget.value));
            }}
          />
        </div>
        <div>
          Points Rendered (theoretical):{" "}
          {(channelCount * linesPerChannel * Math.round(width || 1))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        </div>
        <div>
          Points Rendered (actual):{" "}
          {pointsRendered.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        </div>
      </div>

      <div className="flex flex-col h-2/3 w-11/12 gap-2">
        <div className="flex flex-col">
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
        </div>
        {/*<input*/}
        {/*  className="w-full"*/}
        {/*  type="range"*/}
        {/*  min={worldStart}*/}
        {/*  max={worldEnd}*/}
        {/*  step={0.01}*/}
        {/*  value={cursorX}*/}
        {/*  onChange={(e) => {*/}
        {/*    setCursorX(parseFloat(e.currentTarget.value));*/}
        {/*  }}*/}
        {/*/>*/}
        <div className="w-full grow" ref={ref}>
          {height && width && (
            // <LinearViewD3 height={height} width={width} />
            <LinearView
              debugMode={debugMode}
              heightPixel={height}
              widthPixel={width}
              channels={channels}
              pointsPerChannel={pointsPerChannel}
              linesPerChannel={linesPerChannel}
              renderedPointCountRef={renderedPointCount}
              cursorX={cursorX}
              onCursorChange={setCursorX}
              onViewBoundsChange={setViewBounds}
              viewBounds={viewBounds}
              worldBounds={worldBounds}
              simplifyLevel={simplifyLevel}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
