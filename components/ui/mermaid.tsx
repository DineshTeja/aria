"use client";

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

const Graph = ({ graph }: { graph: string }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: true });
      mermaid.contentLoaded();
    }
  }, [graph]);

  return (
    <div className="mermaid" ref={ref}>
      {graph}
    </div>
  )
}

export default Graph;