import React from "react";

export default function AvatarPlayer() {
  return (
    <div id="video-container" className="w-full h-full">
      <video id="video" className="w-full h-full" autoPlay playsInline />
      <audio id="audio" className="w-full h-full" autoPlay />
    </div>
  );
}
