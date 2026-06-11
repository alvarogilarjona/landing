# Especificación Completa: Sistema de Scroll Animado con Frames

Esta guía detalla la implementación completa del sistema de scroll animado sincronizado con secuencias de imágenes (frames) utilizado en FixedGap Landing Page. Úsala para replicar exactamente el mismo comportamiento visual y narrativo en otro proyecto.

---

## 1. ARQUITECTURA GENERAL

### 1.1 Stack Tecnológico
```json
{
  "framework": "Next.js 16.2.4",
  "react": "19.2.4",
  "styling": "Tailwind CSS v4",
  "typescript": "v5",
  "rendering": "Client-side only (use client directive)"
}
```

### 1.2 Estructura de Archivos
```
/app
├── page.tsx                    // Entry point que renderiza ScrollCanvas
├── ScrollCanvas.tsx            // Componente principal con toda la lógica
├── NeuralDashboard.tsx         // Dashboard clínico animado (opcional)
├── ClinicalDashboard.tsx       // Dashboard alternativo (opcional)
├── globals.css                 // Animaciones CSS custom
└── layout.tsx                  // Layout base Next.js

/public
└── /frames                     // 1164 frames JPG (frame_0001.jpg a frame_1164.jpg)
    ├── frame_0001.jpg
    ├── frame_0002.jpg
    └── ...
```

---

## 2. SISTEMA DE FRAMES Y SCROLL

### 2.1 Configuración de Frames
```typescript
const TOTAL_FRAMES = 1164;        // Total de frames de video
const BATCH_SIZE = 20;             // Frames cargados en paralelo por lote
const FRAME_PATH = "/frames/frame_{number}.jpg"; // Patrón de ruta
```

### 2.2 Lógica de Carga Progresiva (Batch Loading)
```typescript
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
```

### 2.3 Pantalla de Carga
```typescript
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
```

### 2.4 Cálculo de Altura de Scroll
```typescript
// Altura total para permitir scroll suave
<div style={{ height: "30471px" }}>
  {sections.map((section, i) => (
    <div
      key={i}
      style={{
        height: `${((section.endFrame - section.startFrame) / 764) * 30471}px`,
      }}
    />
  ))}
</div>
```

**Fórmula:**
- Altura total del scroll = Número arbitrario grande (ej: 30471px)
- Altura por sección = `((endFrame - startFrame) / framesTotalesRelevantes) × alturaTotal`

---

## 3. RENDERIZADO DE FRAMES EN CANVAS

### 3.1 Setup del Canvas
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);
const framesRef = useRef<HTMLImageElement[]>([]);
const scrollProgressRef = useRef(0);

useEffect(() => {
  if (!loaded) return;
  
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const render = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgressRef.current = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    const progress = scrollProgressRef.current;
    const frameIdx = Math.min(1163, Math.max(0, Math.floor(progress * 1163)));
    const frame = framesRef.current[frameIdx];

    if (frame?.complete && frame.naturalWidth > 0) {
      const cw = canvas.width;
      const ch = canvas.height;
      
      // Escalar para cubrir todo el viewport (object-fit: cover)
      const scale = Math.max(cw / frame.naturalWidth, ch / frame.naturalHeight);
      const dw = frame.naturalWidth * scale;
      const dh = frame.naturalHeight * scale;
      
      ctx.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    rafRef.current = requestAnimationFrame(render);
  };

  rafRef.current = requestAnimationFrame(render);

  return () => {
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(rafRef.current);
  };
}, [loaded]);
```

### 3.2 Estilos del Canvas
```typescript
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
```

---

## 4. SISTEMA DE SECCIONES SINCRONIZADAS

### 4.1 Definición de Secciones
```typescript
const sections = [
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
  // ... más secciones
];
```

### 4.2 Funciones de Opacidad y Transformación
```typescript
function getSectionOpacity(
  progress: number,
  section: { startFrame: number; endFrame: number }
): number {
  const start = section.startFrame / 1163;
  const end = section.endFrame / 1163;
  
  if (progress < start || progress > end) return 0;
  
  const range = end - start;
  if (range === 0) return 0;
  
  // Zona de fade: 20% del rango total de la sección
  const fadeZone = range * 0.2;
  
  // Fade in desde el inicio
  const fadeIn = fadeZone > 0 ? (progress - start) / fadeZone : 1;
  
  // Fade out hacia el final
  const fadeOut = fadeZone > 0 ? (end - progress) / fadeZone : 1;
  
  return Math.max(0, Math.min(1, fadeIn, fadeOut));
}

function getSectionTransform(
  progress: number,
  section: { startFrame: number; endFrame: number }
): number {
  const start = section.startFrame / 1163;
  const end = section.endFrame / 1163;
  
  if (progress < start || progress > end) return 0;
  
  const range = end - start;
  if (range === 0) return 0;
  
  const fadeZone = range * 0.2;
  const fadeIn = fadeZone > 0 ? (progress - start) / fadeZone : 1;
  const fadeOut = fadeZone > 0 ? (end - progress) / fadeZone : 1;

  // Durante fade in: desplazamiento desde +30px hacia 0px
  if (fadeIn < 1) {
    return 30 * (1 - fadeIn);
  }
  
  // Durante fade out: desplazamiento desde 0px hacia -30px
  if (fadeOut < 1) {
    return -30 * (1 - fadeOut);
  }
  
  return 0;
}
```

### 4.3 Aplicación en el Loop de Renderizado
```typescript
const render = () => {
  // ... renderizado del canvas ...

  sections.forEach((section, i) => {
    const el = sectionRefs.current[i];
    if (el) {
      const opacity = getSectionOpacity(progress, section);
      const translateY = getSectionTransform(progress, section);
      el.style.opacity = String(opacity);
      el.style.transform = `translateY(${translateY}px)`;
    }
  });

  rafRef.current = requestAnimationFrame(render);
};
```

### 4.4 Estructura HTML de Secciones
```typescript
{loaded && sections.map((section, i) => (
  <div
    key={i}
    ref={(el) => { sectionRefs.current[i] = el; }}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      opacity: 0,
      pointerEvents: "none",
      zIndex: 10,
    }}
  >
    {/* Vignette cinematográfico */}
    <div style={{
      position: "absolute",
      inset: 0,
      background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
    }} />
    
    <div
      className="absolute left-1/2 -translate-x-1/2 text-center w-[85%] max-w-[920px]"
      style={{ top: section.customTop || "58%" }}
    >
      <h2 className="font-extrabold tracking-tighter text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_0_20px_rgba(0,212,255,0.3)] leading-tight m-0">
        {section.title}
      </h2>
      
      {section.title2 && (
        <h2 className="font-extrabold tracking-tighter text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-400/70 drop-shadow-[0_0_20px_rgba(0,212,255,0.3)] leading-tight m-0 mt-2">
          {section.title2}
        </h2>
      )}

      {section.sub && (
        <>
          <div className="w-12 h-1 bg-cyan-400 rounded-full my-6 mx-auto shadow-[0_0_10px_rgba(34,211,238,0.6)]"></div>
          <p className="font-medium tracking-wide text-xl md:text-2xl text-cyan-50/80 leading-loose m-0">
            {section.sub}
          </p>
          {section.sub2 && (
            <p className="font-medium tracking-wide text-lg md:text-xl text-cyan-200/60 leading-loose m-0 mt-4">
              {section.sub2}
            </p>
          )}
        </>
      )}
    </div>
  </div>
))}
```

---

## 5. CAPAS FLOTANTES ADICIONALES (OVERLAYS)

### 5.1 Patrón General para Overlays
```typescript
const overlayRef = useRef<HTMLDivElement | null>(null);

// En el render loop:
const overlaySection = { startFrame: 150, endFrame: 300 };
const overlayOpacity = getSectionOpacity(progress, overlaySection);
const overlayTransformY = getSectionTransform(progress, overlaySection);
const overlay = overlayRef.current;

if (overlay) {
  overlay.style.opacity = String(overlayOpacity);
  overlay.style.transform = `translateY(${overlayTransformY}px)`;
}

// En el JSX:
<div
  ref={overlayRef}
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    pointerEvents: "none",
    zIndex: 20, // Mayor que secciones de texto (z-index: 10)
  }}
>
  {/* Contenido del overlay */}
</div>
```

### 5.2 Contador Animado con Ease-Out
```typescript
const counterStartTimeRef = useRef<number | null>(null);
const [patientCount, setPatientCount] = useState("0");

// En el render loop:
if (frameIdx >= 45 && frameIdx <= 130) {
  if (counterStartTimeRef.current === null) {
    counterStartTimeRef.current = performance.now();
  }

  const elapsed = performance.now() - counterStartTimeRef.current;
  const duration = 2000; // 2 segundos
  let countProgress = Math.min(1, elapsed / duration);

  // Ease-out cúbico
  const easeOutProgress = 1 - Math.pow(1 - countProgress, 3);
  const currentPatients = Math.floor(easeOutProgress * 795000);
  const formattedPatients = currentPatients.toLocaleString('en-US');
  setPatientCount(formattedPatients);
} else {
  counterStartTimeRef.current = null;
}
```

### 5.3 Números Dinámicos (HUD con Throttle)
```typescript
const lastHUDUpdateRef = useRef<number>(0);
const srtRef = useRef<HTMLSpanElement>(null);
const flexionRef = useRef<HTMLSpanElement>(null);

// En el render loop (actualización cada 100ms):
if (frameIdx >= 410 && frameIdx <= 570) {
  const now = performance.now();
  if (now - lastHUDUpdateRef.current > 100) {
    if (srtRef.current) 
      srtRef.current.innerText = Math.floor(115 + Math.random() * 21).toString();
    if (flexionRef.current) 
      flexionRef.current.innerText = Math.floor(88 + Math.random() * 6).toString();

    lastHUDUpdateRef.current = now;
  }
}
```

---

## 6. LENGUAJE VISUAL Y DE DISEÑO

### 6.1 Paleta de Colores Principal
```css
/* Cyan (Color primario - tecnología, datos) */
--cyan-400: #22d3ee;
--cyan-500: #06b6d4;
text-cyan-400
drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]

/* Amber (Alertas, calidez, España) */
--amber-400: #fbbf24;
--amber-500: #f59e0b;
text-amber-400

/* Emerald (Clínica, salud, validación) */
--emerald-400: #34d399;
--emerald-500: #10b981;
text-emerald-400

/* Red (Problema, urgencia) */
--red-500: #ef4444;
text-red-500

/* Grises y backgrounds */
background: #050505 (casi negro)
background: #0a0a0a (negro más suave)
border-white/10 (borders sutiles)
text-white/60 (texto secundario)
```

### 6.2 Tipografía y Font Weights
```typescript
// Títulos principales
className="font-extrabold tracking-tighter text-5xl md:text-6xl"
// tracking-tighter = letter-spacing: -0.05em

// Subtítulos
className="font-medium tracking-wide text-xl md:text-2xl"
// tracking-wide = letter-spacing: 0.025em

// Labels técnicos
className="text-xs tracking-[0.2em] uppercase font-bold"
// tracking-[0.2em] = letter-spacing: 0.2em

// Números/métricas
className="text-8xl md:text-9xl font-extrabold tracking-tighter"
fontFamily: "'JetBrains Mono'" // Para números monospace
```

### 6.3 Efectos de Sombra y Glow
```typescript
// Glow cyan suave (datos, tech)
drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]
shadow-[0_0_20px_rgba(0,212,255,0.15)]

// Glow amber (calidez, atención)
drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]

// Glow emerald (salud, validación)
drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]

// Glow red (problema)
drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]

// Box shadow multi-capa (premium)
box-shadow: 0 0 40px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)
```

### 6.4 Glassmorphism y Backdrop Blur
```typescript
// Tarjetas con cristal
className="backdrop-blur-md bg-white/[0.05] border-2 border-white/15"
style={{
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
}}

// Variaciones de opacidad
bg-white/[0.02]  // Muy sutil
bg-white/[0.05]  // Sutil
bg-white/[0.1]   // Notorio
```

### 6.5 Animaciones CSS Custom
```css
/* globals.css */

@keyframes breathe {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.02) translateY(-2px); }
}

@keyframes drift {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(3px) translateY(-2px); }
  50% { transform: translateX(-2px) translateY(2px); }
  75% { transform: translateX(2px) translateY(1px); }
}

@keyframes mesh-float {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  50% { transform: translateY(-10px) translateX(5px); opacity: 0.5; }
}

.breathe-slow {
  animation: breathe 6s ease-in-out infinite;
}

.drift-subtle {
  animation: drift 8s ease-in-out infinite;
}

.mesh-float {
  animation: mesh-float 10s ease-in-out infinite;
}
```

---

## 7. BADGES Y COMPONENTES REUTILIZABLES

### 7.1 SupporterBadge Component
```typescript
const SupporterBadge = ({ 
  logo, 
  text, 
  borderClass, 
  shadowClass 
}: { 
  logo: string; 
  text: string; 
  borderClass: string; 
  shadowClass: string; 
}) => (
  <div className={`backdrop-blur-md bg-white/[0.05] border-2 border-white/15 rounded-full pl-4 pr-7 py-3.5 flex items-center gap-4 shadow-[0_0_25px_rgba(0,0,0,0.7)] hover:bg-white/[0.1] ${borderClass} transition-all duration-300 group pointer-events-auto cursor-pointer`}>
    <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white/30 ${shadowClass} transition-all`}>
      <img src={logo} alt="Partner" className="w-9 h-auto object-contain" />
    </div>
    <p className="text-white/90 text-sm md:text-base font-bold tracking-wide uppercase">
      {text}
    </p>
  </div>
);

// Uso:
<SupporterBadge 
  logo="/Bupa.jpeg" 
  text="Clinical Advisory" 
  borderClass="hover:border-emerald-500/40" 
  shadowClass="group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
/>
```

---

## 8. TRANSICIONES Y SCROLL REVEALS

### 8.1 Intersection Observer para Elementos Estáticos
```typescript
const revealRefs = useRef<(HTMLDivElement | null)[]>([]);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
        }
      });
    },
    { threshold: 0.1 }
  );

  revealRefs.current.forEach((ref) => {
    if (ref) observer.observe(ref);
  });

  return () => observer.disconnect();
}, [loaded]);

// CSS correspondiente:
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease-out;
}

.reveal-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 8.2 Sticky Scroll Section con Progress
```typescript
const stickyBusinessRef = useRef<HTMLDivElement | null>(null);
const [businessCardProgress, setBusinessCardProgress] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    if (!stickyBusinessRef.current) return;

    const rect = stickyBusinessRef.current.getBoundingClientRect();
    const containerHeight = stickyBusinessRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Progress de 0 a 1
    const scrollProgress = Math.max(0, Math.min(1, 
      -rect.top / (containerHeight - viewportHeight)
    ));
    setBusinessCardProgress(scrollProgress);
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll();

  return () => window.removeEventListener('scroll', handleScroll);
}, [loaded]);

// Uso en JSX:
<div ref={stickyBusinessRef} className="relative h-[400vh] w-full">
  <div className="sticky top-0 h-screen w-full">
    {/* Card 1: aparece de 0 a 0.3 */}
    <div style={{
      opacity: businessCardProgress < 0.3 ? 1 : 
               businessCardProgress < 0.4 ? (0.4 - businessCardProgress) / 0.1 : 0,
      transform: `scale(${businessCardProgress < 0.3 ? 1 : 0.95})`
    }}>
      {/* Contenido */}
    </div>

    {/* Card 2: aparece de 0.3 a 1 */}
    <div style={{
      opacity: businessCardProgress < 0.3 ? 0 : 
               businessCardProgress < 0.4 ? (businessCardProgress - 0.3) / 0.1 : 1,
      transform: `scale(${businessCardProgress < 0.4 ? 0.97 : 1})`
    }}>
      {/* Contenido */}
    </div>
  </div>
</div>
```

---

## 9. OPTIMIZACIONES Y PERFORMANCE

### 9.1 RequestAnimationFrame Loop Único
```typescript
// ✅ CORRECTO: Un solo loop RAF
const render = () => {
  // Actualizar canvas
  // Actualizar todas las secciones
  // Actualizar todos los overlays
  rafRef.current = requestAnimationFrame(render);
};

rafRef.current = requestAnimationFrame(render);

// ❌ INCORRECTO: Múltiples loops RAF
```

### 9.2 Refs para Actualizaciones Directas al DOM
```typescript
// Para datos que cambian >60fps (números dinámicos)
const srtRef = useRef<HTMLSpanElement>(null);

// Actualización directa sin React re-render
if (srtRef.current) {
  srtRef.current.innerText = Math.floor(115 + Math.random() * 21).toString();
}
```

### 9.3 Throttling de Actualizaciones
```typescript
const lastHUDUpdateRef = useRef<number>(0);

if (now - lastHUDUpdateRef.current > 100) { // Solo cada 100ms
  // Actualizar números
  lastHUDUpdateRef.current = now;
}
```

### 9.4 Preload de Assets Adicionales
```typescript
const ganadoresImg = new Image();
const guanteImg = new Image();
ganadoresImg.src = "/GANADORES.jpeg";
guanteImg.src = "/GUANTE.jpeg";

let assetsLoadedCount = 0;
const checkAssetsLoaded = () => {
  assetsLoadedCount++;
  if (assetsLoadedCount === 2) {
    ganadoresImgRef.current = ganadoresImg;
    guanteImgRef.current = guanteImg;
    setAssetsLoaded(true);
  }
};

ganadoresImg.onload = checkAssetsLoaded;
ganadoresImg.onerror = checkAssetsLoaded;
```

---

## 10. TONO Y LENGUAJE DE TEXTOS

### 10.1 Principios de Copywriting
```
✅ HACER:
- Frases cortas y directas (5-12 palabras)
- Contrastar problema vs. solución
- Usar números concretos (673, 795,000)
- Enfatizar "early", "real data", "proactive"
- Mezclar tecnicismo con humanidad

❌ EVITAR:
- Párrafos largos en overlays
- Jerga sin contexto
- Promesas genéricas ("better", "improved")
- Más de 2 niveles de jerarquía en un overlay
```

### 10.2 Estructura de Mensajes por Sección
```typescript
// Sección 1: Hero (0-45 frames)
{
  title: "Nombre del Producto",
  sub: "Propuesta de valor en 1 línea con énfasis técnico",
  sub2: "Contexto de uso en 1 frase"
}

// Sección 2: Problema (45-130 frames)
{
  title: "El gap/problema es [adjetivo concreto].",
  sub: "Dato numérico específico que valida el problema."
}

// Sección 3: Profundización del Problema (130-300 frames)
{
  title: "Consecuencia diaria del problema.",
  sub: "Cómo impacta en el proceso de decisión."
}

// Sección 4: Solución Técnica (300-405 frames)
{
  title: "Cómo simplificamos [componente técnico].",
  sub: "Qué eliminamos o mejoramos.",
  sub2: "Qué ganamos con el nuevo approach."
}

// Sección 5: Impacto Clínico/Datos (405-565 frames)
{
  title: "[Insight] produce [señales medibles].",
  title2: "Solo falta capturarlas.",
  sub: "[Producto] captura X.",
  sub2: "Y lo convierte en Y — [adverbio de acción]."
}

// Sección 6: Experiencia de Usuario (565-720 frames)
{
  title: "Para [usuario A], es [experiencia simple].",
  title2: "Para [usuario B], es [experiencia técnica]."
}

// Sección 7: Especificaciones Técnicas (720-764 frames)
{
  title: "Lista de compatibilidades o especificaciones clave",
  customTop: "75%" // Posición más baja para no tapar detalles visuales
}
```

### 10.3 Patrones de Énfasis
```typescript
// Títulos: Alternar blanco y cyan
<h2 className="text-white">
  Recovery happens every day. So does <span className="text-cyan-400">deterioration</span>.
</h2>

// Subtítulos: Gradientes de opacidad
<p className="text-cyan-50/80">       {/* 80% opacidad - principal */}
  Primera línea de contexto.
</p>
<p className="text-cyan-200/60">      {/* 60% opacidad - secundario */}
  Línea adicional de detalle.
</p>

// Labels técnicos: UPPERCASE con tracking
<span className="text-cyan-400 text-xs tracking-[0.2em] uppercase font-bold">
  U.S. NEUROLOGY CAPACITY
</span>
```

---

## 11. GRILLAS Y LAYOUTS

### 11.1 Grid System Principal
```typescript
// Layout 2 columnas (50/50)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div>{/* Columna 1 */}</div>
  <div>{/* Columna 2 */}</div>
</div>

// Layout 3 columnas (33/33/33)
<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
  <div>{/* Col 1 */}</div>
  <div>{/* Col 2 */}</div>
  <div>{/* Col 3 */}</div>
</div>

// Layout 12-column (8 + 4)
<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
  <div className="lg:col-span-8">{/* Main content */}</div>
  <div className="lg:col-span-4">{/* Sidebar */}</div>
</div>
```

### 11.2 Espaciado y Padding
```typescript
// Spacing scale:
gap-3  // 0.75rem (12px)
gap-4  // 1rem (16px)
gap-6  // 1.5rem (24px)
gap-8  // 2rem (32px)
gap-10 // 2.5rem (40px)
gap-12 // 3rem (48px)

// Padding interno de tarjetas:
p-6    // Compact card
p-8    // Standard card
p-10   // Spacious card
p-12   // Large section

// Márgenes verticales entre secciones:
py-24  // 6rem (96px)
py-32  // 8rem (128px)
py-40  // 10rem (160px)
```

### 11.3 Max-Width Containers
```typescript
// Hero/Landing content
className="w-[85%] max-w-[920px]"

// Standard sections
className="w-full max-w-6xl px-6"

// Wide sections (business model, etc.)
className="w-full max-w-[100rem] mx-auto"

// Compact cards
className="max-w-2xl mx-auto"
```

---

## 12. COMPONENTES AVANZADOS

### 12.1 Bowtie Diagram (SVG Animado)
```typescript
<svg viewBox="0 0 800 400" className="w-full h-auto drop-shadow-[0_0_60px_rgba(0,212,255,0.3)]">
  <defs>
    <linearGradient id="gradCenter" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
    </linearGradient>
  </defs>

  {/* Left segments */}
  <path d="M 20,50 L 140,85 L 140,315 L 20,350 Z" 
        fill="url(#gradL1)" 
        stroke="#06b6d4" 
        strokeWidth="1.5" 
        strokeOpacity="0.3" />
  <text x="80" y="200" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        fill="#fff" 
        fontSize="18" 
        fontWeight="bold" 
        opacity="0.9">
    Awareness
  </text>

  {/* Center node */}
  <rect x="380" y="150" width="40" height="100" 
        fill="url(#gradCenter)" 
        stroke="#22d3ee" 
        strokeWidth="2" />
  <circle cx="400" cy="200" r="6" fill="#fff" />

  {/* Right segments */}
  <path d="M 420,150 L 540,120 L 540,280 L 420,250 Z" 
        fill="url(#gradR1)" 
        stroke="#06b6d4" 
        strokeWidth="1.5" />
  <text x="480" y="200" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        fill="#fff" 
        fontSize="18" 
        fontWeight="bold">
    Onboard
  </text>
</svg>
```

### 12.2 Roadmap con Pins (Sinuous Road)
```typescript
<div className="relative h-[720px]">
  {/* SVG Road */}
  <svg viewBox="0 0 400 600" className="absolute inset-0 w-full h-full opacity-60">
    <defs>
      <filter id="roadGlow">
        <feGaussianBlur stdDeviation="15" />
      </filter>
    </defs>
    
    {/* Outer glow */}
    <path 
      d="M -50 120 C 150 120, 150 250, 300 250 C 450 250, 450 400, 100 400 C -100 400, 150 550, 450 550" 
      fill="none" 
      stroke="rgba(251,191,36,0.15)" 
      strokeWidth="70" 
      filter="url(#roadGlow)"
    />
    
    {/* Road surface */}
    <path 
      d="M -50 120 C 150 120, 150 250, 300 250 C 450 250, 450 400, 100 400 C -100 400, 150 550, 450 550" 
      fill="none" 
      stroke="#121212" 
      strokeWidth="60" 
    />
    
    {/* Center line */}
    <path 
      d="M -50 120 C 150 120, 150 250, 300 250 C 450 250, 450 400, 100 400 C -100 400, 150 550, 450 550" 
      fill="none" 
      stroke="white" 
      strokeWidth="2" 
      strokeDasharray="12 20" 
      opacity="0.2"
    />
  </svg>

  {/* Pin 1 */}
  <div className="absolute top-[22%] left-[20%]">
    <svg width="32" height="42" viewBox="0 0 24 34">
      <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.37 18.63 0 12 0Z" 
            fill="#fbbf24" />
      <circle cx="12" cy="12" r="5" fill="white" />
    </svg>
    <div className="absolute top-0 left-full ml-5">
      <p className="text-white font-black text-lg">
        Milestone Title
      </p>
      <p className="text-white/60 text-sm">Description</p>
    </div>
  </div>
</div>
```

### 12.3 Flashcard Interactiva
```typescript
<div className="bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-colors duration-500 shadow-2xl">
  {/* Header badge */}
  <div className="flex items-center gap-3 mb-6">
    <div className="relative w-8 h-8 rounded-full border border-cyan-500/30 flex items-center justify-center">
      <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
    </div>
    <span className="text-cyan-400 text-xs font-bold tracking-[0.2em] uppercase">
      LABEL
    </span>
  </div>

  {/* Main content */}
  <h3 className="text-4xl font-extrabold text-white mb-3 tracking-tighter">
    Card Title
  </h3>
  <p className="text-white/60 text-sm mb-6">
    Supporting description or context.
  </p>

  {/* Data visualization */}
  <div className="flex items-center justify-between">
    <div>
      <div className="text-5xl font-bold text-white tracking-tighter">$150</div>
      <div className="text-white/50 text-xs uppercase tracking-wider">per month</div>
    </div>
  </div>
</div>
```

---

## 13. DEBUGGING Y MONITOREO

### 13.1 Debug Overlay (Opcional)
```typescript
const [debug, setDebug] = useState({ 
  scrollY: 0, 
  progressPct: 0, 
  currentFrame: 0, 
  scrollHeight: 0, 
  windowHeight: 0 
});

// En el render loop:
setDebug({
  scrollY: Math.round(window.scrollY),
  progressPct: maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0,
  currentFrame: frameIdx,
  scrollHeight: document.body.scrollHeight,
  windowHeight: window.innerHeight,
});

// JSX para mostrar debug (solo en desarrollo):
{process.env.NODE_ENV === 'development' && (
  <div style={{
    position: 'fixed',
    top: 10,
    left: 10,
    background: 'rgba(0,0,0,0.8)',
    color: '#0f0',
    padding: 10,
    fontFamily: 'monospace',
    fontSize: 11,
    zIndex: 9999,
  }}>
    <div>Frame: {debug.currentFrame} / 1163</div>
    <div>ScrollY: {debug.scrollY}px</div>
    <div>Progress: {debug.progressPct.toFixed(2)}%</div>
    <div>ScrollH: {debug.scrollHeight}px</div>
    <div>ViewH: {debug.windowHeight}px</div>
  </div>
)}
```

---

## 14. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup Inicial
- [ ] Crear proyecto Next.js 16+ con TypeScript
- [ ] Instalar Tailwind CSS v4
- [ ] Preparar carpeta `/public/frames` con secuencia de imágenes
- [ ] Verificar nomenclatura: `frame_0001.jpg` a `frame_XXXX.jpg`

### Fase 2: Sistema de Frames
- [ ] Implementar carga progresiva por lotes (batch loading)
- [ ] Crear pantalla de carga con progress bar
- [ ] Configurar canvas fijo con `position: fixed`
- [ ] Implementar `requestAnimationFrame` loop
- [ ] Sincronizar scroll con índice de frame

### Fase 3: Secciones de Texto
- [ ] Definir array de secciones con `startFrame`/`endFrame`
- [ ] Implementar funciones `getSectionOpacity` y `getSectionTransform`
- [ ] Crear overlays con `position: fixed` y `opacity: 0` inicial
- [ ] Aplicar actualizaciones en el RAF loop
- [ ] Añadir vignette cinematográfico a cada sección

### Fase 4: Overlays Dinámicos
- [ ] Crear refs para cada overlay (`useRef<HTMLDivElement>`)
- [ ] Definir rangos de frames específicos para cada overlay
- [ ] Implementar contadores animados con ease-out
- [ ] Añadir números dinámicos con throttling (100ms)
- [ ] Precargar assets adicionales (imágenes flotantes)

### Fase 5: Estilos y Diseño
- [ ] Configurar paleta de colores (cyan, amber, emerald, red)
- [ ] Aplicar tipografía (font-weights, tracking, uppercase)
- [ ] Añadir efectos de glow y drop-shadow
- [ ] Implementar glassmorphism en tarjetas
- [ ] Crear animaciones CSS custom en `globals.css`

### Fase 6: Componentes Avanzados
- [ ] Crear `SupporterBadge` component
- [ ] Implementar SVG bowtie diagram (si aplica)
- [ ] Añadir roadmap con sinuous road + pins
- [ ] Crear flashcards interactivas con hover states

### Fase 7: Scroll Sections Estáticas
- [ ] Implementar Intersection Observer para scroll reveals
- [ ] Añadir clase `.reveal` con transición CSS
- [ ] Crear sticky sections con progress tracking
- [ ] Implementar transiciones entre cards dentro de sticky

### Fase 8: Optimización
- [ ] Verificar un solo RAF loop para todas las actualizaciones
- [ ] Usar refs para actualizaciones directas al DOM (números)
- [ ] Implementar throttling en actualizaciones de alta frecuencia
- [ ] Añadir cleanup en `useEffect` returns

### Fase 9: Testing
- [ ] Probar en diferentes tamaños de viewport (mobile, tablet, desktop)
- [ ] Verificar performance en Chrome DevTools (60fps)
- [ ] Comprobar sincronización frame-scroll en diferentes velocidades
- [ ] Testear carga progresiva con throttling de red

### Fase 10: Polish
- [ ] Revisar copywriting (frases cortas, datos concretos)
- [ ] Ajustar timings de fade-in/fade-out
- [ ] Verificar colores y contrastes (accesibilidad)
- [ ] Añadir meta tags y SEO

---

## 15. ERRORES COMUNES Y SOLUCIONES

### Error 1: Frames no cargan o se ven entrecortados
**Causa:** Formato incorrecto, ruta errónea, o salto de índices.
**Solución:**
```bash
# Verificar nomenclatura en terminal:
ls public/frames | head -20
# Debe mostrar: frame_0001.jpg, frame_0002.jpg, etc.

# Regenerar secuencia con FFmpeg si es necesario:
ffmpeg -i input.mp4 -vf "scale=1920:-1" -q:v 2 public/frames/frame_%04d.jpg
```

### Error 2: Scroll se siente "rápido" o "lento"
**Causa:** Altura total del scroll no es proporcional al contenido.
**Solución:**
```typescript
// Ajustar altura base:
<div style={{ height: "30471px" }}> // Aumentar o reducir este valor

// O ajustar multiplicador por sección:
height: `${((endFrame - startFrame) / 764) * 40000}px` // Probar 40000, 50000, etc.
```

### Error 3: Overlays aparecen/desaparecen abruptamente
**Causa:** `fadeZone` muy pequeña.
**Solución:**
```typescript
// Aumentar zona de fade:
const fadeZone = range * 0.3; // De 0.2 a 0.3 (30% del rango)
```

### Error 4: Performance bajo en mobile
**Causa:** Demasiados elementos en el RAF loop.
**Solución:**
```typescript
// Reducir frecuencia de actualizaciones en mobile:
const isMobile = window.innerWidth < 768;
const updateThrottle = isMobile ? 150 : 100; // ms

if (now - lastUpdateRef.current > updateThrottle) {
  // Actualizar
}
```

### Error 5: Canvas se ve pixelado
**Causa:** Falta ajustar por `devicePixelRatio`.
**Solución:**
```typescript
const resize = () => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);
};
```

---

## 16. VARIACIONES Y ADAPTACIONES

### 16.1 Modo "Scroll Más Rápido"
Si tienes menos frames pero quieres misma altura de scroll:
```typescript
// Reducir total de frames pero mantener altura:
const TOTAL_FRAMES = 600; // En lugar de 1164
const SCROLL_HEIGHT = 30471; // Mantener igual

// El scroll se sentirá más "rápido" porque avanzas más frames por pixel
```

### 16.2 Modo "Pausa en Secciones"
Para detener el scroll automáticamente en cada sección:
```typescript
// Añadir CSS snap points:
<div style={{ 
  scrollSnapType: "y mandatory",
  overflowY: "scroll",
  height: "100vh"
}}>
  {sections.map(section => (
    <div style={{ 
      scrollSnapAlign: "start",
      scrollSnapStop: "always"
    }}>
      {/* Contenido */}
    </div>
  ))}
</div>
```

### 16.3 Modo "Loop Infinito"
Para repetir la secuencia de frames:
```typescript
const frameIdx = Math.floor(progress * 1163) % TOTAL_FRAMES;
```

---

## 17. RECURSOS Y HERRAMIENTAS

### 17.1 Conversión de Video a Frames
```bash
# FFmpeg - Extraer frames de video
ffmpeg -i input.mp4 -vf "scale=1920:-1" -q:v 2 frames/frame_%04d.jpg

# Ajustar FPS (ej: 1 frame cada 2):
ffmpeg -i input.mp4 -vf "select='not(mod(n\,2))',scale=1920:-1" frames/frame_%04d.jpg
```

### 17.2 Optimización de Imágenes
```bash
# ImageMagick - Comprimir JPEGs
mogrify -quality 85 -strip frames/*.jpg

# WebP (mejor compresión, soporte moderno):
for f in frames/*.jpg; do cwebp -q 80 "$f" -o "${f%.jpg}.webp"; done
```

### 17.3 Testing de Performance
```javascript
// Chrome DevTools > Performance
// Grabar scroll de inicio a fin
// Verificar:
// - FPS estable ~60
// - No spikes en "Scripting"
// - Memory no crece sin control
```

---

## 18. CONCLUSIÓN

Esta especificación cubre todos los aspectos técnicos, visuales y narrativos del sistema de scroll animado con frames. Los principios clave son:

1. **Un solo RAF loop** para todas las animaciones
2. **Sincronización precisa** entre scroll progress y frame index
3. **Fade zones del 20%** para transiciones suaves
4. **Refs directos** para actualizaciones de alta frecuencia
5. **Lenguaje conciso** con énfasis en datos concretos
6. **Paleta consistente** (cyan/amber/emerald/red)
7. **Glassmorphism sutil** con backdrop-blur
8. **Animaciones CSS custom** para elementos de fondo

Adapta los rangos de frames, textos y overlays a tu contenido específico, manteniendo estos patrones para lograr la misma sensación cinemática y narrativa fluida.

---

**Versión:** 1.0  
**Autor:** Documentación generada desde el proyecto FixedGap Landing  
**Fecha:** 2026-06-11  
**Licencia:** Uso interno / educativo
