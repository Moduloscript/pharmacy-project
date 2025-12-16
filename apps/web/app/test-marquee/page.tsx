"use client";

import { Marquee } from "../../components/ui/marquee";

export default function TestMarqueePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-8 bg-background p-8">
      <h1 className="text-2xl font-bold">Marquee Component Test</h1>

      <div className="w-full max-w-4xl space-y-4">
        <h2 className="text-lg font-semibold">Default (Left, Continuous)</h2>
        <div className="relative flex h-[100px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-secondary md:shadow-xl">
          <Marquee className="[--duration:20s]">
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">You're Welcome</span>
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">Questions — FAQ — Help Center — Support</span>
          </Marquee>
        </div>

        <h2 className="text-lg font-semibold">Right Direction</h2>
        <div className="relative flex h-[100px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-secondary md:shadow-xl">
           <Marquee direction="right" className="[--duration:20s]">
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">You're Welcome</span>
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">Questions — FAQ — Help Center — Support</span>
          </Marquee>
        </div>

        <h2 className="text-lg font-semibold">Pause on Hover</h2>
        <div className="relative flex h-[100px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-secondary md:shadow-xl">
           <Marquee pauseOnHover className="[--duration:20s]">
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">Hover Me to Pause</span>
             <span className="mx-4 text-4xl font-extrabold uppercase track-widest">Hover Me to Pause</span>
          </Marquee>
        </div>
      </div>
    </div>
  );
}
