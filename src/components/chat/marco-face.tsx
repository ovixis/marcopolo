"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Marco Polo's face in ASCII, animated with GSAP, floating over a three.js
 * starfield. `thinking` switches the animation from a calm breath to a
 * shimmering "consulting the maps" scramble.
 */

const FACE: string[] = [
  "            .:=*#%%%%#*=:.            ",
  "         :+%@@@@@@@@@@@@%+:           ",
  "       :#@@@@@@@@@@@@@@@@@@#:         ",
  "      =@@@@@%#*+====+*#%@@@@@=        ",
  "     =@@@%+:            :+%@@@=       ",
  "    .%@@#.    _..--.._    .#@@%.      ",
  "    =@@%.   .' ~~~~~~ '.   .%@@=      ",
  "    #@@+    ~ ______ ~      +@@#      ",
  "    %@@:   .+#@@=-@@#+.     :@@%      ",
  "    %@@:    (o)/  \\(o)      :@@%      ",
  "    #@@+     _./ ;; \\._     +@@#      ",
  "    =@@%    /   (__)   \\    %@@=      ",
  "    .%@@-   \\  .____.  /   -@@%.      ",
  "     -@@%:   '.______.'   :%@@-       ",
  "      +@@@=    \\;;;;/    =@@@+        ",
  "       =@@@#+.  \\;;/  .+#@@@=         ",
  "        .*@@@@%#======#%@@@@*.        ",
  "       .-=+#%@@@@@@@@@@%#+=-.         ",
  "     .*%#+=--=+*####*+=--=+#%*.       ",
  "    -@@@@@@@%%#+=..=+#%%@@@@@@@-      ",
  "    *@@@@@@@@@@@@@@@@@@@@@@@@@@*      ",
];

export function MarcoFace({ thinking }: { thinking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<gsap.core.Tween | null>(null);

  // three.js starfield background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed || !canvas.parentElement) return;

      const parent = canvas.parentElement;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 6;

      const starCount = 600;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      const cyan = new THREE.Color("#22D3EE");
      const white = new THREE.Color("#9FB6CC");
      for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
        const color = Math.random() < 0.25 ? cyan : white;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      });
      const stars = new THREE.Points(geometry, material);
      scene.add(stars);

      // a faint dashed "route ring" orbiting the face
      const ringGeometry = new THREE.TorusGeometry(3.2, 0.006, 8, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.25,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2.4;
      scene.add(ring);

      const resize = () => {
        const { clientWidth, clientHeight } = parent;
        renderer.setSize(clientWidth, clientHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(parent);

      let frame = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        stars.rotation.y += 0.0006;
        stars.rotation.x += 0.0002;
        ring.rotation.z += 0.0015;
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        geometry.dispose();
        material.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  // GSAP: entrance + idle float
  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const lines = face.querySelectorAll("[data-face-line]");
    const entrance = gsap.fromTo(
      lines,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, ease: "power2.out" },
    );
    const float = gsap.to(face, {
      y: -6,
      duration: 3.2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    return () => {
      entrance.kill();
      float.kill();
    };
  }, []);

  // GSAP: thinking shimmer sweeps across the lines
  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const lines = face.querySelectorAll("[data-face-line]");
    shimmerRef.current?.kill();
    if (thinking) {
      shimmerRef.current = gsap.to(lines, {
        opacity: 0.35,
        color: "#7DEFFF",
        textShadow: "0 0 14px rgba(34,211,238,0.9)",
        duration: 0.35,
        stagger: { each: 0.05, yoyo: true, repeat: -1 },
        ease: "sine.inOut",
      });
    } else {
      shimmerRef.current = gsap.to(lines, {
        opacity: 1,
        color: "#8FD9EA",
        textShadow: "0 0 6px rgba(34,211,238,0.35)",
        duration: 0.5,
      });
    }
    return () => {
      shimmerRef.current?.kill();
    };
  }, [thinking]);

  return (
    <div className="relative flex h-full min-h-72 items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={faceRef}
        className="relative select-none font-mono"
        style={{ fontSize: "9px", lineHeight: "10px", color: "#8FD9EA" }}
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
