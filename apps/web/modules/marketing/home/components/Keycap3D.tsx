"use client";

import React from "react";
import { motion } from "framer-motion";

// Color mapping for keycap tops - matching Sui Overflow colors
const KEY_COLORS: Record<string, string> = {
  orange: "#FF6600",    // O key in reference
  purple: "#E9CCFF",    // V key (light purple)
  violet: "#7A69FA",    // E key (violet/blue purple)
  green: "#55DB9C",     // R key
  blue: "#4DA2FF",      // F key
  yellow: "#FFD731",    // L key
  pink: "#FF6FB4",      // Gradient pink
  white: "#F2EEE4",     // Default white/cream
};

// Letter path data - SVG path data for each letter
// These are simplified versions derived from the reference
const LETTER_PATHS: Record<string, string> = {
  P: "M77,97 L77,51 L92,55 C105,59 112,67 109,77 C106,87 95,92 82,88 L85,97 Z M85,64 L85,80 C92,82 98,80 100,75 C102,70 99,66 92,64 L85,64 Z",
  H: "M67,94 L79,51 L87,54 L80,78 L105,85 L112,62 L120,64 L107,108 L99,105 L105,86 L80,79 L74,100 Z",
  A: "M67,94 L100,50 L108,53 L90,100 L82,97 L86,87 L68,81 L62,91 Z M72,75 L84,79 L90,63 Z",
  R: "M89,100 L98,102 L97,81 C100,81 103,80 106,79 C108,77 110,75 112,72 C113,69 114,67 113,64 C113,62 112,60 110,58 C108,56 105,55 102,53 L85,48 L63,91 L70,94 L79,77 L88,80 Z M89,57 L99,60 C102,61 104,62 105,64 C106,65 105,67 104,69 C103,72 101,73 99,74 C97,75 95,74 92,74 L82,71 Z",
  M: "M67,95 L79,52 L87,54 L81,73 L109,79 L115,60 L123,62 L111,106 L103,103 L109,84 L81,78 L75,97 Z",
  Rx: "M72,97 L65,50 L78,54 C90,57 96,65 93,75 C91,82 85,86 77,86 L79,100 Z M74,62 L77,78 C83,79 88,77 89,73 C90,69 87,65 81,63 Z M95,100 L105,78 L115,100 L107,97 L101,85 L91,97 Z",
  "+": "M85,55 L93,58 L89,70 L101,74 L99,82 L87,78 L83,90 L75,87 L79,75 L67,71 L69,63 L81,67 Z",
  "/": "M95,50 L75,100 L67,97 L87,47 Z",
};

// Helper types
export type KeyColor = keyof typeof KEY_COLORS;
export type LetterChar = keyof typeof LETTER_PATHS;

export interface Keycap3DProps {
  char?: string;
  color?: KeyColor;
  className?: string;
  style?: React.CSSProperties;
  dragConstraints?: React.RefObject<HTMLDivElement | null>;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export function Keycap3D({ 
  char = "P", 
  color = "orange", 
  className = "",
  style = {},
  dragConstraints,
  onHoverStart,
  onHoverEnd
}: Keycap3DProps) {
  const topColor = KEY_COLORS[color as KeyColor] || KEY_COLORS.white;
  const letterPath = LETTER_PATHS[char as LetterChar] || LETTER_PATHS.P;

  // Random floating animation parameters
  const getFloatingVariant = () => ({
    y: [0, -10, 0],
    rotate: [0, Math.random() * 2 - 1, 0],
    transition: {
      duration: 3 + Math.random() * 2,
      repeat: Infinity,
      ease: "easeInOut" as const, // Fix strict type
      delay: Math.random() * 2
    }
  });
  
  return (
    <motion.div 
      className={`hero-key ${className} cursor-grab active:cursor-grabbing`}
      style={style}
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.2}
      whileHover={{ scale: 1.1, zIndex: 60, rotate: 0 }}
      whileTap={{ scale: 0.95, cursor: "grabbing" }}
      animate={getFloatingVariant()}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="100%" 
        viewBox="0 0 200 197" 
        fill="none" 
        className="hero-key-svg pointer-events-none select-none"
      >
        {/* Left side shadow/depth */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M5.22759 99.0471L0.0782774 148.857C-0.726302 158.372 4.74484 160.909 13.1125 164.239L18.1009 166.142L112.237 194.528C119.317 196.749 127.041 197.224 134.121 195.48L116.903 141.403C110.306 143.148 101.616 142.355 95.0187 140.61L16 119L10.1871 114.043L7.5 107.5L5.22759 99.0471Z" 
          fill="black" 
          className="key-base-left"
        />
        
        {/* Right side shadow/depth */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M173.779 31.6455L177.5 35.5L199.471 90.4686L199.548 90.7713L199.709 92.04L199.711 92.0575C200.221 96.5781 199.698 99.8502 197.479 104.055L197.468 104.076L154.182 182.574L154.121 182.674L153.488 183.61C153.486 183.612 153.484 183.615 153.482 183.618C144.834 196.809 127.21 199.303 113.057 194.926L113.053 194.925L93.5 162.5C93.5 162.5 110.788 140.056 115.11 138.813C119.382 137.584 123.134 134.571 126.971 128.793L127.581 127.74L171.973 43.2559C173.803 39.4941 174.385 36.7283 173.937 32.7351L173.779 31.6455ZM176.402 38.466C176.042 40.4015 175.354 42.2804 174.326 44.3911L174.309 44.426L129.896 128.951L129.87 128.998L129.226 130.108L129.186 130.173C125.145 136.268 120.937 139.827 115.844 141.292C110.8 142.743 102 166 102 166L113.829 192.458L113.838 192.461C127.359 196.645 143.52 194.065 151.286 182.209L151.297 182.193L151.908 181.29L195.155 102.864C195.157 102.86 195.159 102.857 195.16 102.853C197.119 99.1368 197.562 96.3853 197.108 92.3507C197.108 92.348 197.107 92.3453 197.107 92.3427L196.968 91.2475L176.402 38.466Z" 
          fill="black" 
          className="key-base-right"
        />
        
        {/* Top colored surface */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M160.532 24.7952C128.832 20.0377 109.844 14.4873 90.0513 4.97235C75.5688 -1.84671 59.7991 0.849193 53.3624 12.5843C39.0409 38.7505 22.9493 67.4539 8.46684 93.6201C2.0302 105.197 10.7197 116.773 24.8803 124.227C49.9832 137.548 62.6955 139.609 92.3041 145.159C108.235 148.331 125.453 144.525 131.729 132.79C146.211 106.624 160.693 80.4577 175.176 54.2916C181.452 42.5565 176.624 27.1739 160.532 24.7952Z" 
          fill={topColor} 
          className="key-top"
        />
        
        {/* Top surface outline */}
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M52.2116 11.9703C59.1068 -0.600839 75.7772 -3.18035 90.6177 3.80729L90.6273 3.81182C110.268 13.2536 129.119 18.7744 160.73 23.5184C169.208 24.7721 174.829 29.4913 177.448 35.5271C180.049 41.5216 179.644 48.7085 176.336 54.8934L176.332 54.9016L132.889 133.392C132.888 133.395 132.886 133.397 132.885 133.4C129.532 139.662 123.31 143.718 116.003 145.805C108.694 147.892 100.193 148.046 92.0537 146.426C91.002 146.229 89.9713 146.036 88.9604 145.847C61.5071 140.712 48.6546 138.308 24.262 125.364C17.058 121.572 11.1231 116.671 7.82118 111.123C4.4826 105.512 3.85087 99.2387 7.31922 93.0003C12.4705 83.6931 17.8237 74.068 23.2277 64.3516C33.0219 46.7415 42.9829 28.8316 52.211 11.9713L52.2116 11.9703ZM54.5165 13.1981C45.2849 30.0647 35.3158 47.9894 25.5186 65.6049C20.1154 75.3198 14.7646 84.9407 9.6186 94.2382L9.6174 94.2404C6.64953 99.5782 7.14428 104.881 10.0813 109.816C13.0547 114.813 18.5437 119.427 25.4991 123.088L25.503 123.09C49.5384 135.844 62.0568 138.186 89.4878 143.318C90.4885 143.505 91.5089 143.696 92.5505 143.891L92.5579 143.892L92.5651 143.894C100.355 145.445 108.425 145.28 115.274 143.325C122.125 141.368 127.647 137.657 130.571 132.188L130.576 132.18L174.018 53.6895C174.02 53.6867 174.021 53.684 174.023 53.6812C176.987 48.1329 177.305 41.7647 175.039 36.5422C172.79 31.3585 167.952 27.1972 160.34 26.0719L160.337 26.0714C128.55 21.3009 109.426 15.7214 89.4831 6.13483C75.3602 -0.512633 60.4939 2.30029 54.5165 13.1981Z" 
          fill="black" 
          className="key-top-outline"
        />
        
        {/* Letter */}
        <path 
          d={letterPath}
          fill="black" 
          className="key-letter"
        />
      </svg>
    </motion.div>
  );
}

// Pre-built letter paths for common pharmacy/health letters
export const PHARMACY_LETTERS = {
  P: LETTER_PATHS.P,
  H: LETTER_PATHS.H,
  A: LETTER_PATHS.A,
  R: LETTER_PATHS.R,
  M: LETTER_PATHS.M,
  Rx: LETTER_PATHS.Rx,
  "+": LETTER_PATHS["+"],
  "/": LETTER_PATHS["/"],
};

export default Keycap3D;
