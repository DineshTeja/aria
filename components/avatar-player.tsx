import React, { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";

export default function AvatarPlayer() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = document.getElementById("video");
    if (video instanceof HTMLVideoElement) {
      const handleLoadedData = () => {
        setIsLoading(false);
      };
      video.addEventListener("loadeddata", handleLoadedData);

      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
      };
    }
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg">
      {isLoading && (
        <Skeleton isLoading={isLoading} className="absolute inset-0 z-10" />
      )}
      <div id="video-container" className="w-full h-full">
        <video 
          id="video" 
          className="w-full h-full object-cover" 
          autoPlay 
          playsInline 
        />
        <audio id="audio" autoPlay className="hidden" />
      </div>
    </div>
  );
}
