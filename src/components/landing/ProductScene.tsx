import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { assets, insights, workflow, type ScreenName } from "./content";
import { clamp, damp, smoothstep } from "./motion";

/** A single, demand-rendered canvas serves all stages without owning page scrolling. */
export default function ProductScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setScissorTest(true);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = 12;
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-3, 5, 8);
    scene.add(light);

    const panels = Array.from({ length: 3 }, () => {
      const group = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
      });
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(10, (10 * 800) / 1422),
        material,
      );
      screen.position.z = 0.12;
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x464950,
        metalness: 0.5,
        roughness: 0.4,
        transparent: true,
      });
      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(10.09, (10 * 800) / 1422 + 0.09, 0.16, 3, 0.045),
        frameMaterial,
      );
      group.add(frame, screen);
      scene.add(group);
      return { group, material, frameMaterial };
    });

    const slots = Array.from(
      document.querySelectorAll<HTMLElement>(".lp-scene-slot"),
    );
    const textures = new Map<string, THREE.Texture>();
    const pending = new Set<string>();
    const failed = new Set<string>();
    const loader = new THREE.TextureLoader();
    const states = new Map<
      HTMLElement,
      { position: number; heroProgress: number; visible: boolean }
    >();
    let disposed = false;
    let lost = false;
    let frame = 0;
    let previousTime = 0;
    let pointerX = 0;
    let pointerY = 0;
    let easedX = 0;
    let easedY = 0;
    let width = 0;
    let height = 0;
    const clearPosters = () =>
      slots.forEach((slot) => delete slot.dataset.rendered);

    function requestDraw() {
      if (!disposed && !lost && !document.hidden && !frame)
        frame = requestAnimationFrame(draw);
    }
    function loadTexture(url: string) {
      if (textures.has(url) || pending.has(url) || failed.has(url)) return;
      pending.add(url);
      loader.load(
        url,
        (texture) => {
          pending.delete(url);
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy(),
          );
          textures.set(url, texture);
          requestDraw();
        },
        undefined,
        () => {
          pending.delete(url);
          failed.add(url);
          requestDraw();
        },
      );
    }

    function draw(time: number) {
      frame = 0;
      if (disposed || lost || document.hidden) return;
      const seconds = Math.min((time - previousTime) / 1000 || 1 / 60, 0.05);
      previousTime = time;
      easedX = damp(easedX, pointerX, seconds);
      easedY = damp(easedY, pointerY, seconds);
      let settling = false;
      if (width !== window.innerWidth || height !== window.innerHeight) {
        width = window.innerWidth;
        height = window.innerHeight;
        renderer.setSize(width, height, false);
      }
      renderer.setScissor(0, 0, width, height);
      renderer.clear();
      const mobile = width < 768;
      for (const slot of slots) {
        const rect = slot.getBoundingClientRect();
        const hero = slot.dataset.scene === "hero";
        const section = slot.closest<HTMLElement>(".lp-journey");
        const names: ScreenName[] = hero
          ? ["orders", "hub", "finance"]
          : (slot.dataset.scene === "workflow" ? workflow : insights).map(
              (item) => item.screen,
            );
        const urls = names.map((name) =>
          mobile ? assets[name].mobile : assets[name].desktop,
        );
        // Warm the complete chapter before it pins, so crossing a chapter never flashes a poster.
        if (rect.top < height * 1.6 && rect.bottom > -height * 0.5)
          urls.forEach(loadTexture);
        const state = states.get(slot);
        if (rect.bottom <= 76 || rect.top >= height || rect.width <= 0) {
          if (state) state.visible = false;
          continue;
        }
        const target = hero ? 1 : Number(section?.dataset.position ?? 0);
        if (failed.has(urls[Math.round(target)])) {
          delete slot.dataset.rendered;
          continue;
        }
        const heroTop =
          slot.closest(".lp-hero")?.getBoundingClientRect().top ?? 0;
        const heroProgress = hero
          ? clamp((76 - heroTop) / Math.max(height * 0.7, 1))
          : 0;
        const current = state ?? {
          position: target,
          heroProgress,
          visible: false,
        };
        if (!current.visible) {
          current.position = target;
          current.heroProgress = heroProgress;
        }
        current.visible = true;
        states.set(slot, current);
        // Keep the current panel until its incoming neighbour has loaded.
        const ready = [Math.floor(target), Math.ceil(target)].every((index) =>
          textures.has(urls[index]),
        );
        if (ready) current.position = damp(current.position, target, seconds);
        current.heroProgress = damp(
          current.heroProgress,
          heroProgress,
          seconds,
        );
        settling ||= ready && Math.abs(current.position - target) > 0.0001;
        settling ||= Math.abs(current.heroProgress - heroProgress) > 0.0001;
        settling ||=
          Math.abs(easedX - pointerX) + Math.abs(easedY - pointerY) > 0.0002;
        if (!textures.has(urls[Math.round(current.position)])) {
          delete slot.dataset.rendered;
          continue;
        }

        const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(18)) * 12;
        const viewWidth = (viewHeight * rect.width) / rect.height;
        const aspect = mobile ? 390 / 844 : 1422 / 800;
        const planeHeight = Math.min(
          mobile ? 7.05 : 6.75,
          (viewWidth * (hero ? 0.66 : 0.94)) / aspect,
        );
        panels.forEach(({ group, material, frameMaterial }, index) => {
          const texture = textures.get(urls[index]);
          const delta = index - current.position;
          const distance = Math.abs(delta);
          group.visible =
            !!texture && (hero ? !mobile || index === 1 : distance < 1.05);
          if (!group.visible) return;
          if (material.map !== texture) {
            material.map = texture!;
            material.needsUpdate = true;
          }
          const opacity = hero ? 1 : 1 - smoothstep(0.48, 1.02, distance);
          material.opacity = opacity;
          frameMaterial.opacity = opacity;
          material.color.setScalar(hero && index !== 1 ? 0.72 : 1);
          const fan = hero ? 1 - current.heroProgress * 0.65 : 0;
          const scale = hero && index !== 1 ? 0.82 : 1;
          group.scale.set(
            ((planeHeight * aspect) / 10) * scale,
            (planeHeight / ((10 * 800) / 1422)) * scale,
            1,
          );
          if (hero) {
            group.position.set(
              delta * planeHeight * aspect * 0.77 * fan,
              -Math.abs(delta) * 0.22 - current.heroProgress * 0.3,
              -Math.abs(delta) * (2 + current.heroProgress * 2),
            );
            group.rotation.set(
              mobile ? 0 : -0.06 * fan + easedY * 0.018,
              delta * -0.26 * fan + (mobile ? 0 : easedX * 0.025),
              delta * -0.025 * fan,
            );
          } else {
            group.position.set(
              delta * viewWidth * 0.88,
              -Math.sin(distance * Math.PI) * 0.18,
              -distance * 2.8,
            );
            group.rotation.set(0, delta * -0.38, 0);
          }
        });
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setViewport(
          rect.left,
          height - rect.bottom,
          rect.width,
          rect.height,
        );
        renderer.setScissor(
          rect.left,
          Math.max(0, height - rect.bottom),
          rect.width,
          Math.min(height, rect.bottom) - Math.max(0, rect.top),
        );
        renderer.render(scene, camera);
        slot.dataset.rendered = "true";
      }
      if (settling) requestDraw();
    }

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      requestDraw();
    };
    const resetPointer = () => {
      pointerX = 0;
      pointerY = 0;
      requestDraw();
    };
    const onLoss = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      frame = 0;
      clearPosters();
    };
    const onRestore = () => {
      lost = false;
      requestDraw();
    };
    const mutation = new MutationObserver(requestDraw);
    slots.forEach((slot) => {
      mutation.observe(slot, {
        attributes: true,
        attributeFilter: ["data-screen"],
      });
      const section = slot.closest(".lp-journey");
      if (section)
        mutation.observe(section, {
          attributes: true,
          attributeFilter: ["data-position"],
        });
    });
    const resize = new ResizeObserver(requestDraw);
    slots.forEach((slot) => resize.observe(slot));
    window.addEventListener("scroll", requestDraw, { passive: true });
    window.addEventListener("resize", requestDraw);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", resetPointer);
    document.addEventListener("visibilitychange", requestDraw);
    canvas.addEventListener("webglcontextlost", onLoss);
    canvas.addEventListener("webglcontextrestored", onRestore);
    requestDraw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      mutation.disconnect();
      resize.disconnect();
      clearPosters();
      window.removeEventListener("scroll", requestDraw);
      window.removeEventListener("resize", requestDraw);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", requestDraw);
      canvas.removeEventListener("webglcontextlost", onLoss);
      canvas.removeEventListener("webglcontextrestored", onRestore);
      textures.forEach((texture) => texture.dispose());
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);
  return <canvas ref={canvasRef} className="lp-webgl" aria-hidden="true" />;
}
