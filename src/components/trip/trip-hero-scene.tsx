"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { useReducedMotion } from "@/components/animation/use-reduced-motion";

interface TripHeroSceneProps {
  destination?: string;
  className?: string;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function TripHeroScene({ destination, className }: TripHeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!hasWebGL() || reduced) return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Primary wire sphere
    const sphereGeo = new THREE.IcosahedronGeometry(5, 3);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x19c59f,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Inner atmosphere
    const atmoGeo = new THREE.IcosahedronGeometry(4.7, 4);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x19c59f,
      transparent: true,
      opacity: 0.06,
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    group.add(atmosphere);

    // Accent torus ring
    const ringGeo = new THREE.TorusGeometry(7.2, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf5d78e,
      transparent: true,
      opacity: 0.45,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    ring.rotation.y = Math.PI / 8;
    group.add(ring);

    // Floating particles
    const particleCount = 80;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 8 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
    });
    const particleSystem = new THREE.Points(particles, particleMat);
    group.add(particleSystem);

    // Ambient point lights
    const lightA = new THREE.PointLight(0x19c59f, 1.2, 60);
    lightA.position.set(10, 10, 10);
    scene.add(lightA);
    const lightB = new THREE.PointLight(0xf5d78e, 0.8, 60);
    lightB.position.set(-10, -8, 8);
    scene.add(lightB);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      sphere.rotation.y += 0.0015;
      sphere.rotation.x += 0.0005;
      atmosphere.rotation.y -= 0.001;
      ring.rotation.z += 0.001;
      particleSystem.rotation.y += 0.0006;
      renderer.render(scene, camera);
    };
    animate();

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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      atmoGeo.dispose();
      ringGeo.dispose();
      particles.dispose();
      sphereMat.dispose();
      atmoMat.dispose();
      ringMat.dispose();
      particleMat.dispose();
    };
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className ?? ""}`}
      aria-label={`Abstract destination scene for ${destination ?? "your trip"}`}
    >
      {(!hasWebGL() || reduced) && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10" />
      )}
    </div>
  );
}
