"use client";

import { useEffect, useRef } from "react";

import { globeCities, globeRoutes } from "@/lib/demo-dashboard";

/**
 * A dotted navy globe with glowing city markers and animated great-circle
 * flight arcs — the dashboard's hero object. three.js for the 3D, GSAP for the
 * entrance. Degrades to a still globe under prefers-reduced-motion.
 */
export function Globe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [THREE, gsapModule] = await Promise.all([
        import("three"),
        import("gsap"),
      ]);
      const gsap = gsapModule.default;
      if (disposed || !mount) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.4, 7);

      const root = new THREE.Group();
      root.rotation.z = 0.28; // tilt the axis
      scene.add(root);

      const spin = new THREE.Group(); // everything that rotates with the planet
      root.add(spin);

      const R = 2;
      const CYAN = new THREE.Color("#22d3ee");
      const WARM = new THREE.Color("#f5b451");
      const DEEP = new THREE.Color("#0a1120");

      // lat/lng (degrees) → point on a sphere of radius r
      const toVec3 = (lat: number, lng: number, r: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        );
      };

      // --- solid core so back-side dots/arcs stay hidden ---
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.985, 48, 48),
        new THREE.MeshBasicMaterial({ color: DEEP }),
      );
      spin.add(core);

      // --- dotted surface (Fibonacci sphere) ---
      const DOTS = 1400;
      const dotPos = new Float32Array(DOTS * 3);
      for (let i = 0; i < DOTS; i++) {
        const y = 1 - (i / (DOTS - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        dotPos[i * 3] = Math.cos(phi) * radius * R;
        dotPos[i * 3 + 1] = y * R;
        dotPos[i * 3 + 2] = Math.sin(phi) * radius * R;
      }
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
      const dots = new THREE.Points(
        dotGeo,
        new THREE.PointsMaterial({
          color: new THREE.Color("#2f4a6b"),
          size: 0.028,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
        }),
      );
      spin.add(dots);

      // --- wireframe latitude/longitude shimmer ---
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.001, 24, 16)),
        new THREE.LineBasicMaterial({
          color: CYAN,
          transparent: true,
          opacity: 0.06,
        }),
      );
      spin.add(wire);

      // --- atmosphere rim glow ---
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.14, 48, 48),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          uniforms: { glow: { value: CYAN } },
          vertexShader: `
            varying float intensity;
            void main() {
              vec3 vNormal = normalize(normalMatrix * normal);
              vec3 vView = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
              intensity = pow(0.62 - dot(vNormal, vView), 3.0);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            uniform vec3 glow;
            varying float intensity;
            void main() {
              gl_FragColor = vec4(glow, 1.0) * clamp(intensity, 0.0, 1.0);
            }`,
        }),
      );
      root.add(atmosphere);

      // --- city markers ---
      const cityPos = new Float32Array(globeCities.length * 3);
      globeCities.forEach(([lat, lng], i) => {
        const v = toVec3(lat, lng, R * 1.01);
        cityPos[i * 3] = v.x;
        cityPos[i * 3 + 1] = v.y;
        cityPos[i * 3 + 2] = v.z;
      });
      const cityGeo = new THREE.BufferGeometry();
      cityGeo.setAttribute("position", new THREE.BufferAttribute(cityPos, 3));
      const cities = new THREE.Points(
        cityGeo,
        new THREE.PointsMaterial({
          color: WARM,
          size: 0.12,
          transparent: true,
          opacity: 0.95,
          sizeAttenuation: true,
        }),
      );
      spin.add(cities);

      // --- flight arcs ---
      type Traveller = { curve: InstanceType<typeof THREE.QuadraticBezierCurve3>; mesh: InstanceType<typeof THREE.Mesh>; speed: number; t: number };
      const travellers: Traveller[] = [];
      const arcLines: InstanceType<typeof THREE.Line>[] = [];

      globeRoutes.forEach((route) => {
        const start = toVec3(route.from[0], route.from[1], R);
        const end = toVec3(route.to[0], route.to[1], R);
        const dist = start.distanceTo(end);
        const mid = start
          .clone()
          .add(end)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(R + dist * 0.55);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const pts = curve.getPoints(60);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const color = route.active ? CYAN : new THREE.Color("#3f6d94");
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: route.active ? 0.85 : 0.35,
          }),
        );
        spin.add(line);
        arcLines.push(line);

        // travelling light along the arc
        const dotColor = route.active ? CYAN : WARM;
        const traveller = new THREE.Mesh(
          new THREE.SphereGeometry(route.active ? 0.05 : 0.035, 12, 12),
          new THREE.MeshBasicMaterial({ color: dotColor }),
        );
        spin.add(traveller);
        travellers.push({
          curve,
          mesh: traveller,
          speed: route.active ? 0.22 : 0.1 + Math.random() * 0.06,
          t: Math.random(),
        });
      });

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = mount;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      const clock = new THREE.Clock();
      let frame = 0;
      const render = () => {
        frame = requestAnimationFrame(render);
        const dt = clock.getDelta();
        if (!reduceMotion) spin.rotation.y += dt * 0.06;
        for (const tr of travellers) {
          tr.t = (tr.t + dt * tr.speed) % 1;
          tr.mesh.position.copy(tr.curve.getPointAt(tr.t));
          const scale = 0.6 + Math.sin(tr.t * Math.PI) * 0.8;
          tr.mesh.scale.setScalar(scale);
        }
        renderer.render(scene, camera);
      };
      render();

      // --- GSAP entrance ---
      if (!reduceMotion) {
        gsap.from(root.scale, {
          x: 0.82,
          y: 0.82,
          z: 0.82,
          duration: 1.4,
          ease: "power3.out",
        });
        gsap.from(spin.rotation, { y: -0.9, duration: 1.6, ease: "power2.out" });
        arcLines.forEach((line, i) => {
          const mat = line.material as InstanceType<
            typeof THREE.LineBasicMaterial
          >;
          const target = mat.opacity;
          mat.opacity = 0;
          gsap.to(mat, {
            opacity: target,
            duration: 0.8,
            delay: 0.5 + i * 0.14,
            ease: "power1.out",
          });
        });
      }

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer.dispose();
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as
            | InstanceType<typeof THREE.Material>
            | InstanceType<typeof THREE.Material>[]
            | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        });
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}
