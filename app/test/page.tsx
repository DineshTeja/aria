"use client";

import { useEffect, useRef, useState } from "react";
import hark from "hark";

export default function Home() {
  const [status, setStatus] = useState<"speaking" | "idle">("idle");
  const [counter, setCounter] = useState(1);
  const [isSupported, setIsSupported] = useState(false);
  const [stopHark, setStopHark] = useState<(() => void) | undefined>();

  const counterRef = useRef(counter);

  useEffect(() => {
    counterRef.current = counter;
  }, [counter]);

  const onUserStartSpeaking = () => {
    setStatus("speaking");
  };

  const onUserStopSpeaking = () => {
    setStatus("idle");
    printCounter();
  };

  const startHark = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setIsSupported(true);

      const speechEvents = hark(stream, {
        interval: 100,
        threshold: -50,
      });

      speechEvents.on("speaking", onUserStartSpeaking);
      speechEvents.on("stopped_speaking", onUserStopSpeaking);

      setStopHark(() => () => {
        speechEvents.stop();
        stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsSupported(false);
    }
  };

  const printCounter = () => {
    console.log("printCounter counter", counterRef.current);
    setCounter((prev) => prev + 1);
  };

  return (
    <div className="p-4">
      <h1>Voice Assistant</h1>
      {/* ... existing UI elements ... */}
      {isSupported ? (
        <p>Speech detection is active. Current status: {status}</p>
      ) : (
        <p>Speech detection is not supported in this browser</p>
      )}
      <button onClick={startHark} className="bg-blue-500 text-white p-2">
        Start
      </button>
      <button onClick={stopHark} className="bg-red-500 text-white p-2">
        Stop
      </button>
      <button onClick={() => setCounter((prev) => prev * 2)}>
        Upgrade counter
      </button>
      <div>{counter}</div>
    </div>
  );
}
