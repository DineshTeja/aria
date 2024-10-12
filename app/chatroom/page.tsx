import React from "react";

export default function ChatRoomPage() {
  return (
    <div className="h-screen w-screen bg-zinc-900 flex flex-col">
      {/* Main view */}
      <div className="flex-grow p-6 gap-6 flex flex-row">
        <div className="h-full w-full rounded-lg bg-zinc-800 text-white">
          Person
        </div>
        <div className="h-full w-full rounded-lg bg-zinc-800 text-white">
          Computer
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-20 w-full bg-zinc-800 text-white">Bottom Bar</div>
    </div>
  );
}
