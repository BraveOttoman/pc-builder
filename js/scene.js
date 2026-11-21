// RigForge 3D scene: procedurally built PC case + components, ARGB lighting, bloom, effects.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { fanLayout } from './compat.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const FONT = '"Chakra Petch", "Segoe UI", sans-serif';
const ORDER = ['case', 'motherboard', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'fans'];

const ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const clamp01 = v => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ materials & helpers */

function std(color, metalness = 0.3, roughness = 0.5, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

/** Emissive material driven by the ARGB controller. */
function rgbMat(intensity = 2.6, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color: 0x0c0d10, emissive: 0xffffff, emissiveIntensity: 0, metalness: 0, roughness: 0.35, ...extra });
    m.userData.rgb = { intensity };
    return m;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
}

function cylZ(r, len, mat, seg = 32) {   // cylinder whose axis is Z
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.rotation.x = Math.PI / 2;
    return m;
}

function canvasTex(w, h, draw, { srgb = true, shared = false, repeat = null } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    if (shared) t.userData.shared = true;
    return t;
}

function mulberry(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pcbTexture(white, boardH) {
    const W = 512, H = Math.round(512 * boardH / 2.44);
    return canvasTex(W, H, (g) => {
        const rnd = mulberry(boardH * 1000 + (white ? 7 : 3));
        g.fillStyle = white ? '#e4e7ec' : '#14161b';
        g.fillRect(0, 0, W, H);
        g.lineCap = 'round';
        for (let i = 0; i < 260; i++) {
            g.strokeStyle = white ? `rgba(150,160,178,${0.35 + rnd() * 0.3})` : `rgba(58,68,84,${0.4 + rnd() * 0.4})`;
            g.lineWidth = 0.8 + rnd() * 1.6;
            let x = rnd() * W, y = rnd() * H;
            g.beginPath(); g.moveTo(x, y);
            for (let s = 0; s < 3; s++) {
                const len = 15 + rnd() * 70, dir = Math.floor(rnd() * 8) * Math.PI / 4;
                x += Math.cos(dir) * len; y += Math.sin(dir) * len;
                g.lineTo(x, y);
            }
            g.stroke();
            g.fillStyle = g.strokeStyle;
            g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill();
        }
        g.fillStyle = white ? 'rgba(90,100,115,0.7)' : 'rgba(150,160,175,0.45)';
        g.font = `600 13px ${FONT}`;
        for (let i = 0; i < 16; i++) g.fillText(['C' + Math.floor(rnd() * 400), 'R' + Math.floor(rnd() * 90), 'PCIE_' + (i % 3), 'VRM', 'M2_1', 'DIMM'][i % 6], rnd() * W, rnd() * H);
    });
}

let MESH_ALPHA = null;
function meshAlpha() {
    if (MESH_ALPHA) return MESH_ALPHA;
    MESH_ALPHA = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#000';
        const s = 16;
        for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
            const x = col * s + (row % 2 ? s / 2 : 0), y = row * s * 0.866 * 1.155;
            g.beginPath(); g.arc(x, y, s * 0.36, 0, TAU); g.fill();
        }
    }, { srgb: false, shared: true });
    MESH_ALPHA.wrapS = MESH_ALPHA.wrapT = THREE.RepeatWrapping;
    return MESH_ALPHA;
}

function perforated(color, metal, rough, rx, ry) {
    const a = meshAlpha().clone();
    a.repeat.set(rx, ry); a.needsUpdate = true;
    return std(color, metal, rough, { alphaMap: a, transparent: true, side: THREE.DoubleSide, alphaTest: 0.02 });
}

function glassMat(tint = 0x6f8194, opacity = 0.07) {
    return new THREE.MeshPhysicalMaterial({
        color: tint, metalness: 0, roughness: 0.05, transparent: true, opacity,
        clearcoat: 0.4, clearcoatRoughness: 0.05, envMapIntensity: 0.35, depthWrite: false, side: THREE.FrontSide,
    });
}

function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) {
    return canvasTex(size, size, (g, w) => {
        const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, inner); gr.addColorStop(1, outer);
        g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }, { shared: true });
}

/* ------------------------------------------------------------------ fan */

function makeFan(size, { rgb = true, white = false, frameless = false, blades = 9, spin = 9 } = {}) {
    const g = new THREE.Group();
    const depth = 0.25;
    const frameMat = std(white ? 0xeef0f3 : 0x15171b, 0.15, 0.55);
    if (!frameless) {
        const s = size / 2, r = s * 0.06;
        const shape = new THREE.Shape();
        shape.moveTo(-s + r, -s); shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
        shape.lineTo(s, s - r); shape.quadraticCurveTo(s, s, s - r, s); shape.lineTo(-s + r, s);
        shape.quadraticCurveTo(-s, s, -s, s - r); shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
        const hole = new THREE.Path(); hole.absarc(0, 0, s * 0.93, 0, TAU, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
        geo.translate(0, 0, -depth / 2);
        g.add(new THREE.Mesh(geo, frameMat));
        // struts on the back
        for (let i = 0; i < 4; i++) {
            const st = box(s * 0.85, 0.03, 0.03, frameMat);
            st.rotation.z = i * Math.PI / 2 + Math.PI / 4;
            st.position.set(Math.cos(st.rotation.z) * s * 0.55, Math.sin(st.rotation.z) * s * 0.55, -depth / 2 + 0.02);
            g.add(st);
        }
    }
    if (rgb) {
        for (const z of frameless ? [depth / 2 - 0.02] : [depth / 2 + 0.002, -depth / 2 - 0.002]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.468, 0.014, 8, 72), rgbMat(3));
            ring.position.z = z;
            g.add(ring);
        }
    }
    const hub = cylZ(size * 0.15, depth * 0.72, std(white ? 0xf4f5f7 : 0x1b1d22, 0.2, 0.5));
    g.add(hub);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(size * 0.12, 32), rgb ? rgbMat(1.6) : std(0x2a2d33, 0.8, 0.3));
    cap.position.z = depth * 0.36 + 0.002;
    g.add(cap);

    const rotor = new THREE.Group();
    const bladeMat = rgb
        ? (() => { const m = rgbMat(0.55, { color: 0xd8dee6, transparent: true, opacity: 0.6, roughness: 0.25 }); return m; })()
        : std(white ? 0xe9ecf0 : 0x1e2025, 0.1, 0.6);
    const bl = size * 0.31, bw = size * 0.14;
    const bladeGeo = new THREE.BoxGeometry(bl, bw, 0.012);
    for (let i = 0; i < blades; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.z = (i / blades) * TAU;
        const b = new THREE.Mesh(bladeGeo, bladeMat);
        b.position.x = size * 0.15 + bl / 2 - 0.02;
        b.rotation.x = 0.55;
        b.rotation.z = 0.22;
        pivot.add(b);
        rotor.add(pivot);
    }
    rotor.userData.spin = spin * (0.9 + Math.random() * 0.2);
    rotor.rotation.z = Math.random() * TAU;
    g.add(rotor);
    return g;
}

/* ------------------------------------------------------------------ layout */

function computeLayout(caseP, mb) {
    const { d, h, w } = caseP.dims;
    const L = { d, h, w, rear: -d / 2, front: d / 2, back: -w / 2, glass: w / 2 };
    L.trayZ = -w / 2 + 0.06;
    L.boardW = 2.44;
    L.boardH = mb && mb.form === 'mATX' ? 2.44 : 3.05;
    L.bo = new V3(-d / 2 + 0.32, h - 0.38, L.trayZ + 0.12);           // board top-left (back face)
    L.bf = L.bo.z + 0.04;                                              // board front surface z
    L.socket = new V3(L.bo.x + 1.05, L.bo.y - 0.95, L.bf);
    L.ramX = [1.72, 1.83, 1.97, 2.08].map(x => L.bo.x + x);
    L.ramY = L.bo.y - 0.95;
    L.pcieY = L.bo.y - 1.75;
    L.m2 = new V3(L.bo.x + 0.95, L.bo.y - 1.42, L.bf);
    L.gpuX0 = L.rear + 0.14;
    L.shroudH = 0.95;
    L.psu = new V3(L.rear + 0.14 + 0.75, 0.08 + 0.45, 0);
    L.radZ = L.bf + 1.16;
    return L;
}

/* ------------------------------------------------------------------ scene */

export class RigScene {
    constructor(canvas, { onHover, onPick } = {}) {
        this.canvas = canvas;
        this.onHover = onHover || (() => {});
        this.onPick = onPick || (() => {});
        this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

        const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        r.setSize(window.innerWidth, window.innerHeight, false);
        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = 1.05;
        r.shadowMap.enabled = true;
        r.shadowMap.type = THREE.PCFSoftShadowMap;

        const s = this.scene = new THREE.Scene();
        s.fog = new THREE.Fog(0x05060a, 18, 46);
        const pmrem = new THREE.PMREMGenerator(r);
        s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        s.environmentIntensity = 0.45;

        this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(15, 2.2, 19);

        const c = this.controls = new OrbitControls(this.camera, canvas);
        c.enableDamping = true; c.dampingFactor = 0.06;
        c.minDistance = 3; c.maxDistance = 40;
        c.maxPolarAngle = Math.PI * 0.53;
        c.target.set(0, 2.5, 0);
        c.autoRotateSpeed = 0.55;
        c.addEventListener('start', () => { this.camTween = null; this.lastInteract = performance.now(); });
        c.addEventListener('end', () => { this.lastInteract = performance.now(); });

        this.composer = new EffectComposer(r);
        this.composer.addPass(new RenderPass(s, this.camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.85, 0.55, 0.92);
        this.composer.addPass(this.bloom);
        this.composer.addPass(new OutputPass());

        this._lights();
        this._world();

        this.rig = new THREE.Group();
        this.rig.position.y = 0.12;
        s.add(this.rig);
        this.slotRoot = new THREE.Group(); this.rig.add(this.slotRoot);
        this.ghostRoot = new THREE.Group(); this.rig.add(this.ghostRoot);
        this.cableRoot = new THREE.Group(); this.rig.add(this.cableRoot);
        this.fxRoot = new THREE.Group(); s.add(this.fxRoot);

        this.slots = {};
        this.current = {};
        this.rgbList = [];
        this.rotors = [];
        this.explodables = [];
        this.powerMats = [];
        this.tweens = [];
        this.effects = [];
        this.rgb = { color: new THREE.Color('#29e0ff'), mode: 'rainbow' };
        this.powered = false;
        this.powerLevel = 0;     // fan speed 0..1
        this.bootT = -1;         // RGB boot sweep progress
        this.explodeK = 0; this.explodeTarget = 0;
        this.autoRotate = true;
        this.lastInteract = performance.now();
        this.hovered = null;
        this.pointer = new THREE.Vector2(); this.pointerDirty = false;
        this.raycaster = new THREE.Raycaster();
        this.time = 0;
        this.tmpColor = new THREE.Color();
        this.L = null;

        this._events();
        this.clock = new THREE.Clock();
        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    /* ---------------- world */

    _lights() {
        const s = this.scene;
        s.add(new THREE.HemisphereLight(0x8a9bc4, 0x0a0a0c, 0.5));
        const key = this.key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(5, 11, 9);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        Object.assign(key.shadow.camera, { left: -5, right: 5, top: 7, bottom: -3, near: 1, far: 30 });
        key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
        s.add(key);
        const rimA = new THREE.DirectionalLight(0x29e0ff, 1.6); rimA.position.set(-9, 7, -7); s.add(rimA);
        const rimB = new THREE.DirectionalLight(0xff3df0, 1.4); rimB.position.set(9, 3, -9); s.add(rimB);
        this.inner = new THREE.PointLight(0x29e0ff, 0, 7, 1.6);
        this.inner.position.set(0.3, 2.6, 0.3);
        s.add(this.inner);
    }

    _world() {
        const s = this.scene;
        // sky dome gradient
        const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, fog: false,
            uniforms: { top: { value: new THREE.Color(0x0b1020) }, bottom: { value: new THREE.Color(0x030305) } },
            vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
            fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k = smoothstep(-0.1, 0.6, vP.y); gl_FragColor = vec4(mix(bottom, top, k), 1.0); }',
        }));
        s.add(sky);

        const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), std(0x08090c, 0.25, 0.62));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        s.add(floor);

        const grid = canvasTex(1024, 1024, (g, w) => {
            g.clearRect(0, 0, w, w);
            const step = w / 32;
            for (let i = 0; i <= 32; i++) {
                g.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)';
                g.lineWidth = i % 4 === 0 ? 2 : 1;
                g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, w); g.stroke();
                g.beginPath(); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke();
            }
            g.globalCompositeOperation = 'destination-in';
            const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(0, 0, w, w);
        }, { shared: true });
        const gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshBasicMaterial({
            map: grid, color: 0x2a6f9a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        gridMesh.rotation.x = -Math.PI / 2; gridMesh.position.y = 0.003;
        s.add(gridMesh);
        this.gridMesh = gridMesh;

        this.pad = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({
            map: radialTex('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5,
        }));
        this.pad.rotation.x = -Math.PI / 2; this.pad.position.y = 0.006;
        s.add(this.pad);

        this.ring = new THREE.Mesh(new THREE.RingGeometry(3.45, 3.5, 160), new THREE.MeshBasicMaterial({ color: 0x29e0ff, transparent: true, side: THREE.DoubleSide }));
        this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.009;
        s.add(this.ring);
        this.ring2 = new THREE.Mesh(new THREE.RingGeometry(3.7, 3.715, 160, 1, 0, Math.PI * 1.3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
        this.ring2.rotation.x = -Math.PI / 2; this.ring2.position.y = 0.009;
        s.add(this.ring2);

        // floating dust
        const N = this.reducedMotion ? 200 : 700;
        const pos = new Float32Array(N * 3);
        this.dustVel = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 26;
            pos[i * 3 + 1] = Math.random() * 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
            this.dustVel[i] = 0.04 + Math.random() * 0.12;
        }
        const dg = new THREE.BufferGeometry();
        dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.dust = new THREE.Points(dg, new THREE.PointsMaterial({
            size: 0.06, map: radialTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fd8ff, opacity: 0.55,
        }));
        s.add(this.dust);
    }

    /* ---------------- events */

    _events() {
        window.addEventListener('resize', () => this.resize());
        const el = this.canvas;
        let down = null;
        el.addEventListener('pointermove', e => {
            this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
            this.pointerClient = { x: e.clientX, y: e.clientY };
            this.pointerDirty = true;
        });
        el.addEventListener('pointerleave', () => { this._setHover(null); this.pointerClient = null; });
        el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
        el.addEventListener('pointerup', e => {
            if (!down) return;
            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
            down = null;
            if (moved > 6) return;
            this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
            const hit = this._pick();
            if (hit) this.onPick(hit);
        });
    }

    /** Screen-space insets (px) covered by UI; the 3D view is re-centred into the free area. */
    setInsets(insets) {
        this.insets = insets;
        this.resize();
    }

    resize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        const i = this.insets || { left: 0, right: 0, top: 0, bottom: 0 };
        const dx = (i.left - i.right) / 2, dy = (i.top - i.bottom) / 2;
        if (dx || dy) this.camera.setViewOffset(w, h, -dx, -dy, w, h);
        else this.camera.clearViewOffset();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
        this.composer.setSize(w, h);
    }

    _pick() {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObject(this.slotRoot, true);
        for (const h of hits) {
            let o = h.object, skip = false;
            while (o && o !== this.slotRoot) {
                if (o.userData.noPick) { skip = true; break; }
                if (o.userData.slot) return skip ? null : o.userData.slot;
                o = o.parent;
            }
        }
        return null;
    }

    _setHover(cat) {
        if (cat === this.hovered) return;
        if (this.hovered) this._highlight(this.hovered, false);
        this.hovered = cat;
        if (cat) this._highlight(cat, true);
        this.canvas.style.cursor = cat ? 'pointer' : '';
        this.onHover(cat, this.pointerClient);
    }

    _highlight(cat, on) {
        const g = this.slots[cat];
        if (!g) return;
        g.traverse(o => {
            const m = o.material;
            if (!o.isMesh || !m || !m.emissive || m.userData.rgb || o.userData.noPick) return;
            if (on) {
                if (!m.userData.hl) m.userData.hl = { c: m.emissive.clone(), i: m.emissiveIntensity };
                m.emissive.set(0x29e0ff); m.emissiveIntensity = 0.12;
            } else if (m.userData.hl) {
                m.emissive.copy(m.userData.hl.c); m.emissiveIntensity = m.userData.hl.i; delete m.userData.hl;
            }
        });
    }

    /* ---------------- public API */

    setRGB(hex, mode) {
        if (hex) this.rgb.color.set(hex);
        if (mode) this.rgb.mode = mode;
    }

    setPower(on) {
        this.powered = on;
        if (on && this.bootT > 0.5) this.bootT = 0;
    }

    setExplode(on) { this.explodeTarget = on ? 1 : 0; }
    setAutoRotate(on) { this.autoRotate = on; }

    /**
     * Sync the scene to a build ({cat: part}). Changed slots are rebuilt; `animate` lists slots
     * that should fly in.
     */
    setBuild(build, { animate = true } = {}) {
        const caseChanged = build.case?.id !== this.current.case?.id;
        const boardChanged = build.motherboard?.id !== this.current.motherboard?.id;
        const changed = ORDER.filter(cat => (build[cat]?.id || null) !== (this.current[cat]?.id || null));
        if (!changed.length && this.L) return [];
        if (!build.case) return [];
        this.L = computeLayout(build.case, build.motherboard);
        const toRebuild = new Set(caseChanged || boardChanged ? ORDER : changed);
        if (changed.includes('cooler')) toRebuild.add('fans');
        if (changed.includes('fans') || changed.includes('cooler')) { toRebuild.add('fans'); }
        for (const cat of toRebuild) this._buildSlot(cat, build[cat], build);
        this.current = { ...build };
        this._buildGhosts(build);
        this._buildCables(build);
        this._collect();
        if (animate) for (const cat of changed) if (this.slots[cat]) this._flyIn(cat);
        return changed;
    }

    /** Glide the camera to look at a part (or 'overview'). */
    focus(cat, dur = 1.2) {
        const L = this.L;
        if (!L) return;
        const y0 = this.rig.position.y;
        const sz = L.h / 4.8;
        let target, offset;
        const ex = this.explodeTarget ? 1.35 : 1;
        switch (cat) {
            case 'cpu': target = L.socket.clone(); offset = new V3(1.4, 0.7, 4.2); break;
            case 'cooler': target = L.socket.clone().add(new V3(0.2, 0, 0.6)); offset = new V3(2.2, 1.1, 5.2); break;
            case 'motherboard': target = new V3(L.bo.x + 1.22, L.bo.y - L.boardH / 2, L.bf); offset = new V3(1.4, 0.8, 6.6); break;
            case 'ram': target = new V3(L.ramX[1], L.ramY, L.bf + 0.2); offset = new V3(1.6, 0.9, 4.2); break;
            case 'gpu': target = new V3(L.gpuX0 + 1.7, L.pcieY - 0.3, L.bf + 0.7); offset = new V3(1.2, 1.8, 5.6); break;
            case 'storage': target = L.m2.clone(); offset = new V3(0.9, 1.6, 3.4); break;
            case 'psu': target = L.psu.clone(); offset = new V3(1.8, 1.3, 5); break;
            case 'fans': target = new V3(L.front - 0.6, L.h * 0.55, 0); offset = new V3(4.2, 1.6, 6.2); break;
            default: target = new V3(0, L.h * 0.48, 0); offset = new V3(6.3, 3.1, 10.4).multiplyScalar(sz);
        }
        target.y += y0;
        // Fit to the screen area not covered by UI (desktop baseline ≈ 1.0; portrait phones zoom out).
        const ins = this.insets || { left: 0, right: 0, top: 0, bottom: 0 };
        const W = window.innerWidth, Hs = window.innerHeight;
        const freeW = Math.max(160, W - ins.left - ins.right), freeH = Math.max(160, Hs - ins.top - ins.bottom);
        const fit = Math.min(3, Math.max(0.85, (Hs / Math.min(freeW / 5.4, freeH / 7)) / 7.63));
        offset.multiplyScalar(fit);
        this.lastFocus = cat;
        if (cat === 'overview' || cat === 'case' || !cat) offset.multiplyScalar(ex);
        else if (this.explodeTarget) { offset.multiplyScalar(1.25); target.z += 0.9; }
        this.camTween = {
            t: 0, dur,
            fromPos: this.camera.position.clone(), fromTgt: this.controls.target.clone(),
            toPos: target.clone().add(offset), toTgt: target,
        };
        this.lastInteract = performance.now();
    }

    /** Camera starting point for the intro fly-in. */
    introCamera() {
        this.camera.position.set(13, 1.2, 17);
        this.controls.target.set(0, 2.4, 0);
    }

    /* ---------------- building */

    _disposeTree(obj) {
        obj.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            for (const m of mats) {
                for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k] && !m[k].userData.shared) m[k].dispose();
                m.dispose();
            }
        });
    }

    _buildSlot(cat, part, build) {
        const old = this.slots[cat];
        if (old) { this.slotRoot.remove(old); this._disposeTree(old); delete this.slots[cat]; }
        if (this.hovered === cat) this.hovered = null;
        if (!part) return;
        const L = this.L;
        const g = new THREE.Group();
        g.userData.slot = cat;
        switch (cat) {
            case 'case': this._case(g, part, L); break;
            case 'motherboard': this._board(g, part, L); break;
            case 'cpu': this._cpu(g, part, L); break;
            case 'cooler': this._cooler(g, part, L); break;
            case 'ram': this._ram(g, part, L); break;
            case 'gpu': this._gpu(g, part, L); break;
            case 'storage': this._storage(g, part, L); break;
            case 'psu': this._psu(g, part, L); break;
            case 'fans': this._fans(g, part, L, build); break;
        }
        g.traverse(o => {
            if (!o.isMesh) return;
            const m = o.material;
            o.castShadow = !(m.transparent || m.userData?.rgb);
            o.receiveShadow = !m.transparent;
        });
        this.slots[cat] = g;
        this.slotRoot.add(g);
    }

    _sub(parent, explode) {     // sub-group that moves when exploded
        const s = new THREE.Group();
        s.userData.explode = explode;
        parent.add(s);
        return s;
    }

    _case(g, p, L) {
        const { d, h, w } = L;
        const white = p.color === 'white';
        const bodyHex = p.tint ? new THREE.Color(p.tint).getHex() : white ? 0xe7eaee : 0x17191e;
        const innerHex = p.tint ? new THREE.Color(p.tint).multiplyScalar(white ? 0.92 : 0.6).getHex() : white ? 0xd9dde3 : 0x0f1115;
        const body = std(bodyHex, white ? 0.15 : 0.6, white ? 0.42 : 0.38);
        const inner = std(innerHex, 0.35, 0.62);
        const foot = std(0x0b0c0f, 0.2, 0.8);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.4, 0.12, 0.28, foot, sx * (d / 2 - 0.45), -0.06, sz * (w / 2 - 0.28)));

        g.add(box(d, 0.08, w, body, 0, 0.04, 0));                                       // bottom
        const top = box(d - 0.14, 0.04, w - 0.14, perforated(bodyHex, 0.5, 0.45, d * 2.2, w * 2.2), 0, h - 0.02, 0);
        top.userData.noPick = true; g.add(top);
        g.add(box(d, 0.08, 0.07, body, 0, h - 0.04, w / 2 - 0.035));                   // top rails
        g.add(box(d, 0.08, 0.07, body, 0, h - 0.04, -w / 2 + 0.035));
        g.add(box(0.07, 0.08, w, body, d / 2 - 0.035, h - 0.04, 0));
        g.add(box(0.07, 0.08, w, body, -d / 2 + 0.035, h - 0.04, 0));
        g.add(box(0.06, h, w, inner, -d / 2 + 0.03, h / 2, 0));                         // rear
        g.add(box(d, h, 0.06, inner, 0, h / 2, -w / 2 + 0.03));                         // tray / back side
        for (const [x, z] of [[d / 2 - 0.05, w / 2 - 0.05], [d / 2 - 0.05, -w / 2 + 0.05], [-d / 2 + 0.05, w / 2 - 0.05]])
            g.add(box(0.1, h, 0.1, body, x, h / 2, z));
        g.add(box(d, 0.1, 0.1, body, 0, 0.1, w / 2 - 0.05));                            // bottom glass rail

        // front panel
        let front;
        if (p.front === 'mesh') front = box(0.05, h - 0.2, w - 0.2, perforated(p.tint ? bodyHex : white ? 0xe7eaee : 0x1b1d22, 0.55, 0.4, w * 3, h * 3), d / 2 - 0.025, h / 2, 0);
        else if (p.front === 'solid') {
            // brushed solid panel with side intake slits — fans hide behind it
            front = box(0.06, h - 0.2, w - 0.42, std(bodyHex, 0.75, 0.32), d / 2 - 0.03, h / 2, 0);
            for (const z of [w / 2 - 0.15, -w / 2 + 0.15]) g.add(box(0.05, h - 0.2, 0.06, perforated(bodyHex, 0.5, 0.45, 0.3, h * 3), d / 2 - 0.03, h / 2, z));
            g.add(box(0.012, h * 0.55, 0.018, rgbMat(1.8), d / 2 + 0.002, h * 0.55, 0));   // accent light bar
        } else front = box(0.03, h - 0.2, w - 0.2, glassMat(0x8899aa, p.color === 'black' ? 0.28 : 0.14), d / 2 - 0.02, h / 2, 0);
        front.userData.noPick = p.front !== 'solid';
        g.add(front);

        // side glass (slides off when exploded)
        const glassG = this._sub(g, new V3(0, 0.2, 3.4));
        const glass = box(d - 0.12, h - 0.14, 0.025, glassMat(), 0, h / 2, w / 2 - 0.02);
        glass.userData.noPick = true; glass.userData.fadeOnExplode = true;
        glassG.add(glass);

        // PSU shroud
        const sd = d - 0.42, sx = -d / 2 + sd / 2;
        g.add(box(sd, 0.04, w - 0.12, body, sx, L.shroudH, 0));
        const shroudSide = this._sub(g, new V3(0, 0, 2.2));
        const smoked = box(sd, L.shroudH - 0.08, 0.03, new THREE.MeshPhysicalMaterial({
            color: white ? 0xc9ced6 : 0x0a0c10, transparent: true, opacity: white ? 0.82 : 0.78, roughness: 0.2, metalness: 0.3,
        }), sx, (L.shroudH + 0.08) / 2, w / 2 - 0.1);
        smoked.userData.noPick = true;
        shroudSide.add(smoked);
        const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.24), rgbMat(1.8, {
            transparent: true, emissiveMap: canvasTex(512, 88, (c2, cw, ch) => {
                c2.fillStyle = '#000'; c2.fillRect(0, 0, cw, ch);
                c2.fillStyle = '#fff'; c2.font = `700 58px ${FONT}`; c2.textBaseline = 'middle';
                c2.fillText('RIGFORGE', 14, ch / 2 + 3);
            }), alphaMap: null, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        logo.position.set(d / 2 - 1.35, L.shroudH / 2 + 0.05, w / 2 - 0.08);
        shroudSide.add(logo);
        const strip = box(sd - 0.12, 0.022, 0.02, rgbMat(2.6), sx, L.shroudH - 0.03, w / 2 - 0.085);
        shroudSide.add(strip);

        // front inner LED strips
        g.add(box(0.025, h - 0.5, 0.025, rgbMat(2.4), d / 2 - 0.12, h / 2 + 0.1, w / 2 - 0.13));
        g.add(box(0.025, h - 0.5, 0.025, rgbMat(2.4), d / 2 - 0.12, h / 2 + 0.1, -w / 2 + 0.13));

        // grommets
        const rubber = std(0x050506, 0.0, 0.9);
        for (let i = 0; i < 3; i++) g.add(box(0.14, 0.5, 0.02, rubber, L.bo.x + L.boardW + 0.28, L.bo.y - 0.5 - i * 0.75, L.trayZ + 0.035));

        // power button + LED ring
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 32), std(0x1a1b1f, 0.8, 0.3));
        btn.position.set(d / 2 - 0.4, h + 0.012, w / 2 - 0.4);
        g.add(btn);
        const led = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.01, 8, 40), std(0x111111, 0, 0.4, { emissive: 0xffffff, emissiveIntensity: 0 }));
        led.rotation.x = Math.PI / 2;
        led.position.copy(btn.position).y += 0.012;
        led.userData.powerLed = true;
        g.add(led);
    }

    _board(g, p, L) {
        const white = p.color === 'white';
        const H = L.boardH, W = L.boardW;
        const b = new THREE.Group();
        b.position.copy(L.bo);
        g.add(b);
        const pcb = box(W, H, 0.04, std(0xffffff, 0.25, 0.6, { map: pcbTexture(white, H) }), W / 2, -H / 2, 0.02);
        b.add(pcb);
        const sink = std(white ? 0xf1f3f6 : 0x2a2e36, white ? 0.35 : 0.85, 0.32);
        const accent = std(white ? 0xb9c0ca : 0x8b929e, 0.95, 0.25);
        const plastic = std(white ? 0xf5f6f8 : 0x101114, 0.05, 0.5);
        const z0 = 0.04;
        // IO shroud with ARGB line
        b.add(box(0.36, 1.08, 0.36, sink, 0.2, -0.6, z0 + 0.18));
        b.add(box(0.03, 0.9, 0.012, rgbMat(2.6), 0.28, -0.6, z0 + 0.366));
        b.add(box(0.36, 0.06, 0.012, accent, 0.2, -0.12, z0 + 0.366));
        // VRM heatsinks
        b.add(box(0.85, 0.28, 0.24, sink, 0.88, -0.22, z0 + 0.12));
        for (let i = 0; i < 6; i++) b.add(box(0.85, 0.012, 0.03, accent, 0.88, -0.12 - i * 0.04, z0 + 0.245));
        // socket
        b.add(box(0.58, 0.58, 0.03, std(0x3a3d44, 0.7, 0.35), 1.05, -0.95, z0 + 0.015));
        b.add(box(0.46, 0.46, 0.012, std(0xc9a64a, 0.9, 0.3), 1.05, -0.95, z0 + 0.032));
        // caps around socket
        const capMat = std(0x2b2e35, 0.9, 0.3);
        for (let i = 0; i < 8; i++) {
            const c = cylZ(0.035, 0.08, capMat, 12);
            c.position.set(0.62 + (i % 4) * 0.08, -1.32 - Math.floor(i / 4) * 0.08, z0 + 0.04);
            b.add(c);
        }
        // DIMM slots
        for (const x of [1.72, 1.83, 1.97, 2.08]) b.add(box(0.05, 1.4, 0.07, plastic, x, -0.95, z0 + 0.035));
        // PCIe slots
        b.add(box(0.9, 0.065, 0.08, accent, 0.9, -1.75, z0 + 0.04));
        b.add(box(0.9, 0.06, 0.07, plastic, 0.9, -2.35, z0 + 0.035));
        if (H > 2.5) b.add(box(0.9, 0.06, 0.07, plastic, 0.9, -2.75, z0 + 0.035));
        // M.2 cover plate (lower)
        b.add(box(0.9, 0.24, 0.05, sink, 0.9, -2.05, z0 + 0.025));
        // chipset heatsink + label
        const cy = -H + 0.5;
        const chip = box(0.62, 0.62, 0.1, sink, 1.86, cy, z0 + 0.05);
        b.add(chip);
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), new THREE.MeshStandardMaterial({
            transparent: true, metalness: 0.6, roughness: 0.3,
            map: canvasTex(256, 256, (c2, cw) => {
                c2.clearRect(0, 0, cw, cw);
                c2.strokeStyle = white ? '#9aa3af' : '#4b5260'; c2.lineWidth = 6;
                c2.strokeRect(14, 14, cw - 28, cw - 28);
                c2.fillStyle = white ? '#5d6675' : '#c8ced8';
                c2.font = `700 54px ${FONT}`; c2.textAlign = 'center'; c2.textBaseline = 'middle';
                c2.fillText(p.chipset, cw / 2, cw / 2 - 18);
                c2.font = `500 26px ${FONT}`; c2.fillText(p.name.split(' ')[0].toUpperCase(), cw / 2, cw / 2 + 36);
            }),
        }));
        lbl.position.set(1.86, cy, z0 + 0.101);
        lbl.userData.noPick = false;
        b.add(lbl);
        // power connectors
        b.add(box(0.1, 0.56, 0.12, plastic, W - 0.08, -1.2, z0 + 0.06));
        b.add(box(0.24, 0.1, 0.1, plastic, 0.55, -0.05, z0 + 0.05));
        // standoff shadow strip / underglow
        b.add(box(0.02, H * 0.8, 0.01, rgbMat(1.2), W + 0.005, -H / 2, -0.01));
    }

    _cpu(g, p, L) {
        const s = this._sub(g, new V3(0, 0, 1.1));
        const c = new THREE.Group();
        c.position.copy(L.socket);
        s.add(c);
        c.add(box(0.45, 0.45, 0.025, std(0x1f5a3a, 0.2, 0.6), 0, 0, 0.055));
        const ihs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.03), [
            std(0xc6cad1, 0.95, 0.28), std(0xc6cad1, 0.95, 0.28), std(0xc6cad1, 0.95, 0.28), std(0xc6cad1, 0.95, 0.28),
            std(0xffffff, 0.9, 0.3, {
                map: canvasTex(256, 256, (c2, cw) => {
                    const gr = c2.createLinearGradient(0, 0, cw, cw);
                    gr.addColorStop(0, '#d9dde3'); gr.addColorStop(1, '#a8aeb8');
                    c2.fillStyle = gr; c2.fillRect(0, 0, cw, cw);
                    c2.fillStyle = '#4a4f58'; c2.textAlign = 'center';
                    c2.font = `700 40px ${FONT}`;
                    c2.fillText(p.brand === 'amd' ? 'RYZEN' : 'INTEL', cw / 2, 100);
                    c2.font = `500 22px ${FONT}`;
                    c2.fillText(p.name.replace(/^(AMD|Intel)\s/, '').toUpperCase(), cw / 2, 145);
                    c2.fillText(p.socket, cw / 2, 180);
                }),
            }),
            std(0xc6cad1, 0.95, 0.28),
        ]);
        ihs.position.z = 0.083;
        c.add(ihs);
    }

    _cooler(g, p, L) {
        const white = p.color === 'white';
        if (p.type === 'air') {
            const s = this._sub(g, new V3(0, 0, 2.0));
            const c = new THREE.Group(); c.position.copy(L.socket); s.add(c);
            const hgt = p.height / 100;
            const finMat = std(white ? 0xeceef2 : 0xb9bec6, 0.92, 0.28);
            const copper = std(0xc47a4a, 1, 0.28);
            const nickel = std(0xd0d4da, 1, 0.2);
            c.add(box(0.46, 0.46, 0.14, nickel, 0, 0, 0.14));
            const towers = p.dual ? [-0.36, 0.36] : [0];
            const dx = p.dual ? 0.38 : 0.5;
            const z0 = 0.34, z1 = hgt - 0.08, n = p.dual ? 36 : 32;
            for (const tx of towers) {
                const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(dx, 1.26, 0.012), finMat, n);
                const m4 = new THREE.Matrix4();
                for (let i = 0; i < n; i++) { m4.makeTranslation(tx, 0, z0 + (i / (n - 1)) * (z1 - z0)); fins.setMatrixAt(i, m4); }
                c.add(fins);
                for (let k = 0; k < 4; k++) {
                    const pipe = cylZ(0.035, z1 - 0.12, copper, 12);
                    pipe.position.set(tx + (k % 2 ? 0.08 : -0.08), -0.36 + k * 0.24, (z1 + 0.12) / 2 + 0.04);
                    c.add(pipe);
                }
                const cap = box(dx + 0.04, 1.3, 0.06, std(white ? 0xf3f4f6 : 0x1a1c20, 0.7, 0.3), tx, 0, hgt - 0.03);
                c.add(cap);
                if (p.rgb) {
                    for (const [w2, h2, x2, y2] of [[dx, 0.02, 0, 0.63], [dx, 0.02, 0, -0.63], [0.02, 1.26, dx / 2, 0], [0.02, 1.26, -dx / 2, 0]])
                        c.add(box(w2, h2, 0.012, rgbMat(2.4), tx + x2, y2, hgt + 0.002));
                }
            }
            const fanSize = p.dual ? 1.3 : 1.2;
            const fanZ = Math.max(z0 + fanSize / 2 - 0.05, (z0 + z1) / 2);
            const xs = p.dual ? [0, 0.36 + dx / 2 + 0.13] : [dx / 2 + 0.13];
            for (const fx of xs) {
                const f = makeFan(fanSize, { rgb: false, white, spin: 10 });
                f.rotation.y = Math.PI / 2;
                f.position.set(fx, 0, fanZ);
                f.scale.setScalar(Math.min(1, (z1 - z0 + 0.25) / fanSize));
                c.add(f);
            }
        } else {
            const pump = this._sub(g, new V3(0, 0, 2.0));
            const rad = this._sub(g, new V3(0, 1.4, 0));
            const c = new THREE.Group(); c.position.copy(L.socket); pump.add(c);
            const shell = std(white ? 0xf1f2f4 : 0x15171b, 0.5, 0.35);
            const body = cylZ(0.31, 0.3, shell, 48); body.position.z = 0.2; c.add(body);
            const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.022, 10, 64), rgbMat(3)); ringT.position.z = 0.35; c.add(ringT);
            const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 48), rgbMat(2.2, {
                emissiveMap: canvasTex(256, 256, (c2, cw) => {
                    c2.fillStyle = '#000'; c2.fillRect(0, 0, cw, cw);
                    for (let i = 9; i > 0; i--) {
                        c2.strokeStyle = `rgba(255,255,255,${0.12 + (1 - i / 9) * 0.6})`;
                        c2.lineWidth = 5;
                        c2.beginPath(); c2.arc(cw / 2, cw / 2, i * 13, 0, TAU); c2.stroke();
                    }
                    c2.fillStyle = '#000'; c2.font = `700 34px ${FONT}`; c2.textAlign = 'center'; c2.textBaseline = 'middle';
                    c2.fillText('HYDRA', cw / 2, cw / 2);
                }), color: 0x050505, roughness: 0.08, metalness: 0.4,
            }));
            face.position.z = 0.352; c.add(face);

            const Lr = p.rad === 360 ? 3.92 : 2.72;
            const ry = L.h - 0.12 - 0.135;
            const rx = L.front - 0.36 - Lr / 2;
            const rz = L.radZ;
            const rMat = std(white ? 0xe9ecf0 : 0x121418, 0.6, 0.45);
            rad.add(box(Lr - 0.3, 0.25, 1.2, rMat, rx, ry, rz));
            rad.add(box(0.16, 0.29, 1.24, rMat, rx - Lr / 2 + 0.08, ry, rz));
            rad.add(box(0.16, 0.29, 1.24, rMat, rx + Lr / 2 - 0.08, ry, rz));
            const n = p.rad / 120;
            for (let i = 0; i < n; i++) {
                const f = makeFan(1.2, { rgb: true, white, spin: 9 });
                f.rotation.x = Math.PI / 2;
                f.position.set(rx - Lr / 2 + 0.16 + 0.6 + i * 1.2, ry - 0.125 - 0.13, rz);
                rad.add(f);
            }
            // tubes (hidden while exploded)
            const tubeMat = std(white ? 0xf0f1f3 : 0x16171a, 0.05, 0.75);
            const tubes = new THREE.Group(); tubes.userData.hideOnExplode = true; g.add(tubes);
            const tankX = rx - Lr / 2 + 0.08;
            for (let k = 0; k < 2; k++) {
                const start = L.socket.clone().add(new V3(-0.1 + k * 0.2, 0.3, 0.12 + k * 0.12));
                const end = new V3(tankX, ry - 0.15, rz - 0.38 + k * 0.2);
                const curve = new THREE.CatmullRomCurve3([
                    start,
                    start.clone().add(new V3(0, 0.22, 0.1)),
                    new V3((start.x + end.x) / 2 + 0.1, end.y - 0.45, (start.z + end.z) / 2 + 0.25),
                    end.clone().add(new V3(0, -0.2, 0)),
                    end,
                ]);
                tubes.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 10), tubeMat));
            }
        }
    }

    _ram(g, p, L) {
        const s = this._sub(g, new V3(0, 0, 1.5));
        const white = p.color === 'white';
        const xs = p.sticks >= 4 ? L.ramX : [L.ramX[1], L.ramX[3]];
        const spread = std(white ? 0xf0f2f5 : 0x1c1e23, white ? 0.4 : 0.8, 0.32);
        const trim = std(white ? 0xbfc6cf : 0x5b616c, 0.95, 0.25);
        for (const x of xs) {
            const st = new THREE.Group();
            st.position.set(x, L.ramY, L.bf + 0.07);
            st.add(box(0.012, 1.33, 0.32, std(0x184a2c, 0.2, 0.6), 0, 0, 0.16));
            st.add(box(0.045, 1.32, 0.34, spread, 0, 0, 0.2));
            st.add(box(0.05, 1.32, 0.02, trim, 0, 0, 0.36));
            if (p.rgb) st.add(box(0.036, 1.28, 0.08, rgbMat(2.6, { color: 0xdfe5ec, roughness: 0.2 }), 0, 0, 0.41));
            else st.add(box(0.048, 1.3, 0.03, trim, 0, 0, 0.385));
            s.add(st);
        }
    }

    _gpu(g, p, L) {
        const s = this._sub(g, new V3(0, -0.35, 2.3));
        const white = p.color === 'white';
        const Lg = p.length / 100, T = p.slots * 0.2, Hc = 1.32, fanH = 0.27;
        const c = new THREE.Group();
        c.position.set(L.gpuX0, L.pcieY, L.bf + 0.05);
        s.add(c);
        const bodyCol = white ? 0xeef0f3 : 0x16181c;
        const shell = std(bodyCol, white ? 0.3 : 0.75, 0.32);
        const metal = std(white ? 0xd8dce2 : 0x2a2d33, 0.95, 0.28);
        const bodyH = T - fanH;

        // main body, +Z face carries the brand plate
        const sideTex = canvasTex(1024, 256, (c2, cw, ch) => {
            const gr = c2.createLinearGradient(0, 0, cw, 0);
            gr.addColorStop(0, white ? '#e8ebef' : '#121418'); gr.addColorStop(1, white ? '#f6f7f9' : '#1d2026');
            c2.fillStyle = gr; c2.fillRect(0, 0, cw, ch);
            c2.strokeStyle = white ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'; c2.lineWidth = 3;
            for (let i = 0; i < 9; i++) { c2.beginPath(); c2.moveTo(cw * 0.62 + i * 34, 0); c2.lineTo(cw * 0.62 + i * 34 - 60, ch); c2.stroke(); }
            c2.fillStyle = white ? '#3b414b' : '#e9edf2';
            c2.font = `700 ${Math.round(ch * 0.36)}px ${FONT}`; c2.textBaseline = 'middle';
            c2.fillText(p.badge, cw * 0.05, ch * 0.5);
            c2.font = `500 ${Math.round(ch * 0.15)}px ${FONT}`;
            c2.fillStyle = white ? '#7a8391' : '#8c95a3';
            c2.fillText(p.brand === 'amd' ? 'RADEON' : p.brand === 'intel' ? 'INTEL ARC' : 'GEFORCE', cw * 0.05, ch * 0.18);
        });
        const sideMat = std(0xffffff, white ? 0.3 : 0.6, 0.35, { map: sideTex });
        const body = new THREE.Mesh(new THREE.BoxGeometry(Lg, bodyH, Hc), [shell, shell, shell, shell, sideMat, shell]);
        body.position.set(Lg / 2, -bodyH / 2, Hc / 2);
        c.add(body);
        // backplate + pcb sliver
        c.add(box(Lg - 0.04, 0.012, Hc - 0.04, std(0x0e2a1c, 0.2, 0.6), Lg / 2, 0.006, Hc / 2));
        const bpTex = canvasTex(1024, 384, (c2, cw, ch) => {
            c2.fillStyle = white ? '#e3e6ea' : '#191b20'; c2.fillRect(0, 0, cw, ch);
            c2.fillStyle = white ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
            for (let i = 0; i < 40; i++) c2.fillRect(cw * 0.7 + (i % 8) * 30, 40 + Math.floor(i / 8) * 60, 18, 40);
            c2.fillStyle = white ? '#8790a0' : '#5d6574';
            c2.font = `700 80px ${FONT}`; c2.textBaseline = 'middle';
            c2.fillText(p.badge, 60, ch / 2);
        });
        const bpm = std(0xffffff, 0.85, 0.3, { map: bpTex });
        const bp = new THREE.Mesh(new THREE.BoxGeometry(Lg - 0.02, 0.035, Hc - 0.02), [metal, metal, bpm, metal, metal, metal]);
        bp.position.set(Lg / 2, 0.03, Hc / 2);
        c.add(bp);

        // fan layer: perforated bottom plate (shape with holes) + fans
        const nf = p.fans;
        const fs = Math.min(0.98, (Lg - 0.26) / nf - 0.04);
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(Lg, 0); shape.lineTo(Lg, Hc); shape.lineTo(0, Hc); shape.lineTo(0, 0);
        const fxs = [];
        for (let i = 0; i < nf; i++) {
            const fx = 0.13 + (Lg - 0.26) * ((i + 0.5) / nf);
            fxs.push(fx);
            const hole = new THREE.Path(); hole.absarc(fx, Hc / 2, fs * 0.49, 0, TAU, true);
            shape.holes.push(hole);
        }
        const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 40 });
        plateGeo.rotateX(Math.PI / 2);           // XY shape → XZ plane, extrudes down
        const plate = new THREE.Mesh(plateGeo, shell);
        plate.position.y = -bodyH - fanH + 0.05;
        c.add(plate);
        c.add(box(Lg, fanH - 0.05, 0.03, shell, Lg / 2, -bodyH - (fanH - 0.05) / 2, Hc - 0.015));
        c.add(box(Lg, fanH - 0.05, 0.03, shell, Lg / 2, -bodyH - (fanH - 0.05) / 2, 0.015));
        for (const fx of fxs) {
            const f = makeFan(fs, { rgb: true, white, frameless: true, blades: 11, spin: 7 });
            f.rotation.x = Math.PI / 2;
            f.position.set(fx, -bodyH - fanH / 2 + 0.03, Hc / 2);
            c.add(f);
        }
        // ARGB seam along the visible edge + end cap light
        c.add(box(Lg - 0.1, 0.028, 0.016, rgbMat(3), Lg / 2, -bodyH + 0.01, Hc + 0.008));
        c.add(box(0.016, bodyH * 0.6, 0.016, rgbMat(3), Lg - 0.008 + 0.01, -bodyH / 2, Hc - 0.15));
        // bracket + power plug
        c.add(box(0.025, T + 0.12, 1.18, std(0xb8bdc5, 0.95, 0.3), -0.03, -T / 2 + 0.03, 0.62));
        c.add(box(0.2, 0.1, 0.08, std(0x0d0e10, 0.2, 0.6), Lg * 0.58, -bodyH / 2, Hc + 0.04));
        c.userData.plug = new V3(L.gpuX0 + Lg * 0.58, L.pcieY - bodyH / 2, L.bf + 0.05 + Hc + 0.08);
        this.gpuPlug = c.userData.plug;
    }

    _storage(g, p, L) {
        const s = this._sub(g, new V3(0, 0.25, 1.2));
        const c = new THREE.Group(); c.position.copy(L.m2); s.add(c);
        c.add(box(0.8, 0.22, 0.02, std(0x0f1a14, 0.2, 0.6), 0, 0, 0.03));
        const label = (dark) => canvasTex(512, 140, (c2, cw, ch) => {
            c2.fillStyle = dark ? '#16181d' : '#e9ecf0'; c2.fillRect(0, 0, cw, ch);
            c2.fillStyle = dark ? '#29e0ff' : '#111'; c2.fillRect(0, 0, 14, ch);
            c2.fillStyle = dark ? '#e9edf2' : '#111';
            c2.font = `700 56px ${FONT}`; c2.textBaseline = 'middle';
            c2.fillText(p.name.split(' ')[0].toUpperCase(), 36, ch * 0.38);
            c2.font = `500 34px ${FONT}`;
            c2.fillText(`${p.capacity} · GEN${p.gen}`, 36, ch * 0.75);
        });
        if (p.gen === 5) {
            const hs = std(0x2a2d33, 0.9, 0.3);
            c.add(box(0.82, 0.24, 0.05, hs, 0, 0, 0.065));
            const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.24, 0.12), hs, 18);
            const m4 = new THREE.Matrix4();
            for (let i = 0; i < 18; i++) { m4.makeTranslation(-0.38 + i * 0.0445, 0, 0.15); fins.setMatrixAt(i, m4); }
            c.add(fins);
            const top = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1), std(0xffffff, 0.3, 0.5, { map: label(true) }));
            top.position.set(-0.2, 0, 0.0905); c.add(top);
        } else {
            const top = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.19), std(0xffffff, 0.2, 0.5, { map: label(false) }));
            top.position.set(0.02, 0, 0.0405); c.add(top);
            for (let i = 0; i < 3; i++) c.add(box(0.12, 0.12, 0.012, std(0x111215, 0.4, 0.4), -0.25 + i * 0.17, 0, 0.046));
        }
    }

    _psu(g, p, L) {
        const s = this._sub(g, new V3(0, -0.05, 2.9));
        const c = new THREE.Group(); c.position.copy(L.psu); s.add(c);
        const wp = p.color === 'white';
        const shell = std(wp ? 0xe9ecf0 : 0x15171b, wp ? 0.3 : 0.8, 0.4);
        const side = std(0xffffff, 0.6, 0.4, {
            map: canvasTex(512, 300, (c2, cw, ch) => {
                c2.fillStyle = wp ? '#e9ecf0' : '#15171b'; c2.fillRect(0, 0, cw, ch);
                c2.strokeStyle = wp ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'; c2.lineWidth = 2; c2.strokeRect(14, 14, cw - 28, ch - 28);
                c2.fillStyle = wp ? '#1d2128' : '#e9edf2'; c2.font = `700 64px ${FONT}`; c2.textBaseline = 'middle';
                c2.fillText('VOLT', 40, 80);
                c2.font = `700 120px ${FONT}`; c2.fillText(`${p.watts}`, 40, 185);
                const ww = c2.measureText(`${p.watts}`).width;
                c2.font = `600 40px ${FONT}`; c2.fillStyle = '#8c95a3'; c2.fillText('WATT', 40 + ww + 16, 205);
                const badge = { Bronze: '#c98a4b', Gold: '#e6c35a', Platinum: '#c9d3df', Titanium: '#8fb4c9' }[p.rating] || '#ccc';
                c2.fillStyle = badge; c2.fillRect(cw - 170, 40, 130, 54);
                c2.fillStyle = '#111'; c2.font = `700 26px ${FONT}`; c2.textAlign = 'center';
                c2.fillText(`80+ ${p.rating.toUpperCase()}`, cw - 105, 68);
            }),
        });
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 1.5), [shell, shell, shell, shell, side, shell]);
        c.add(m);
        // modular ports on the front-facing side
        const port = std(0x050506, 0.1, 0.8);
        for (let i = 0; i < 6; i++) c.add(box(0.012, 0.12, 0.2, port, 0.755, 0.2 - Math.floor(i / 3) * 0.25, -0.45 + (i % 3) * 0.3));
    }

    _fans(g, p, L, build) {
        const fl = fanLayout(build.case, p, build.cooler);
        const white = p.color === 'white';
        const front = this._sub(g, new V3(1.4, 0, 0));
        const top = this._sub(g, new V3(0, 1.4, 0));
        const rear = this._sub(g, new V3(-1.4, 0, 0));
        for (let i = 0; i < fl.front; i++) {
            const f = makeFan(1.2, { rgb: p.rgb, white });
            f.rotation.y = Math.PI / 2;
            f.position.set(L.front - 0.2, L.h - 0.95 - i * 1.25, 0.02);
            front.add(f);
        }
        for (let i = 0; i < fl.top; i++) {
            const f = makeFan(1.2, { rgb: p.rgb, white });
            f.rotation.x = Math.PI / 2;
            f.position.set(L.front - 0.98 - i * 1.25, L.h - 0.2, L.radZ);
            top.add(f);
        }
        if (fl.rear) {
            const f = makeFan(1.2, { rgb: p.rgb, white });
            f.rotation.y = Math.PI / 2;
            f.position.set(L.rear + 0.2, L.bo.y - 0.78, L.bf + 0.85);
            rear.add(f);
        }
    }

    _buildGhosts(build) {
        this._disposeTree(this.ghostRoot);
        this.ghostRoot.clear();
        const L = this.L;
        const add = (size, center) => {
            const geo = new THREE.BoxGeometry(...size);
            const grp = new THREE.Group();
            grp.position.copy(center);
            grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x29e0ff, transparent: true, opacity: 0.7 })));
            grp.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x29e0ff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending })));
            this.ghostRoot.add(grp);
        };
        if (!build.motherboard) add([L.boardW, L.boardH, 0.04], new V3(L.bo.x + L.boardW / 2, L.bo.y - L.boardH / 2, L.bo.z + 0.02));
        if (!build.cpu) add([0.45, 0.45, 0.06], L.socket.clone().add(new V3(0, 0, 0.08)));
        if (!build.cooler) add([0.7, 1.26, 1.35], L.socket.clone().add(new V3(0, 0, 0.85)));
        if (!build.ram) add([0.45, 1.33, 0.42], new V3((L.ramX[0] + L.ramX[3]) / 2, L.ramY, L.bf + 0.28));
        if (!build.gpu) add([3.0, 0.6, 1.32], new V3(L.gpuX0 + 1.5, L.pcieY - 0.27, L.bf + 0.71));
        if (!build.storage) add([0.8, 0.22, 0.05], L.m2.clone().add(new V3(0, 0, 0.05)));
        if (!build.psu) add([1.5, 0.86, 1.5], L.psu);
        if (!build.fans) add([0.25, 3.6, 1.2], new V3(L.front - 0.2, L.h - 0.95 - 1.25, 0));
    }

    _buildCables(build) {
        this._disposeTree(this.cableRoot);
        this.cableRoot.clear();
        if (!build.psu) return;
        const L = this.L;
        const white = build.case?.color === 'white' || build.motherboard?.color === 'white' || build.psu?.color === 'white';
        const mat = std(white ? 0xf2f3f5 : 0x141518, 0.05, 0.7);
        const strand = (pts, r = 0.021) => this.cableRoot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, r, 6), mat));
        if (build.motherboard) {
            const gx = L.bo.x + L.boardW + 0.28, ex = L.bo.x + L.boardW;
            for (let i = 0; i < 12; i++) {
                const y = L.bo.y - 1.2 - 0.25 + i * 0.045;
                strand([new V3(gx, y, L.trayZ + 0.03), new V3(gx, y, L.bf + 0.3), new V3(ex + 0.14, y, L.bf + 0.24), new V3(ex + 0.005, y, L.bf + 0.1)]);
            }
        }
        if (build.gpu && this.gpuPlug) {
            const pl = this.gpuPlug;
            for (let i = 0; i < 8; i++) {
                const x = pl.x - 0.16 + i * 0.045;
                strand([new V3(x, L.shroudH + 0.02, pl.z - 0.35), new V3(x, L.shroudH + 0.35, pl.z + 0.12), new V3(x, pl.y - 0.25, pl.z + 0.22), new V3(x, pl.y, pl.z)], 0.02);
            }
        }
        this.cableRoot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }

    _collect() {
        this.rgbList = []; this.rotors = []; this.explodables = []; this.powerMats = []; this.fadeMats = [];
        const wp = new V3();
        this.rig.updateMatrixWorld(true);
        for (const root of [this.slotRoot, this.cableRoot]) {
            root.traverse(o => {
                if (o.userData.spin) this.rotors.push(o);
                if (o.userData.explode) {
                    if (!o.userData.home) o.userData.home = o.position.clone();
                    this.explodables.push(o);
                }
                if (o.userData.hideOnExplode) this.explodables.push(o);
                if (o.isMesh) {
                    const m = o.material;
                    if (m?.userData?.rgb) {
                        o.getWorldPosition(wp);
                        this.rgbList.push({ m, y: wp.y, phase: wp.y * 0.07 + wp.x * 0.05 + wp.z * 0.02, intensity: m.userData.rgb.intensity });
                    }
                    if (o.userData.powerLed) this.powerMats.push(m);
                    if (o.userData.fadeOnExplode) { m.userData.baseOpacity ??= m.opacity; this.fadeMats.push(m); }
                }
            });
        }
    }

    _flyIn(cat) {
        const g = this.slots[cat];
        const box3 = new THREE.Box3().setFromObject(g);
        const center = box3.getCenter(new V3());
        const radius = box3.getSize(new V3()).length() / 2;
        const from = cat === 'case' ? new V3(0, -1.2, 0) : cat === 'fans' ? new V3(0, 2.5, 2) : new V3(0, 1.1, 4.2);
        g.position.copy(from);
        this.tweens = this.tweens.filter(t => t.obj !== g);
        this.tweens.push({ obj: g, from, t: 0, dur: cat === 'case' ? 1.0 : 0.85, fn: cat === 'case' ? ease.outCubic : ease.outBack, onDone: () => this._burst(center, radius) });
    }

    _burst(center, radius) {
        const world = center.clone().add(this.rig.position);
        // expanding ring
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: 0x29e0ff, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        ring.position.copy(world);
        ring.lookAt(this.camera.position);
        this.fxRoot.add(ring);
        const r0 = Math.max(0.4, radius * 0.6);
        this.effects.push({ t: 0, dur: 0.7, update: (k) => { ring.scale.setScalar(r0 + k * r0 * 1.2); ring.material.opacity = (1 - k) * (1 - k) * 0.9; ring.material.color.setRGB(0.35, 1.1, 1.5); }, obj: ring });
        // particles
        const N = 60;
        const pos = new Float32Array(N * 3), vel = [];
        for (let i = 0; i < N; i++) {
            pos[i * 3] = world.x; pos[i * 3 + 1] = world.y; pos[i * 3 + 2] = world.z;
            vel.push(new V3().randomDirection().multiplyScalar(1.5 + Math.random() * 3.5));
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: radialTex(), color: new THREE.Color(0.4, 1.2, 1.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        this.fxRoot.add(pts);
        this.effects.push({
            t: 0, dur: 0.9, obj: pts, update: (k, dt) => {
                const a = geo.attributes.position.array;
                for (let i = 0; i < N; i++) {
                    vel[i].multiplyScalar(1 - dt * 3.2); vel[i].y -= dt * 1.5;
                    a[i * 3] += vel[i].x * dt; a[i * 3 + 1] += vel[i].y * dt; a[i * 3 + 2] += vel[i].z * dt;
                }
                geo.attributes.position.needsUpdate = true;
                pts.material.opacity = 1 - k;
            },
        });
        this.bloomKick = 1;
    }

    /* ---------------- frame loop */

    _rgbAt(entry, t, out) {
        const mode = this.rgb.mode;
        let k = 1;
        if (mode === 'rainbow') out.setHSL(((t * 0.11 + entry.phase) % 1 + 1) % 1, 1, 0.55);
        else out.copy(this.rgb.color);
        if (mode === 'breathe') k = 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(t * 1.9));
        else if (mode === 'pulse') { const s = 0.5 + 0.5 * Math.sin(entry.y * 1.7 - t * 3.2); k = 0.1 + 0.9 * s * s * s; }
        else if (mode === 'off') k = 0;
        return k;
    }

    _loop() {
        requestAnimationFrame(this._loop);
        const dt = Math.min(this.clock.getDelta(), 0.05);
        const t = (this.time += dt);

        // power
        this.powerLevel += ((this.powered ? 1 : 0) - this.powerLevel) * Math.min(1, dt * (this.powered ? 0.9 : 1.6));
        if (this.powered) this.bootT = Math.min(this.bootT + dt * 2.4, 6);
        else this.bootT = Math.max(this.bootT - dt * 4, -1);

        for (const r of this.rotors) r.rotation.z += dt * r.userData.spin * this.powerLevel * (this.reducedMotion ? 0.3 : 1);

        // RGB
        const col = this.tmpColor;
        for (const e of this.rgbList) {
            const k = this._rgbAt(e, t, col);
            const lit = clamp01((this.bootT - e.y * 0.22) * 2.5);
            e.m.emissive.copy(col);
            e.m.emissiveIntensity = e.intensity * k * lit;
        }
        const centerEntry = { y: (this.L?.h || 4.8) * 0.5, phase: 0.2 };
        const kc = this._rgbAt(centerEntry, t, col);
        const litAll = clamp01(this.bootT * 0.6);
        this.inner.color.copy(col);
        this.inner.intensity = 9 * kc * litAll;
        this.inner.position.y = this.rig.position.y + (this.L?.h || 4.8) * 0.55;
        this.pad.material.color.copy(col);
        this.pad.material.opacity = 0.08 + 0.4 * kc * litAll;
        this.ring.material.color.copy(col).multiplyScalar(0.4 + 2.6 * kc * litAll);
        this.ring2.rotation.z = t * 0.15;
        for (const m of this.powerMats) m.emissiveIntensity = 3 * litAll;

        // explode
        this.explodeK += (this.explodeTarget - this.explodeK) * Math.min(1, dt * 4.5);
        const ek = ease.inOutCubic(clamp01(this.explodeK));
        for (const o of this.explodables) {
            if (o.userData.explode) o.position.copy(o.userData.home).addScaledVector(o.userData.explode, ek);
            if (o.userData.hideOnExplode) o.visible = this.explodeK < 0.08;
        }
        for (const m of this.fadeMats || []) m.opacity = m.userData.baseOpacity * (1 - ek * 0.85);
        this.cableRoot.visible = this.explodeK < 0.08 && this.tweens.length === 0;

        // install tweens
        for (let i = this.tweens.length - 1; i >= 0; i--) {
            const tw = this.tweens[i];
            tw.t += dt / tw.dur;
            const k = tw.fn(clamp01(tw.t));
            tw.obj.position.copy(tw.from).multiplyScalar(1 - k);
            if (tw.t >= 1) { tw.obj.position.set(0, 0, 0); this.tweens.splice(i, 1); tw.onDone?.(); }
        }

        // effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.t += dt / e.dur;
            e.update(clamp01(e.t), dt);
            if (e.t >= 1) { this.fxRoot.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); this.effects.splice(i, 1); }
        }
        this.bloomKick = Math.max(0, (this.bloomKick || 0) - dt * 2.5);
        this.bloom.strength = 0.8 + this.bloomKick * 0.2 +(this.powered ? 0.12 * clamp01(2 - this.bootT) : 0);

        // ghosts pulse
        const gp = 0.45 + 0.35 * Math.sin(t * 3);
        this.ghostRoot.children.forEach(grp => { grp.children[0].material.opacity = gp; grp.children[1].material.opacity = 0.04 + gp * 0.05; });

        // dust
        if (!this.reducedMotion) {
            const a = this.dust.geometry.attributes.position.array;
            for (let i = 0; i < this.dustVel.length; i++) {
                a[i * 3 + 1] += this.dustVel[i] * dt;
                a[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.05;
                if (a[i * 3 + 1] > 10) a[i * 3 + 1] = 0;
            }
            this.dust.geometry.attributes.position.needsUpdate = true;
        }

        // camera
        if (this.camTween) {
            const ct = this.camTween;
            ct.t += dt / ct.dur;
            const k = ease.inOutCubic(clamp01(ct.t));
            this.camera.position.lerpVectors(ct.fromPos, ct.toPos, k);
            this.controls.target.lerpVectors(ct.fromTgt, ct.toTgt, k);
            if (ct.t >= 1) this.camTween = null;
        }
        this.controls.autoRotate = this.autoRotate && !this.camTween && performance.now() - this.lastInteract > 5000;
        this.controls.update();

        // hover picking (throttled to frames with pointer movement)
        if (this.pointerDirty && !this.camTween) {
            this.pointerDirty = false;
            this._setHover(this._pick());
        }

        this.composer.render();
    }
}
