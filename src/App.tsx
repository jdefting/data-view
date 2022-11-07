import "./App.css";
import { LinearView } from "./components/LinearView";
import { useMemo, useRef, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { parse } from "papaparse";
import { MockEvent } from "./components/DataChannel";
import { LinearViewD3 } from "./components/LinearViewD3";

const App = function App() {
  const [channelCount, setChannelCount] = useState(1);
  const [linesPerChannel, setLinesPerChannel] = useState(1);
  const [pointsRendered, setPointsRendered] = useState(0);
  const [events, setMockEvents] = useState<MockEvent[]>([]);

  const { width, height, ref } = useResizeDetector({
    refreshMode: "debounce",
    refreshRate: 1,
  });

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

  return (
    <div
      className="App flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-100"
      style={{
        height: "100vh",
        width: "100vw",
      }}
    >
      <div className="flex gap-3 flex-col  border border-gray-600 p-2 ">
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = e.currentTarget.files;
            if (!files) {
              return;
            }

            [...files].forEach((file) => {
              parse(file, {
                complete: ({ data }: { data: string[][] }, { name }) => {
                  const dataHeaderIndex = 5;
                  const values = data
                    .slice(1)
                    .map((row) => {
                      return parseFloat(row[dataHeaderIndex]);
                    })
                    .filter((value) => !isNaN(value));

                  setMockEvents((prevMockEvents) => {
                    return [
                      ...prevMockEvents,
                      { name: name.split(".")[0], values },
                    ];
                  });
                },
              });
            });
          }}
        />
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
      <div className="h-2/3 w-11/12">
        <div className="w-full h-full" ref={ref}>
          {height && width && (
            // <LinearViewD3 height={height} width={width} />
            <LinearView
              heightPixel={height}
              widthPixel={width}
              channels={channels}
              events={events}
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
