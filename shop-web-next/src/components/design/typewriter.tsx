"use client";

import { useState, useEffect, useRef } from "react";

export function Typewriter({
  text,
  speed = 80,
  cursor = "|",
  loop = false,
  deleteSpeed = 40,
  delay = 2000,
  className,
}: {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);
  const nestedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";

  useEffect(() => {
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            if (nestedTimerRef.current) clearTimeout(nestedTimerRef.current);
            nestedTimerRef.current = setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed
    );

    return () => {
      clearTimeout(timeout);
      if (nestedTimerRef.current) clearTimeout(nestedTimerRef.current);
    };
  }, [currentIndex, isDeleting, currentText, loop, speed, deleteSpeed, delay, displayText, text, textArray.length]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}
