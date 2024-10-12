"use client";

import { useEffect, useState, useCallback } from "react";
import hark from "hark";

export default function Home() {
  const [status, setStatus] = useState<"speaking" | "idle">("idle");
  const [isSupported, setIsSupported] = useState(false);

  const onUserStartSpeaking = useCallback(() => {
    setStatus("speaking");
  }, []);

  const onUserStopSpeaking = useCallback(() => {
    setStatus("idle");
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const listen = async () => {
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

        cleanup = () => {
          speechEvents.stop();
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setIsSupported(false);
      }
    };

    listen();

    return () => {
      if (cleanup) cleanup();
    };
  }, [onUserStartSpeaking, onUserStopSpeaking]);

  return (
    <div>
      <h1>Voice Assistant</h1>
      {/* ... existing UI elements ... */}
      {isSupported ? (
        <p>Speech detection is active. Current status: {status}</p>
      ) : (
        <p>Speech detection is not supported in this browser</p>
      )}
    </div>
  );
}
