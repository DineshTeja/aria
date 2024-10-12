import React from "react";

export default function AvatarPlayer() {
  return (
    <div id="video-container" className="w-full h-full relative overflow-hidden rounded-lg">
      <video 
        id="video" 
        className="w-full h-full object-cover" 
        autoPlay 
        playsInline 
      />
      <audio id="audio" autoPlay className="hidden" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none" />
    </div>
  );
}
