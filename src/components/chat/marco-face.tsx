"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Marco Polo as an original ASCII portrait — a bearded explorer in a travelling
 * cap, in the spirit of the classic iconography (drawn from scratch, not traced
 * from any stock image). GSAP animates it; a faint three.js mote-field of green
 * and sky drifts behind it on the parchment surface. Calm "breath" when idle,
 * a shimmering "consulting the maps" scramble while thinking.
 */

const FACE: string[] = [
  "         .:-=++****++=-:.         ",
  "       :=*#%@@@@@@@@@@%#*=:       ",
  "     .+%@@@@@@@@@@@@@@@@@@%+.     ",
  "    =@@@@@%#**++==++**#%@@@@@=    ",
  "   =@@@#=:.            .:=#@@@=   ",
  "  :@@@:      ______       :@@@:   ",
  "  %@#     .-'      '-.      #@%   ",
  " -@@:    .'  -==-    '.    :@@-   ",
  " %@=     :  ( o  )    :     =@%   ",
  " @@:     :   '--'  .  :     :@@   ",
  " @@.     '.       /|  '     .@@   ",
  " %@=      :.     '=|='     .=@%   ",
  " =@@.      '.   (    )   .'  @@=  ",
  "  %@:       '.   '__'  .'   :@%   ",
  "  =@%.    .   '.      .'  .  %@=  ",
  "   #@#.    '.  '.::.'   .'  #@#   ",
  "   .%@%:    '::||||::'    :%@%.   ",
  "     +@@#=.  ':::::::'  .=#@@+    ",
  "      .=#@@@%*+=--=+*%@@@#=.      ",
  "    .-+*#%@@@@@@@@@@@@@@%#*+-.    ",
  "   =@@@@@@%##**++++**##%@@@@@@=   ",
  "  #@@@@@@@@@@@@@@@@@@@@@@@@@@@@#  ",
  " =@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@= ",
];

const INK = "#1c3323"; // deep forest ink
const GLOW_IDLE = "0 0 5px rgba(47,125,78,0.25)";
const GLOW_THINK = "0 0 14px rgba(196,99,59,0.6)"; // terracotta glow

export function MarcoFace({ thinking }: { thinking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<gsap.core.Tween | null>(null);
  const [ready, setReady] = useState(false);

  // three.js drifting mote-field (green + sky) on the parchment surface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !canvas.parentElement) return;
      const parent = canvas.parentElement;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 6;

      const count = 340;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const green = new THREE.Color("#2f7d4e");
      const sky = new THREE.Color("#3f82a8");
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        const c = Math.random() < 0.4 ? sky : green;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
      });
      const motes = new THREE.Points(geometry, material);
      scene.add(motes);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.005, 8, 128),
        new THREE.MeshBasicMaterial({
          color: 0x2f7d4e,
          transparent: true,
          opacity: 0.18,
        }),
      );
      ring.rotation.x = Math.PI / 2.4;
      scene.add(ring);

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = parent;
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(parent);

      let frame = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        motes.rotation.y += 0.0006;
        motes.rotation.x += 0.0002;
        ring.rotation.z += 0.0016;
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        geometry.dispose();
        material.dispose();
        ring.geometry.dispose();
        (ring.material as InstanceType<typeof THREE.Material>).dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  // entrance + idle float
  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const lines = face.querySelectorAll("[data-face-line]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(lines, { opacity: 1, y: 0 });
      queueMicrotask(() => setReady(true));
      return;
    }
    const entrance = gsap.fromTo(
      lines,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.03,
        ease: "power2.out",
        onComplete: () => setReady(true),
      },
    );
    const float = gsap.to(face, {
      y: -6,
      duration: 3.4,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    return () => {
      entrance.kill();
      float.kill();
    };
  }, []);

  // thinking shimmer
  useEffect(() => {
    if (!ready) return;
    const face = faceRef.current;
    if (!face) return;
    const lines = face.querySelectorAll("[data-face-line]");
    shimmerRef.current?.kill();
    if (thinking) {
      shimmerRef.current = gsap.to(lines, {
        opacity: 0.45,
        color: "#c4633b",
        textShadow: GLOW_THINK,
        duration: 0.35,
        stagger: { each: 0.05, yoyo: true, repeat: -1 },
        ease: "sine.inOut",
      });
    } else {
      shimmerRef.current = gsap.to(lines, {
        opacity: 1,
        color: INK,
        textShadow: GLOW_IDLE,
        duration: 0.5,
      });
    }
    return () => {
      shimmerRef.current?.kill();
    };
  }, [thinking, ready]);

  return (
    <div className="relative flex h-full min-h-72 items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={faceRef}
        className="relative select-none font-mono"
        style={{
          fontSize: "9.5px",
          lineHeight: "10px",
          fontWeight: 700,
          color: INK,
          textShadow: GLOW_IDLE,
        }}
        aria-label="ASCII portrait of Marco Polo"
        role="img"
      >
        {FACE.map((line, index) => (
          <pre key={index} data-face-line className="m-0 whitespace-pre">
            {line}
          </pre>
        ))}
      </div>
    </div>
  );
}
