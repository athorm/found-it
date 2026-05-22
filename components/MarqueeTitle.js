"use client";
import React, { useRef, useState, useEffect } from "react";

export default function MarqueeTitle({ text, className }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowDist, setOverflowDist] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        // Calculate the exact amount of overflow in pixels
        const dist = textRef.current.scrollWidth - containerRef.current.clientWidth;
        // Require at least 4px of overflow to trigger scrolling (prevents false positives from subpixel rendering)
        setOverflowDist(dist > 4 ? dist : 0);
      }
    };

    checkOverflow();
    // Add slight delay check for font loads
    const timer = setTimeout(checkOverflow, 500);
    
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text]);

  const isOverflowing = overflowDist > 4;
  
  // Add 16px buffer so the text doesn't hit the absolute edge abruptly and accommodates the mask gradient gracefully
  const distWithBuffer = overflowDist > 4 ? overflowDist + 16 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
      style={{ 
        width: "100%", 
        maskImage: isOverflowing ? "linear-gradient(to right, black 85%, transparent 100%)" : "none", 
        WebkitMaskImage: isOverflowing ? "linear-gradient(to right, black 85%, transparent 100%)" : "none",
        "--marquee-dist": `-${distWithBuffer}px`
      }}
    >
      <div
        ref={textRef}
        className={isOverflowing ? "animate-marquee-scroll inline-block" : "truncate"}
      >
        {text}
      </div>
    </div>
  );
}
