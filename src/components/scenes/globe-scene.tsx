"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { globeCities, globeRoutes } from "@/lib/demo-dashboard";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";

const RADIUS = 10;

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function createArcCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const distance = from.distanceTo(to);
  const arcHeight = RADIUS * 0.25 + distance * 0.35;
  mid.normalize().multiplyScalar(RADIUS + arcHeight);
  return new THREE.QuadraticBezierCurve3(from, mid, to);
}

export function GlobeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 38;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Ambient + directional light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 20);
    scene.add(dirLight);

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe globe
    const globeGeometry = new THREE.IcosahedronGeometry(RADIUS, 3);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x55692f,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    // Inner atmosphere glow
    const atmosphereGeometry = new THREE.IcosahedronGeometry(RADIUS * 0.96, 4);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x9caf88,
      transparent: true,
      opacity: 0.06,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphere);

    // City markers
    const markerGeometry = new THREE.SphereGeometry(0.18, 12, 12);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xb0623c });
    const activeMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x3f7e8c });

    globeCities.forEach(([lat, lng]) => {
      const pos = latLngToVector3(lat, lng, RADIUS + 0.05);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(pos);
      globeGroup.add(marker);
    });

    // Route arcs
    const routeObjects: { mesh: THREE.Line; active: boolean; progress: number }[] = [];
    globeRoutes.forEach((route) => {
      const from = latLngToVector3(route.from[0], route.from[1], RADIUS + 0.08);
      const to = latLngToVector3(route.to[0], route.to[1], RADIUS + 0.08);
      const curve = createArcCurve(from, to);
      const points = curve.getPoints(64);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: route.active ? 0x3f7e8c : 0x7b5f3a,
        transparent: true,
        opacity: route.active ? 0.85 : 0.35,
        linewidth: 1,
      });
      const line = new THREE.Line(geometry, material);
      globeGroup.add(line);
      routeObjects.push({ mesh: line, active: route.active, progress: 0 });

      if (route.active) {
        // Add glowing endpoints for the active route
        const startMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 16),
          activeMarkerMaterial,
        );
        startMarker.position.copy(from);
        globeGroup.add(startMarker);
        const endMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 16),
          activeMarkerMaterial,
        );
        endMarker.position.copy(to);
        globeGroup.add(endMarker);
      }
    });

    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationX = 0;
    let targetRotationY = 0;
    let autoRotateSpeed = reduced ? 0 : 0.0015;

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;
      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.005;
      previousMousePosition = { x: event.clientX, y: event.clientY };
      autoRotateSpeed = 0;
    };
    const onMouseUp = () => {
      isDragging = false;
      if (!reduced) autoRotateSpeed = 0.0006;
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Animation loop
    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      globeGroup.rotation.y += autoRotateSpeed;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.05;
      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.05;

      // Pulse active routes
      routeObjects.forEach((route) => {
        if (route.active) {
          route.progress += 0.03;
          const material = route.mesh.material as THREE.LineBasicMaterial;
          material.opacity = 0.5 + Math.sin(route.progress) * 0.35;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      globeGeometry.dispose();
      atmosphereGeometry.dispose();
      markerGeometry.dispose();
      routeObjects.forEach((r) => r.mesh.geometry.dispose());
    };
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[320px] cursor-grab active:cursor-grabbing"
      aria-label="Interactive globe showing Marco Polo routes"
    />
  );
}
