import { useQueryClient } from "@tanstack/react-query";
import { Map as MapIcon, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { useMapTopology } from "../hooks/useMapTopology.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HOTSPOT_RING = 5;
const CLIENT_SPREAD = (170 * Math.PI) / 180;
const CLIENT_ORBIT_MIN = 5.2; // strongest signal (-50 dBm)
const CLIENT_ORBIT_MAX = 10.8; // weakest signal (-90 dBm)

// Heights cycle through varied levels so neighbouring hotspots never overlap
const HOTSPOT_HEIGHTS = [0, 2.2, -1.5, 3.0, 1.0, -2.5, 2.8, -0.8, 1.8, -1.2];

function hotspotHeight(i: number): number {
  return HOTSPOT_HEIGHTS[i % HOTSPOT_HEIGHTS.length];
}

function signalOrbit(dbm: number | undefined): number {
  if (dbm === undefined) return (CLIENT_ORBIT_MIN + CLIENT_ORBIT_MAX) / 2;
  const a = Math.max(50, Math.min(90, Math.abs(dbm)));
  return CLIENT_ORBIT_MIN + ((a - 50) / 40) * (CLIENT_ORBIT_MAX - CLIENT_ORBIT_MIN);
}

function signalHex(dbm: number): number {
  const a = Math.abs(dbm);
  if (a <= 50) return 0x4ade80;
  if (a <= 65) return 0xfacc15;
  if (a <= 75) return 0xfb923c;
  return 0xf87171;
}

function hslToHex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

function nameColor(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  }
  return hslToHex(h % 360, 0.65, 0.58);
}

function clientPositions(
  cx: number,
  cz: number,
  signals: (number | undefined)[],
  centerAngle: number,
  spread: number
): { x: number; z: number }[] {
  const count = signals.length;
  if (count === 0) return [];
  return signals.map((dbm, i) => {
    const r = signalOrbit(dbm);
    const a = count === 1 ? centerAngle : centerAngle - spread / 2 + (spread * i) / (count - 1);
    return { x: cx + r * Math.cos(a), z: cz + r * Math.sin(a) };
  });
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: topology, isLoading } = useMapTopology();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const hotspots = useMemo(
    () =>
      (topology?.accessPoints ?? []).map((ap) => ({
        ...ap,
        clients: ap.clients.map((c) => ({
          ...c,
          signal: c.signal_dbm,
          tooltip: [
            c.hostname ?? c.mac,
            c.signal_dbm !== undefined ? `${c.signal_dbm} dBm` : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      })),
    [topology]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    // ── Camera ───────────────────────────────────────────────────────────────
    // Compute initial position so all hotspots + clients are visible
    const sceneXZ = hotspots.length === 0 ? 3 : HOTSPOT_RING + CLIENT_ORBIT_MIN + 2;
    const usedAbsY =
      hotspots.length > 0
        ? Math.max(...hotspots.map((_, i) => Math.abs(hotspotHeight(i))))
        : 0;
    const fovHalfRad = (50 * Math.PI) / 180 / 2;
    const camDist = (sceneXZ / Math.tan(fovHalfRad)) * 1.15;
    const camY = usedAbsY + 4;
    const camZ = Math.sqrt(Math.max(camDist * camDist - camY * camY, 1));

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    camera.position.set(0, camY, camZ);

    // ── Renderers ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    Object.assign(labelRenderer.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
    });
    container.appendChild(labelRenderer.domElement);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(6, 10, 8);
    sun.castShadow = true;
    scene.add(sun);
    const glow = new THREE.PointLight(0x3b82f6, 3, 7);
    glow.position.set(0, 0.5, 0);
    scene.add(glow);

    // ── Grid ─────────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(22, 22, 0x1e293b, 0x1e293b);
    grid.position.y = -0.55;
    scene.add(grid);

    // ── OrbitControls ────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = false;
    controls.minDistance = 4;
    controls.maxDistance = Math.max(camDist * 1.5, 40);
    controls.maxPolarAngle = Math.PI / 2.05;

    // ── Shared geometries ────────────────────────────────────────────────────
    const geoSm = new THREE.SphereGeometry(0.18, 24, 12); // host (client)
    const geoMd = new THREE.OctahedronGeometry(0.38, 0); // hotspot (AP)
    const geoBig = new THREE.SphereGeometry(0.52, 48, 24); // LAN center

    function stdMat(color: number, emissiveIntensity = 0.3): THREE.MeshStandardMaterial {
      return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity,
        metalness: 0.15,
        roughness: 0.55,
        transparent: true,
        opacity: 1,
      });
    }

    function css2dLabel(text: string, sub?: string): CSS2DObject {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:1px;";
      const nameEl = document.createElement("span");
      nameEl.style.cssText =
        "background:rgba(15,23,42,0.88);color:#e2e8f0;font:600 10px/1.3 monospace;padding:1px 5px;border-radius:3px;white-space:nowrap;";
      nameEl.textContent = clip(text, 20);
      wrap.appendChild(nameEl);
      if (sub) {
        const subEl = document.createElement("span");
        subEl.style.cssText =
          "background:rgba(15,23,42,0.7);color:#64748b;font:9px/1.2 monospace;padding:0 4px;border-radius:3px;white-space:nowrap;";
        subEl.textContent = sub;
        wrap.appendChild(subEl);
      }
      const obj = new CSS2DObject(wrap);
      return obj;
    }

    // ── Raycaster ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const targets: THREE.Mesh[] = [];

    // ── Bbox ─────────────────────────────────────────────────────────────────
    const mesh = new THREE.Mesh(geoBig, stdMat(0x3b82f6, 0.4));
    mesh.castShadow = true;
    mesh.userData = { tooltip: "LAN" };
    scene.add(mesh);
    targets.push(mesh);

    const label = css2dLabel("LAN");
    label.position.set(0, -0.8, 0);
    mesh.add(label);

    // pulsing halo ring
    const haloGeo = new THREE.TorusGeometry(0.75, 0.03, 8, 80);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.5,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    mesh.add(halo);


    // ── Hotspots + clients ───────────────────────────────────────────────────
    const n = hotspots.length;

    type Group = {
      mats: THREE.MeshStandardMaterial[];
      lineMats: THREE.LineBasicMaterial[];
      labelEls: HTMLElement[];
      meshes: THREE.Mesh[];
    };
    const groups: Group[] = [];

    hotspots.forEach((hs, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
      const hx = HOTSPOT_RING * Math.cos(angle);
      const hz = HOTSPOT_RING * Math.sin(angle);
      const hy = hotspotHeight(i);

      const group: Group = { mats: [], lineMats: [], labelEls: [], meshes: [] };

      const hColor = nameColor(hs.label);
      const hMat = stdMat(hColor, 0.4);
      const hMesh = new THREE.Mesh(geoMd, hMat);
      hMesh.position.set(hx, hy, hz);
      hMesh.castShadow = true;
      hMesh.userData = {
        tooltip: `${hs.label}${hs.sublabel ? ` · ${hs.sublabel}` : ""} — ${hs.clients.length} client${hs.clients.length !== 1 ? "s" : ""}`,
        groupIdx: i,
      };
      scene.add(hMesh);
      targets.push(hMesh);
      group.mats.push(hMat);
      group.meshes.push(hMesh);

      const hlblWrap = document.createElement("div");
      hlblWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:1px;";
      const hlblName = document.createElement("span");
      hlblName.style.cssText =
        "background:rgba(15,23,42,0.88);color:#e2e8f0;font:600 10px/1.3 monospace;padding:1px 5px;border-radius:3px;white-space:nowrap;";
      hlblName.textContent = clip(hs.label, 20);
      hlblWrap.appendChild(hlblName);
      if (hs.sublabel) {
        const sub = document.createElement("span");
        sub.style.cssText =
          "background:rgba(15,23,42,0.7);color:#64748b;font:9px/1.2 monospace;padding:0 4px;border-radius:3px;white-space:nowrap;";
        sub.textContent = hs.sublabel;
        hlblWrap.appendChild(sub);
      }
      const hlbl = new CSS2DObject(hlblWrap);
      hlbl.position.set(0, -0.65, 0);
      hMesh.add(hlbl);
      group.labelEls.push(hlblWrap);

      // LAN → hotspot edge (3D)
      const eMat = new THREE.LineBasicMaterial({ color: 0x2d4a6b, linewidth: 1 });
      const eGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(hx, hy, hz),
      ]);
      scene.add(new THREE.Line(eGeo, eMat));
      group.lineMats.push(eMat);

      // clients orbit at the same height as their hotspot
      const clientPos = clientPositions(
        hx,
        hz,
        hs.clients.map((c) => c.signal),
        angle,
        CLIENT_SPREAD
      );

      hs.clients.forEach((c, j) => {
        const cp = clientPos[j];
        const cColor = c.signal !== undefined ? signalHex(c.signal) : 0x94a3b8;
        const cMat = stdMat(cColor, 0.4);
        const cMesh = new THREE.Mesh(geoSm, cMat);
        cMesh.position.set(cp.x, hy, cp.z);
        cMesh.userData = { tooltip: c.tooltip, groupIdx: i };
        scene.add(cMesh);
        targets.push(cMesh);
        group.mats.push(cMat);
        group.meshes.push(cMesh);

        const displayName = c.hostname ?? c.mac.slice(-8);
        const clblWrap = document.createElement("div");
        clblWrap.style.cssText =
          "display:flex;flex-direction:column;align-items:center;gap:1px;";
        const clblName = document.createElement("span");
        clblName.style.cssText =
          "background:rgba(15,23,42,0.88);color:#e2e8f0;font:600 10px/1.3 monospace;padding:1px 5px;border-radius:3px;white-space:nowrap;";
        clblName.textContent = clip(displayName, 14);
        clblWrap.appendChild(clblName);
        const clbl = new CSS2DObject(clblWrap);
        clbl.position.set(0, -0.32, 0);
        cMesh.add(clbl);
        group.labelEls.push(clblWrap);

        const ceMat = new THREE.LineBasicMaterial({ color: 0x883300, linewidth: 1 });
        const ceGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(hx, hy, hz),
          new THREE.Vector3(cp.x, hy, cp.z),
        ]);
        scene.add(new THREE.Line(ceGeo, ceMat));
        group.lineMats.push(ceMat);
      });

      groups.push(group);
    });

    // ── Resize ───────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      labelRenderer.setSize(nw, nh);
    });
    ro.observe(container);

    // ── Hover tooltip ─────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(targets);
      if (hits.length > 0) {
        const tip = (hits[0].object as THREE.Mesh).userData.tooltip as string;
        setTooltip({ text: tip, x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setTooltip(null);
      }
    };
    const onMouseLeave = () => setTooltip(null);

    let selectedGroup = -1;
    function applySelection(sel: number) {
      selectedGroup = sel;
      groups.forEach((g, gi) => {
        const dim = sel !== -1 && gi !== sel;
        const opacity = dim ? 0.15 : 1;
        for (const m of g.mats) m.opacity = opacity;
        for (const lm of g.lineMats) {
          lm.opacity = opacity;
          lm.transparent = dim;
        }
        for (const el of g.labelEls) el.style.opacity = dim ? "0.12" : "1";
      });
    }

    let downX = 0;
    let downY = 0;
    const onMouseDown = (e: MouseEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onClick = (e: MouseEvent) => {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (dx * dx + dy * dy > 25) return; // drag — ignore
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(targets);
      const hitGroupIdx =
        hits.length > 0
          ? ((hits[0].object as THREE.Mesh).userData.groupIdx as number | undefined) ?? -1
          : -1;
      applySelection(hitGroupIdx === selectedGroup ? -1 : hitGroupIdx);
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);
    renderer.domElement.addEventListener("click", onClick);

    // ── Animation loop ────────────────────────────────────────────────────────
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = performance.now();
      // pulse bbox + halo
      const pulse = 1 + 0.045 * Math.sin(t * 0.0025);
      mesh.scale.setScalar(pulse);
      haloMat.opacity = 0.35 + 0.2 * Math.sin(t * 0.002);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      renderer.domElement.removeEventListener("click", onClick);
      setTooltip(null);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
          ((obj as THREE.Mesh).material as THREE.Material).dispose();
        } else if ((obj as THREE.Line).isLine) {
          (obj as THREE.Line).geometry.dispose();
        }
      });
      geoSm.dispose();
      geoMd.dispose();
      geoBig.dispose();
      haloGeo.dispose();
      for (const g of groups) {
        for (const lm of g.lineMats) lm.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelRenderer.domElement))
        container.removeChild(labelRenderer.domElement);
    };
  }, [hotspots]);

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <MapIcon size={20} className="text-blue-400 shrink-0" />
        <h1 className="text-lg font-semibold text-slate-100 flex-1">{t("map.title")}</h1>
        <button
          type="button"
          onClick={() => {
            void qc.invalidateQueries({ queryKey: ["map", "topology"] });
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          {t("common.refresh")}
        </button>
      </div>

      {/* Three.js canvas */}
      <div className="relative flex-1 min-h-0 bg-slate-950 rounded-xl border border-slate-700 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10, zIndex: 10 }}
          >
            {tooltip.text}
          </div>
        )}
        <p className="absolute bottom-2 right-3 text-xs text-slate-600 pointer-events-none select-none">
          {t("map.hint")}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400 px-1 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block bg-blue-500" />
          {t("map.legendBbox")}
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
            <polygon points="6,0 12,6 6,12 0,6" fill="#a78bfa" />
          </svg>
          {t("map.legendHotspot")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block bg-slate-400" />
          {t("map.legendClient")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-8 h-3 rounded-full inline-block"
            style={{ background: "linear-gradient(to right,#4ade80,#facc15,#fb923c,#f87171)" }}
          />
          {t("map.legendSignal")}
        </span>
      </div>
    </div>
  );
}
