"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export const ANNOUNCEMENT_SLIDE_INTERVAL_MS = 6000;

const CENTER_SLIDE_CLASS = "w-[min(72%,18rem)]";

type LoopSlide = {
  src: string;
  realIndex: number;
  key: string;
};

type Props = {
  slides: string[];
  className?: string;
};

function buildLoopSlides(slides: string[]): LoopSlide[] {
  if (slides.length <= 1) {
    return slides.map((src, i) => ({ src, realIndex: i, key: src }));
  }
  const last = slides.at(-1)!;
  const first = slides[0]!;
  return [
    { src: last, realIndex: slides.length - 1, key: `loop-before-${last}` },
    ...slides.map((src, i) => ({ src, realIndex: i, key: src })),
    { src: first, realIndex: 0, key: `loop-after-${first}` },
  ];
}

function realToDom(realIndex: number): number {
  return realIndex + 1;
}

export function AnnouncementSlideCarousel({ slides, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const loopSlides = useMemo(() => buildLoopSlides(slides), [slides]);
  const isLoop = count > 1;

  const scrollDomToCenter = useCallback((domIndex: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollRef.current;
    const slide = scroller?.children[domIndex] as HTMLElement | undefined;
    if (!scroller || !slide) return;

    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const target = slideCenter - scroller.clientWidth / 2;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollTo({
      left: Math.max(0, Math.min(target, maxScroll)),
      behavior,
    });
  }, []);

  const getNearestDomIndex = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return isLoop ? 1 : 0;
    const children = Array.from(root.children) as HTMLElement[];
    if (!children.length) return isLoop ? 1 : 0;

    const viewportCenter = root.scrollLeft + root.clientWidth / 2;
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - viewportCenter);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    return nearest;
  }, [isLoop]);

  const teleportIfOnClone = useCallback(() => {
    if (!isLoop || jumpingRef.current) return;
    const domIndex = getNearestDomIndex();
    const lastDom = count;

    if (domIndex === 0) {
      jumpingRef.current = true;
      scrollDomToCenter(lastDom, "instant");
      setIndex(count - 1);
      requestAnimationFrame(() => {
        jumpingRef.current = false;
      });
      return;
    }

    if (domIndex === count + 1) {
      jumpingRef.current = true;
      scrollDomToCenter(1, "instant");
      setIndex(0);
      requestAnimationFrame(() => {
        jumpingRef.current = false;
      });
      return;
    }

    setIndex(domIndex - 1);
  }, [count, getNearestDomIndex, isLoop, scrollDomToCenter]);

  useEffect(() => {
    setIndex(0);
    requestAnimationFrame(() => {
      scrollDomToCenter(isLoop ? 1 : 0, "instant");
    });
  }, [slides, isLoop, scrollDomToCenter]);

  const goTo = useCallback(
    (realIndex: number) => {
      if (count < 1) return;
      const wrapped = ((realIndex % count) + count) % count;
      setIndex(wrapped);
      scrollDomToCenter(isLoop ? realToDom(wrapped) : 0, "smooth");
    },
    [count, isLoop, scrollDomToCenter],
  );

  const go = useCallback(
    (delta: number) => {
      if (count < 1) return;
      const currentDom = isLoop ? realToDom(index) : 0;
      scrollDomToCenter(currentDom + delta, "smooth");
    },
    [count, index, isLoop, scrollDomToCenter],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => {
      const currentDom = realToDom(index);
      scrollDomToCenter(currentDom + 1, "smooth");
    }, ANNOUNCEMENT_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, index, scrollDomToCenter]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || count < 2) return;

    function scheduleScrollEnd() {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        scrollEndTimerRef.current = null;
        if (!jumpingRef.current) teleportIfOnClone();
      }, 120);
    }

    function onScroll() {
      if (jumpingRef.current) return;
      const domIndex = getNearestDomIndex();
      if (!isLoop) {
        setIndex(domIndex);
        return;
      }
      if (domIndex === 0) setIndex(count - 1);
      else if (domIndex === count + 1) setIndex(0);
      else setIndex(domIndex - 1);
      scheduleScrollEnd();
    }

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [count, getNearestDomIndex, isLoop, teleportIfOnClone]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || count < 2) return;
    const ro = new ResizeObserver(() => {
      scrollDomToCenter(isLoop ? realToDom(index) : 0, "instant");
    });
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [count, index, isLoop, scrollDomToCenter]);

  if (count === 0) return null;

  return (
    <section
      className={cn("announcement-carousel relative shrink-0 py-2.5", className)}
      aria-label="Announcement promo images"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden" role="region" aria-roledescription="carousel">
        <div
          ref={scrollRef}
          className={cn(
            "announcement-carousel-scroll flex items-center gap-3 overflow-x-auto overscroll-x-contain scroll-smooth",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            isLoop && [
              "snap-x snap-mandatory",
              "px-[max(0px,calc(50%-min(36%,9rem)))]",
              "scroll-px-[max(0px,calc(50%-min(36%,9rem)))]",
            ],
          )}
        >
          {loopSlides.map((item, domIndex) => {
            const active = item.realIndex === index;
            return (
              <div
                key={item.key}
                data-dom-index={domIndex}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-md border border-slate-200/80 bg-slate-100 dark:border-transparent dark:bg-[hsl(222_38%_5%)]",
                  isLoop
                    ? [CENTER_SLIDE_CLASS, "h-[7.75rem] snap-center sm:h-[8.25rem]"]
                    : "h-[7.5rem] w-full snap-center sm:h-[8.5rem]",
                  "transition-[opacity,transform,filter] duration-400 ease-out",
                  active ? "z-[2] scale-100 opacity-100 blur-0" : "z-[1] scale-[0.94] opacity-50 blur-[1px] dark:opacity-40 dark:blur-[2px]",
                )}
                aria-hidden={!active && isLoop}
              >
                <Image
                  src={item.src}
                  alt={`Announcement image ${item.realIndex + 1} of ${count}`}
                  fill
                  unoptimized
                  sizes="(max-width: 896px) 72vw, 288px"
                  className="object-cover object-center"
                  priority={item.realIndex === 0 && domIndex <= 1}
                />
              </div>
            );
          })}
        </div>

        {isLoop ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-0 top-1/2 z-[3] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-transparent dark:bg-black/40 dark:text-cyan-100/90 dark:shadow-none dark:backdrop-blur-[2px] dark:hover:bg-black/55"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-0 top-1/2 z-[3] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-transparent dark:bg-black/40 dark:text-cyan-100/90 dark:shadow-none dark:backdrop-blur-[2px] dark:hover:bg-black/55"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <div className="mt-2 flex justify-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                    i === index
                      ? "h-1.5 w-5 bg-primary dark:bg-cyan-400/90"
                      : "h-1.5 w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-white/25 dark:hover:bg-white/45",
                  )}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
