"use client";

import { useRef, useEffect, useState } from "react";

const TOTAL_FRAMES = 759;
const BATCH_SIZE = 20;

interface Section {
  startFrame: number;
  endFrame: number;
  title: string;
  title2?: string;
  sub?: React.ReactNode;
  sub2?: string;
  customTop?: string;
}

const sections: Section[] = [
  {
    startFrame: 0,
    endFrame: 45,
    title: "FixedGap",
    sub: <>Sequential functional <strong className="text-cyan-400">telemonitoring</strong> of stroke recovery.</>,
    sub2: "From a game to the clinical decision that matters.",
  },
  {
    startFrame: 45,
    endFrame: 130,
    title: "The monitoring gap is structural.",
    sub: "673 post-stroke patients per clinician. Spaced visits.",
  },
  {
    startFrame: 130,
    endFrame: 300,
    title: "Recovery happens every day. So does deterioration.",
    sub: "Decisions are based on patient recall, not real data.",
  },
  {
    startFrame: 300,
    endFrame: 405,
    title: "We simplified the glove into pure software.",
    sub: "A device with a camera. No wearables. No setup.",
    sub2: "A SaaS platform — objective functional data after each session.",
  },
  {
    startFrame: 405,
    endFrame: 565,
    title: "Movement produces measurable signals.",
    title2: "We just need to capture them.",
    sub: "FixedGap captures functional data in real-time.",
    sub2: "And converts it into clinical insights — proactively.",
  },
  {
    startFrame: 565,
    endFrame: 720,
    title: "For patients, it's a game.",
    title2: "For clinicians, it's actionable data.",
  },
  {
    startFrame: 720,
    endFrame: 855,
    title: "Compatible with any device. iOS, Android, Web.",
    customTop: "75%",
  },
];

function getSectionOpacity(
  progress: number,
  section: { startFrame: number; endFrame: number }
): number {
  const start = section.startFrame / (TOTAL_FRAMES - 1);
  const end = section.endFrame / (TOTAL_FRAMES - 1);

  if (progress < start || progress > end) return 0;

  const range = end - start;
  if (range === 0) return 0;

  const fadeZone = range * 0.2;

  const fadeIn = fadeZone > 0 ? (progress - start) / fadeZone : 1;
  const fadeOut = fadeZone > 0 ? (end - progress) / fadeZone : 1;

  return Math.max(0, Math.min(1, fadeIn, fadeOut));
}

function getSectionTransform(
  progress: number,
  section: { startFrame: number; endFrame: number }
): number {
  const start = section.startFrame / (TOTAL_FRAMES - 1);
  const end = section.endFrame / (TOTAL_FRAMES - 1);

  if (progress < start || progress > end) return 0;

  const range = end - start;
  if (range === 0) return 0;

  const fadeZone = range * 0.2;
  const fadeIn = fadeZone > 0 ? (progress - start) / fadeZone : 1;
  const fadeOut = fadeZone > 0 ? (end - progress) / fadeZone : 1;

  if (fadeIn < 1) {
    return 30 * (1 - fadeIn);
  }

  if (fadeOut < 1) {
    return -30 * (1 - fadeOut);
  }

  return 0;
}

export default function ScrollCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const scrollProgressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollLockedRef = useRef(false);
  const lastLockedFrameRef = useRef<number>(-1);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const problemContentRef = useRef<HTMLDivElement | null>(null);
  const problem2ContentRef = useRef<HTMLDivElement | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const snapFrames = [1, 95, 225, 350, 483, 616, 720];

  const pitchTexts: { [key: number]: string } = {
    1: "PROBLEM",
    95: "PROBLEM 2",
    225: "WHAT IF THERE WAS A SOLUTION FOR THIS GAP",
    350: "OUR SOLUTION",
    483: "CLINICAL VIEW",
    616: "BUSINESS PLAN",
    720: "TRACTION"
  };

  // Mapeo de frames de referencia a imágenes HQ
  const hqFrameMapping: { [key: number]: number } = {
    1: 1,    // ref 1
    95: 2,   // ref 2
    225: 3,  // ref 3
    350: 4,  // ref 4 (falta archivo)
    483: 5,  // ref 5
    616: 6,  // ref 6
    720: 7   // ref 7
  };

  const hqImagesRef = useRef<{ [key: number]: HTMLImageElement }>({});

  // Load HQ reference images first
  useEffect(() => {
    const hqImages: { [key: number]: HTMLImageElement } = {};
    let loadedHQ = 0;
    const totalHQ = Object.keys(hqFrameMapping).length;

    Object.entries(hqFrameMapping).forEach(([frame, refNum]) => {
      const img = new Image();
      img.src = `/frames-hq/${refNum}.png`;

      img.onload = () => {
        hqImages[parseInt(frame)] = img;
        loadedHQ++;
        if (loadedHQ === totalHQ) {
          hqImagesRef.current = hqImages;
        }
      };

      img.onerror = () => {
        console.warn(`No se pudo cargar imagen HQ: ${refNum}.png`);
        loadedHQ++;
      };
    });
  }, []);

  // Batch loading of frames
  useEffect(() => {
    const frames: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let count = 0;
    let cancelled = false;

    const loadBatch = (startIdx: number) => {
      const end = Math.min(startIdx + BATCH_SIZE, TOTAL_FRAMES);
      for (let i = startIdx; i < end; i++) {
        const img = new Image();
        img.src = `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;
        frames[i] = img;

        const onDone = () => {
          if (cancelled) return;
          count++;
          setLoadedCount(count);
          if (count === TOTAL_FRAMES) {
            framesRef.current = frames;
            setLoaded(true);
          }
        };

        img.onload = onDone;
        img.onerror = onDone;
      }

      if (end < TOTAL_FRAMES) {
        setTimeout(() => loadBatch(end), 0);
      }
    };

    loadBatch(0);
    return () => { cancelled = true; };
  }, []);

  // Scroll lock system
  useEffect(() => {
    if (!loaded) return;

    const handleWheel = (e: WheelEvent) => {
      if (scrollLockedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollLockedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchmove", handleTouchMove);
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [loaded]);

  // Canvas rendering and section animations
  useEffect(() => {
    if (!loaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;

      // Canvas con resolución de Retina/4K
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      // CSS size normal
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      // Escalar el contexto
      ctx.scale(dpr, dpr);

      // Máxima calidad de renderizado
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgressRef.current = maxScroll > 0 ? window.scrollY / maxScroll : 0;

      const progress = scrollProgressRef.current;
      const frameIdx = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.floor(progress * (TOTAL_FRAMES - 1))));

      // Buscar si hay una imagen HQ para este frame (±15 frames de cualquier snap frame)
      let frame = framesRef.current[frameIdx];
      for (const snapFrame of snapFrames) {
        if (Math.abs(frameIdx - snapFrame) <= 15) {
          const hqImage = hqImagesRef.current[snapFrame];
          if (hqImage?.complete) {
            frame = hqImage;
          }
          break;
        }
      }

      // Check for lock frames
      for (const snapFrame of snapFrames) {
        if (Math.abs(frameIdx - snapFrame) <= 2 && lastLockedFrameRef.current !== snapFrame) {
          lastLockedFrameRef.current = snapFrame;
          scrollLockedRef.current = true;

          if (lockTimeoutRef.current) {
            clearTimeout(lockTimeoutRef.current);
          }

          lockTimeoutRef.current = setTimeout(() => {
            scrollLockedRef.current = false;
          }, 2500);

          break;
        }
      }

      // Reset lock when moving away from snap frames
      const nearSnapFrame = snapFrames.some(sf => Math.abs(frameIdx - sf) <= 2);
      if (!nearSnapFrame && lastLockedFrameRef.current !== -1 && !scrollLockedRef.current) {
        lastLockedFrameRef.current = -1;
      }

      if (frame?.complete && frame.naturalWidth > 0) {
        const cw = window.innerWidth;
        const ch = window.innerHeight;

        const isSmallMode = frameIdx >= 314;

        if (isSmallMode) {
          // Fondo blanco
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, cw, ch);

          // Imagen más pequeña y centrada (70% del viewport)
          const maxWidth = cw * 0.7;
          const maxHeight = ch * 0.7;

          const scale = Math.min(maxWidth / frame.naturalWidth, maxHeight / frame.naturalHeight);
          const dw = frame.naturalWidth * scale;
          const dh = frame.naturalHeight * scale;
          const x = (cw - dw) / 2;
          const y = (ch - dh) / 2;

          ctx.drawImage(frame, x, y, dw, dh);

          // A partir del frame 552, difuminado MUY amplio para igualar blancos
          const isExtraFade = frameIdx >= 552;
          const fadeSize = isExtraFade ? 350 : 200;
          const innerRadius = isExtraFade ? Math.min(dw, dh) / 3.5 : Math.min(dw, dh) / 2.5;

          const gradient = ctx.createRadialGradient(
            cw / 2,
            ch / 2,
            innerRadius,
            cw / 2,
            ch / 2,
            Math.max(dw, dh) / 2 + fadeSize
          );

          if (isExtraFade) {
            // Degradado extra suave para frames 552+
            gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(0.3, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
            gradient.addColorStop(0.65, "rgba(255, 255, 255, 0.6)");
            gradient.addColorStop(0.8, "rgba(255, 255, 255, 0.85)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 1)");
          } else {
            // Degradado normal para frames 314-551
            gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(0.4, "rgba(255, 255, 255, 0)");
            gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.5)");
            gradient.addColorStop(0.85, "rgba(255, 255, 255, 0.8)");
            gradient.addColorStop(1, "rgba(255, 255, 255, 1)");
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cw, ch);
        } else {
          // Modo normal: Scale to cover viewport (object-fit: cover)
          const scale = Math.max(cw / frame.naturalWidth, ch / frame.naturalHeight);
          const dw = frame.naturalWidth * scale;
          const dh = frame.naturalHeight * scale;

          ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);

          // Degradado negro en la parte inferior para ocultar marca de agua (frames 0-200)
          if (frameIdx <= 200) {
            const shadowGradient = ctx.createLinearGradient(0, ch - 180, 0, ch);
            shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
            shadowGradient.addColorStop(0.3, "rgba(0, 0, 0, 0.6)");
            shadowGradient.addColorStop(0.7, "rgba(0, 0, 0, 0.9)");
            shadowGradient.addColorStop(1, "rgba(0, 0, 0, 1)");

            ctx.fillStyle = shadowGradient;
            ctx.fillRect(0, ch - 180, cw, 180);
          }
        }
      }

      // Update text overlays based on proximity to snap frames
      snapFrames.forEach((snapFrame, i) => {
        const el = sectionRefs.current[i];
        if (el) {
          const frameDist = Math.abs(frameIdx - snapFrame);
          const opacity = frameDist <= 20 ? Math.max(0, 1 - frameDist / 20) : 0;
          el.style.opacity = String(opacity);

          // Update PROBLEM section content (frame 1)
          if (snapFrame === 1 && problemContentRef.current) {
            problemContentRef.current.style.opacity = String(opacity);
          }

          // Update PROBLEM 2 section content (frame 95)
          if (snapFrame === 95 && problem2ContentRef.current) {
            problem2ContentRef.current.style.opacity = String(opacity);
          }
        }
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [loaded]);

  return (
    <>
      {/* Loading screen */}
      {!loaded && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <h1 style={{
            color: "#fff",
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}>
            FixedGap
          </h1>
          <div style={{
            width: 300,
            height: 3,
            background: "#222",
            borderRadius: 2,
            marginTop: 32,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              background: "#fff",
              borderRadius: 2,
              width: `${(loadedCount / TOTAL_FRAMES) * 100}%`,
              transition: "width 0.08s linear",
            }} />
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: loaded ? "block" : "none",
          zIndex: 0,
        }}
      />

      {/* Scroll height container with snap points */}
      <div style={{ height: "30471px", position: "relative" }}>
        {snapFrames.map((frame) => {
          const scrollPosition = (frame / (TOTAL_FRAMES - 1)) * 30471;
          return (
            <div
              key={frame}
              style={{
                position: "absolute",
                top: `${scrollPosition}px`,
                width: "100%",
                height: "1px",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
              }}
            />
          );
        })}
      </div>

      {/* Pitch deck text overlays */}
      {loaded && snapFrames.map((snapFrame) => {
        const isDarkText = snapFrame >= 314;

        return (
          <div
            key={snapFrame}
            ref={(el) => {
              const idx = snapFrames.indexOf(snapFrame);
              if (idx !== -1) sectionRefs.current[idx] = el;
            }}
            style={{
              position: "fixed",
              top: "3rem",
              left: "3rem",
              opacity: 0,
              pointerEvents: "none",
              zIndex: 20,
              maxWidth: "600px",
            }}
          >
            <h1
              style={{
                fontSize: snapFrame === 225 ? "2.5rem" : "3.5rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                textAlign: "left",
                color: isDarkText ? "#000000" : "#ffffff",
                margin: 0,
                lineHeight: 1.2,
                textShadow: isDarkText ? "none" : "0 2px 20px rgba(0, 0, 0, 0.5)",
              }}
            >
              {pitchTexts[snapFrame]}
            </h1>
          </div>
        );
      })}

      {/* PROBLEM section content - Frame 1 */}
      {loaded && (
        <div
          ref={problemContentRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 0 0 80px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 10,
            fontFamily: "var(--font-geist-sans)",
          }}
        >
            {/* Badge "2 seconds = 1 stroke" */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "3px solid rgba(255,255,255,0.4)",
                borderRadius: "999px",
                padding: "18px 40px",
                width: "fit-content",
                marginBottom: "80px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.95)",
                  fontSize: "36px",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                }}
              >
                2 seconds = 1 stroke
              </span>
            </div>

            {/* Dos números grandes */}
            <div
              style={{
                display: "flex",
                gap: "160px",
                alignItems: "flex-start",
              }}
            >
              {/* 12.2M */}
              <div>
                <p
                  style={{
                    color: "#FFFFFF",
                    fontSize: "clamp(8rem, 15vw, 14rem)",
                    fontWeight: 900,
                    lineHeight: 0.95,
                    letterSpacing: "-0.04em",
                    margin: 0,
                  }}
                >
                  12.2M
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "42px",
                    fontWeight: 600,
                    marginTop: "32px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  strokes every <span style={{ color: "#22D3EE", fontWeight: 700 }}>year</span>
                </p>
              </div>

              {/* 100M+ */}
              <div>
                <p
                  style={{
                    color: "#FFFFFF",
                    fontSize: "clamp(8rem, 15vw, 14rem)",
                    fontWeight: 900,
                    lineHeight: 0.95,
                    letterSpacing: "-0.04em",
                    margin: 0,
                  }}
                >
                  100M+
                </p>
                <p
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "42px",
                    fontWeight: 600,
                    marginTop: "32px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  living with stroke <span style={{ color: "#22D3EE", fontWeight: 700 }}>consequences</span>
                </p>
              </div>
            </div>
        </div>
      )}

      {/* PROBLEM 2 section content - Frame 95 */}
      {loaded && (
        <div
          ref={problem2ContentRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: "150px",
            paddingLeft: "80px",
            paddingRight: "80px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 10,
            fontFamily: "var(--font-geist-sans)",
            background: "radial-gradient(ellipse at center, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%)",
          }}
        >
          {/* Título principal grande */}
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: "56px",
              fontWeight: 700,
              margin: 0,
              marginBottom: "80px",
              lineHeight: 1.2,
              maxWidth: "1000px",
              textAlign: "center",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
            }}
          >
            After discharge, recovery becomes hard to monitor
          </h2>

          {/* Flujo en una sola línea horizontal — MUCHO MÁS GRANDE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "60px",
            }}
          >
            {/* Clinic visit */}
            <div
              style={{
                border: "3px solid rgba(255,255,255,0.5)",
                borderRadius: "20px",
                padding: "48px 80px",
                backgroundColor: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "40px", fontWeight: 700, margin: 0, textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
                Clinic visit
              </p>
            </div>

            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "56px", margin: 0 }}>→</p>

            {/* Home recovery */}
            <div
              style={{
                border: "3px solid rgba(255,255,255,0.5)",
                borderRadius: "20px",
                padding: "52px 92px",
                backgroundColor: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "40px", fontWeight: 700, margin: 0, textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
                Home recovery
              </p>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "22px", margin: 0, textShadow: "0 1px 3px rgba(0, 0, 0, 0.3)" }}>
                weeks or months
              </p>
            </div>

            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "56px", margin: 0 }}>→</p>

            {/* Clinic visit */}
            <div
              style={{
                border: "3px solid rgba(255,255,255,0.5)",
                borderRadius: "20px",
                padding: "48px 80px",
                backgroundColor: "rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "40px", fontWeight: 700, margin: 0, textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
                Clinic visit
              </p>
            </div>
          </div>

          {/* Tres flashcards en fila horizontal — más pequeñas en comparación */}
          <div
            style={{
              display: "flex",
              gap: "28px",
              marginTop: "240px",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                border: "3px solid rgba(34,197,94,0.6)",
                borderRadius: "18px",
                padding: "48px 80px",
                backgroundColor: "rgba(34,197,94,0.18)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 24px rgba(34,197,94,0.2)",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "36px", fontWeight: 700, margin: 0, textShadow: "0 2px 6px rgba(0, 0, 0, 0.3)" }}>
                Improving
              </p>
            </div>

            <div
              style={{
                border: "3px solid rgba(234,179,8,0.6)",
                borderRadius: "18px",
                padding: "48px 80px",
                backgroundColor: "rgba(234,179,8,0.18)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 24px rgba(234,179,8,0.2)",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "36px", fontWeight: 700, margin: 0, textShadow: "0 2px 6px rgba(0, 0, 0, 0.3)" }}>
                Stagnating
              </p>
            </div>

            <div
              style={{
                border: "3px solid rgba(239,68,68,0.6)",
                borderRadius: "18px",
                padding: "48px 80px",
                backgroundColor: "rgba(239,68,68,0.18)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 24px rgba(239,68,68,0.2)",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "36px", fontWeight: 700, margin: 0, textShadow: "0 2px 6px rgba(0, 0, 0, 0.3)" }}>
                Deteriorating
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
