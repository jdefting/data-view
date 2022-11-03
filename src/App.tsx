import "./App.css";
import { LinearView } from "./components/LinearView";
import { useMemo, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";

const App = function App() {
  const [channelCount, setChannelCount] = useState(1);
  const [channelPointsPower, setChannelPointsPower] = useState(5);
  const [linesPerChannel, setLinesPerChannel] = useState(1);
  const [pointsRendered, setPointsRendered] = useState(0);

  const { width, height, ref } = useResizeDetector({
    refreshMode: "debounce",
    refreshRate: 1,
  });

  const renderedPointCount = useRef(0);
  setInterval(() => {
    setPointsRendered(renderedPointCount.current);
  }, 100);

  const pointsPerChannel = 10 ** channelPointsPower;

  const channels = useMemo(() => {
    const channels = [];

    for (let i = 0; i < channelCount; i++) {
      channels.push(i);
    }

    return channels;
  }, [channelCount]);

  return (
    <div
      className="App flex flex-col items-center justify-center"
      style={{
        height: "100vh",
        width: "100vw",
      }}
    >
      <div className="flex flex-col gap-3">
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
          Points/Channel (10^x):{" "}
          <input
            type="number"
            value={channelPointsPower}
            onChange={(e) => {
              setChannelPointsPower(parseInt(e.currentTarget.value));
            }}
          />
        </div>
        <div>
          Total Data Points:{" "}
          {(channelCount * pointsPerChannel * linesPerChannel)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
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
      <div className="h-1/2 w-11/12">
        <div className="w-full h-full" ref={ref}>
          {height && width && (
            <LinearView
              heightPixel={height}
              widthPixel={width}
              channels={channels}
              pointsPerChannel={pointsPerChannel}
              linesPerChannel={linesPerChannel}
              renderedPointCountRef={renderedPointCount}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
