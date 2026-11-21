import { CATEGORIES, ICONS, PARTS, PRESETS, resolveBuild, findPart, specChips } from './parts.js';
import { analyze, conflictsFor, statusByCat } from './compat.js';
import { Sfx } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const money = n => Math.round(n).toLocaleString('en-US');
const svg = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORE_KEY = 'rigforge:v1';
const ORDER = CATEGORIES.map(c => c.id);

const SWATCHES = ['#29e0ff', '#ff3df0', '#7c5cff', '#39ff88', '#ffb020', '#ff2b4a', '#ffffff'];
const MODES = [['static', 'Static'], ['breathe', 'Breathe'], ['rainbow', 'Rainbow'], ['pulse', 'Pulse'], ['off', 'Off']];
const METRIC = {
    cpu: { label: 'Gaming', v: p => p.gaming / 100 },
    gpu: { label: '1440p', v: p => p.fps / 210 },
    ram: { label: 'Capacity', v: p => Math.log2(p.capacity) / 7 },
    storage: { label: 'Speed', v: p => p.read / 14000 },
    psu: { label: 'Output', v: p => p.watts / 1600 },
    cooler: { label: 'Cooling', v: p => p.rating / 340 },
    case: { label: 'GPU room', v: p => p.gpuClear / 480 },
    motherboard: { label: 'Tier', v: p => (p.chipset.match(/^[XZ]/) ? 0.9 : 0.6) },
    fans: { label: 'Airflow', v: p => (p.front + p.top + p.rear) / 6 },
};

const sfx = new Sfx();
const state = {
    ids: {}, active: 'cpu', sort: 'price',
    rgb: '#29e0ff', mode: 'rainbow',
    power: false, explode: false, orbit: true, sound: true,
    name: 'My Rig',
};
let scene = null;
let assembling = 0;

/* ------------------------------------------------------------ persistence */

// Builds travel in the URL hash as a compact code: "rf-" + one base-36 catalog index per category
// ("x" = empty) + "-" + rgb hex + "-" + mode index. Keep new parts appended to the end of each
// PARTS list so existing links stay valid.
const FRAMED = (() => { try { return window.self !== window.top; } catch { return true; } })();

function encodeBuild() {
    const parts = ORDER.map(c => {
        const i = PARTS[c].findIndex(p => p.id === state.ids[c]);
        return i < 0 ? 'x' : i.toString(36);
    }).join('');
    return `rf-${parts}-${state.rgb.slice(1).toLowerCase()}-${Math.max(0, MODES.findIndex(m => m[0] === state.mode))}`;
}

function decodeBuild(code) {
    const m = /^rf-([0-9a-zx]{9})-([0-9a-f]{6})-(\d)$/i.exec(code);
    if (!m) return false;
    state.ids = {};
    [...m[1]].forEach((ch, k) => {
        if (ch === 'x') return;
        const p = PARTS[ORDER[k]][parseInt(ch, 36)];
        if (p) state.ids[ORDER[k]] = p.id;
    });
    state.rgb = '#' + m[2].toLowerCase();
    state.mode = (MODES[Number(m[3])] || MODES[2])[0];
    return true;
}

function loadInitial() {
    const raw = location.hash.slice(1);
    const hash = new URLSearchParams(raw);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { /* storage blocked */ }
    if (decodeBuild(raw)) {
        if (saved?.name) state.name = saved.name;
        if (saved) state.sound = saved.sound !== false;
    } else if (hash.has('case')) {          // older key=value links
        for (const c of ORDER) if (hash.get(c)) state.ids[c] = hash.get(c);
        if (/^[0-9a-f]{6}$/i.test(hash.get('rgb') || '')) state.rgb = '#' + hash.get('rgb');
        if (MODES.some(m => m[0] === hash.get('fx'))) state.mode = hash.get('fx');
        if (hash.get('n')) state.name = hash.get('n').slice(0, 32);
    } else if (saved && saved.ids) {
        Object.assign(state, { ids: saved.ids, rgb: saved.rgb || state.rgb, mode: saved.mode || state.mode, name: saved.name || state.name, sound: saved.sound !== false });
    } else {
        state.ids = { ...PRESETS.find(p => p.id === 'sweet').build };
    }
    // drop unknown ids, guarantee a case
    state.ids = Object.fromEntries(Object.entries(state.ids).filter(([c, id]) => findPart(c, id)));
    if (!state.ids.case) state.ids.case = 'aero-m';
}

function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ids: state.ids, rgb: state.rgb, mode: state.mode, name: state.name, sound: state.sound })); } catch { /* ignore */ }
    const code = encodeBuild();
    if (location.hash.slice(1) === code) return;
    try { history.replaceState(null, '', '#' + code); } catch { /* sandboxed frame; the build is still saved locally */ }
}

function shareLink() {
    return FRAMED ? '' : `${location.origin}${location.pathname}#${encodeBuild()}`;
}

/* ------------------------------------------------------------ helpers */

const build = () => resolveBuild(state.ids);
const catInfo = id => CATEGORIES.find(c => c.id === id);

function toast(html, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="ti"></span><span>${html}</span>`;
    const host = $('#toasts');
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, 2600);
}

function tweenNumber(el, to, fmt = v => money(v), dur = 700) {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    const t0 = performance.now();
    const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
}

/* ------------------------------------------------------------ rendering */

function renderRail(res) {
    const status = statusByCat(res);
    const b = build();
    $('#rail').innerHTML = CATEGORIES.map((c, i) => {
        const st = !b[c.id] ? 'empty' : status[c.id] === 'error' ? 'error' : status[c.id] === 'warn' ? 'warn' : 'ok';
        return `<button data-cat="${c.id}" class="${state.active === c.id ? 'active' : ''}" title="${c.label} (${i + 1})" aria-label="${c.label}">
            <span class="dot ${st}"></span>${svg(ICONS[c.id])}<span>${c.short}</span></button>`;
    }).join('');
}

function renderDrawer() {
    const cat = state.active;
    const info = catInfo(cat);
    const idx = ORDER.indexOf(cat);
    $('#drawerEyebrow').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(ORDER.length).padStart(2, '0')}`;
    $('#drawerTitle').textContent = info.label;
    $('#removeBtn').hidden = !(state.ids[cat] && cat !== 'case');
    document.querySelectorAll('.sorter button').forEach(b => b.classList.toggle('on', b.dataset.sort === state.sort));

    const b = build();
    const metric = METRIC[cat];
    const list = [...PARTS[cat]].sort((x, y) => state.sort === 'price' ? x.price - y.price : metric.v(y) - metric.v(x));
    $('#partList').innerHTML = list.map((p, i) => {
        const selected = state.ids[cat] === p.id;
        const conflicts = conflictsFor(b, cat, p);
        const v = Math.max(0.04, Math.min(1, metric.v(p)));
        return `<button class="part ${selected ? 'selected' : ''} ${conflicts.length ? 'conflict' : ''}" data-id="${p.id}" style="--i:${i}">
            <div class="part-top"><div class="part-name">${esc(p.name)}</div><div class="part-price">${p.price ? '$' + money(p.price) : 'Included'}</div></div>
            ${p.blurb ? `<div class="part-blurb">${esc(p.blurb)}</div>` : ''}
            <div class="chips">${specChips(cat, p).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
            <div class="meter"><span>${metric.label}</span><div class="bar"><i style="width:${(v * 100).toFixed(0)}%"></i></div><b>${Math.round(v * 100)}</b></div>
            ${selected ? '<div class="tag installed">Installed</div>' : ''}
            ${conflicts.map(m => `<div class="tag bad">${esc(m)}</div>`).join('')}
        </button>`;
    }).join('');
}

function renderSummary(res) {
    tweenNumber($('#total'), res.price);
    const sl = $('#statusLine');
    const warns = res.issues.filter(i => i.level === 'warn').length;
    sl.className = 'status-line ' + (res.errors ? 'error' : warns ? 'warn' : res.complete ? 'ok' : '');
    sl.textContent = res.errors ? `${res.errors} compatibility error${res.errors > 1 ? 's' : ''}`
        : !res.complete ? `${res.missing.length} part${res.missing.length > 1 ? 's' : ''} to go`
        : warns ? 'Ready — with warnings' : 'Ready to build';

    // power gauge
    const b = build();
    tweenNumber($('#watts'), res.watts, v => Math.round(v));
    const ratio = b.psu ? res.watts / b.psu.watts : 0;
    const fill = $('#gaugeFill');
    fill.style.strokeDasharray = `${Math.min(100, ratio * 100).toFixed(1)} 100`;
    fill.style.stroke = ratio > 1 ? 'var(--err)' : ratio > 0.77 ? 'var(--warn)' : 'var(--ok)';
    fill.style.color = fill.style.stroke;
    $('#psuLine').textContent = b.psu ? `of ${b.psu.watts}W · ${Math.round(ratio * 100)}%` : 'No PSU yet';

    // performance
    const perf = res.perf;
    const fpsEl = $('#fps');
    if (!perf) {
        fpsEl.innerHTML = `<div class="empty-note">Add a CPU and GPU to see estimates.</div>`;
        $('#bneck').textContent = '';
    } else {
        if (!fpsEl.querySelector('.fps-row')) {
            fpsEl.innerHTML = Object.keys(perf.fps).map(k => `<div class="fps-row" data-k="${k}"><span>${k}</span><div class="bar"><i style="transform:scaleX(0)"></i></div><b>0</b></div>`).join('');
        }
        for (const [k, v] of Object.entries(perf.fps)) {
            const row = fpsEl.querySelector(`[data-k="${k}"]`);
            const c = v >= 144 ? 'var(--accent)' : v >= 60 ? 'var(--ok)' : v >= 40 ? 'var(--warn)' : 'var(--err)';
            const bar = row.querySelector('i');
            bar.style.setProperty('--c', c);
            requestAnimationFrame(() => { bar.style.transform = `scaleX(${Math.min(1, v / 240)})`; });
            tweenNumber(row.querySelector('b'), v, x => Math.round(x));
        }
        $('#bneck').innerHTML = `${esc(perf.bottleneck)} · Creator score <b>${perf.work}</b>`;
    }

    // issues
    const items = [];
    for (const i of res.issues) items.push(`<li class="${i.level}">${esc(i.msg)}</li>`);
    if (res.missing.length) items.push(`<li class="missing">Still needed: ${res.missing.map(m => catInfo(m).label).join(', ')}</li>`);
    if (!items.length) items.push('<li class="ok">Everything fits and powers up.</li>');
    $('#issues').innerHTML = items.join('');

    // parts list
    $('#bom').innerHTML = CATEGORIES.map(c => {
        const p = b[c.id];
        return `<li data-cat="${c.id}"><span class="bom-cat">${c.short}</span><span class="bom-name ${p ? '' : 'none'}">${p ? esc(p.name) : 'empty'}</span><span class="bom-price">${p ? '$' + money(p.price) : ''}</span></li>`;
    }).join('');
}

function renderLighting() {
    $('#swatches').innerHTML = SWATCHES.map(c => `<button class="swatch ${state.rgb.toLowerCase() === c ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')
        + `<label class="swatch custom ${SWATCHES.includes(state.rgb.toLowerCase()) ? '' : 'on'}" title="Custom color"><input type="color" id="customColor" value="${state.rgb}"></label>`;
    $('#modes').innerHTML = MODES.map(([id, label]) => `<button data-mode="${id}" class="${state.mode === id ? 'on' : ''}">${label}</button>`).join('');
    document.documentElement.style.setProperty('--rgb', state.rgb);
}

function renderTools() {
    const set = (act, v) => document.querySelector(`.tool[data-act="${act}"]`).setAttribute('aria-pressed', String(v));
    set('power', state.power); set('explode', state.explode); set('orbit', state.orbit); set('sound', state.sound);
}

function renderAll() {
    const res = analyze(build());
    renderRail(res);
    renderDrawer();
    renderSummary(res);
    renderTools();
    return res;
}

/* ------------------------------------------------------------ actions */

function selectCategory(cat, { focus = true } = {}) {
    if (!catInfo(cat)) return;
    state.active = cat;
    renderAll();
    $('#partList').scrollTop = 0;
    if (focus) scene?.focus(cat);
}

function install(cat, id) {
    assembling++;   // cancel any running assembly
    if (state.ids[cat] === id) { scene?.focus(cat); return; }
    const before = build();
    const part = findPart(cat, id);
    const conflicts = conflictsFor(before, cat, part);
    state.ids[cat] = id;
    scene?.setBuild(build());
    scene?.focus(cat);
    if (conflicts.length) { sfx.error(); toast(`<b>${esc(part.name)}</b> — ${esc(conflicts[0])}`, 'err'); }
    else { sfx.install(); toast(`Installed <b>${esc(part.name)}</b>`); }
    renderAll(); persist();
}

function removePart(cat) {
    if (!state.ids[cat] || cat === 'case') return;
    const name = findPart(cat, state.ids[cat]).name;
    delete state.ids[cat];
    scene?.setBuild(build());
    sfx.remove();
    toast(`Removed <b>${esc(name)}</b>`);
    renderAll(); persist();
}

function setPower(on, { silent = false } = {}) {
    state.power = on;
    scene?.setPower(on);
    if (!silent) on ? sfx.powerOn() : sfx.powerOff();
    renderTools();
}

function togglePower() {
    sfx.unlock();
    if (!state.power && !state.ids.psu) { sfx.error(); toast('No power supply installed', 'err'); return; }
    setPower(!state.power);
    if (state.power) {
        const res = analyze(build());
        if (res.errors) toast('Booting with compatibility errors — good luck', 'err');
        else toast(res.complete ? 'POST complete · system online' : 'Powered on (build incomplete)', 'ok');
    }
}

function setExplode(on) {
    state.explode = on;
    scene?.setExplode(on);
    scene?.focus('overview');
    sfx.unlock(); on ? sfx.remove() : sfx.install();
    renderTools();
}

/** Assemble a build part-by-part with fly-in animations, then boot it. */
async function assemble(ids, { intro = false } = {}) {
    const token = ++assembling;
    const target = { ...ids };
    setPower(false, { silent: true });
    state.ids = { case: target.case };
    scene.setBuild(build());
    renderAll();
    await wait(intro ? 900 : 500);
    for (const cat of ORDER.slice(1)) {
        if (token !== assembling) return;
        if (!target[cat]) continue;
        state.ids[cat] = target[cat];
        scene.setBuild(build());
        sfx.click();
        renderAll();
        await wait(intro ? 260 : 200);
    }
    if (token !== assembling) return;
    persist();
    await wait(800);
    if (token !== assembling) return;
    if (state.ids.psu) setPower(true);
}

/* ------------------------------------------------------------ events */

function bindUI() {
    $('#rail').addEventListener('click', e => {
        const b = e.target.closest('button[data-cat]');
        if (b) { sfx.unlock(); sfx.click(); selectCategory(b.dataset.cat); }
    });

    const list = $('#partList');
    list.addEventListener('click', e => {
        const card = e.target.closest('.part');
        if (card) { sfx.unlock(); install(state.active, card.dataset.id); }
    });
    list.addEventListener('pointermove', e => {
        const card = e.target.closest('.part');
        if (!card) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
        card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
    });
    list.addEventListener('pointerover', e => {
        const card = e.target.closest('.part');
        if (card && !card.contains(e.relatedTarget)) sfx.hover();
    });
    list.addEventListener('pointerout', e => {
        const card = e.target.closest('.part');
        if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }
    });

    $('#removeBtn').addEventListener('click', () => removePart(state.active));
    document.querySelectorAll('.sorter button').forEach(b => b.addEventListener('click', () => { state.sort = b.dataset.sort; renderDrawer(); }));

    $('#bom').addEventListener('click', e => {
        const li = e.target.closest('li[data-cat]');
        if (li) { selectCategory(li.dataset.cat); if (matchMedia('(max-width: 900px)').matches) setSheet('parts'); }
    });

    $('#swatches').addEventListener('click', e => {
        const s = e.target.closest('.swatch[data-c]');
        if (!s) return;
        state.rgb = s.dataset.c;
        if (state.mode === 'rainbow' || state.mode === 'off') state.mode = 'static';
        applyLighting();
    });
    $('#swatches').addEventListener('input', e => {
        if (e.target.id !== 'customColor') return;
        state.rgb = e.target.value;
        if (state.mode === 'rainbow' || state.mode === 'off') state.mode = 'static';
        scene?.setRGB(state.rgb, state.mode);
        document.documentElement.style.setProperty('--rgb', state.rgb);
        $('#modes').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
    });
    $('#swatches').addEventListener('change', e => { if (e.target.id === 'customColor') applyLighting(); });
    $('#modes').addEventListener('click', e => {
        const b = e.target.closest('button[data-mode]');
        if (b) { state.mode = b.dataset.mode; applyLighting(); }
    });

    $('#presets').innerHTML = PRESETS.map(p => `<button data-preset="${p.id}">${esc(p.name)}</button>`).join('');
    $('#presets').addEventListener('click', e => {
        const b = e.target.closest('button[data-preset]');
        if (!b) return;
        sfx.unlock();
        const p = PRESETS.find(x => x.id === b.dataset.preset);
        toast(`Assembling <b>${esc(p.name)}</b>…`);
        scene.focus('overview', 1.4);
        assemble(p.build);
    });

    document.querySelector('.tools').addEventListener('click', e => {
        const b = e.target.closest('.tool');
        if (!b) return;
        sfx.unlock();
        const act = b.dataset.act;
        if (act === 'power') togglePower();
        else if (act === 'explode') setExplode(!state.explode);
        else if (act === 'orbit') { state.orbit = !state.orbit; scene.setAutoRotate(state.orbit); sfx.click(); renderTools(); }
        else if (act === 'view') { scene.focus('overview'); sfx.click(); }
        else if (act === 'sound') { state.sound = !state.sound; sfx.setEnabled(state.sound); renderTools(); persist(); }
        else if (act === 'share') share();
    });

    const nameEl = $('#buildName');
    nameEl.value = state.name;
    nameEl.addEventListener('input', () => { state.name = nameEl.value.trim() || 'My Rig'; persist(); });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') nameEl.blur(); });

    document.querySelectorAll('.mobile-tabs button').forEach(b => b.addEventListener('click', () => setSheet(b.dataset.sheet)));

    window.addEventListener('keydown', e => {
        if (e.target.matches('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'e') setExplode(!state.explode);
        else if (k === 'p') togglePower();
        else if (k === 'r') { state.orbit = !state.orbit; scene.setAutoRotate(state.orbit); renderTools(); }
        else if (k === 'v' || k === 'escape') scene.focus('overview');
        else if (k === 'm') { state.sound = !state.sound; sfx.setEnabled(state.sound); renderTools(); persist(); }
        else if (/^[1-9]$/.test(k)) selectCategory(ORDER[Number(k) - 1]);
    });

    // cursor glow + tooltip follow
    const glow = $('#cursorGlow'), tip = $('#tooltip');
    window.addEventListener('pointermove', e => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        if (tip.classList.contains('show')) tip.style.left = `${e.clientX}px`, tip.style.top = `${e.clientY}px`;
    }, { passive: true });
    window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
}

function applyLighting() {
    scene?.setRGB(state.rgb, state.mode);
    renderLighting();
    sfx.click();
    persist();
}

function setSheet(name) {
    document.body.dataset.sheet = name;
    updateInsets();
    scene?.focus(scene.lastFocus || 'overview', 0.8);
}

/** Tell the 3D view which parts of the screen the panels cover, so the rig centres in the open space. */
function updateInsets() {
    if (!scene) return;
    if (matchMedia('(max-width: 900px)').matches) {
        const open = document.body.dataset.sheet !== 'none';
        scene.setInsets({ left: 0, right: 0, top: 56, bottom: open ? window.innerHeight * 0.48 + 66 : 66 });
    } else {
        const lp = $('.parts-panel'), rp = $('.summary-panel');
        scene.setInsets({ left: lp.offsetLeft + lp.offsetWidth, right: window.innerWidth - rp.offsetLeft, top: 70, bottom: 0 });
    }
}

async function share() {
    sfx.click();
    const url = shareLink();
    if (!url) { toast('Open RigForge in its own tab to get a share link'); return; }
    try { await navigator.clipboard.writeText(url); toast('Build link copied to clipboard', 'ok'); }
    catch { toast(`Copy this link: <b>${esc(url)}</b>`); }
}

function onSceneHover(cat, pt) {
    const tip = $('#tooltip');
    if (!cat) { tip.classList.remove('show'); return; }
    const p = build()[cat];
    tip.innerHTML = `<div class="tt-cat">${catInfo(cat).label}</div><div class="tt-name">${esc(p ? p.name : '')}</div><div class="tt-act">Click to swap</div>`;
    if (pt) { tip.style.left = `${pt.x}px`; tip.style.top = `${pt.y}px`; }
    tip.classList.add('show');
    sfx.hover();
}

function onScenePick(cat) {
    sfx.unlock(); sfx.click();
    selectCategory(cat);
    if (matchMedia('(max-width: 900px)').matches) setSheet('parts');
}

/* ------------------------------------------------------------ boot */

async function boot() {
    if (!document.body.dataset.sheet) document.body.dataset.sheet = 'parts';
    document.body.classList.add('booting');
    const bar = $('.loader-bar i'), msg = $('.loader-msg');
    const steps = ['Initializing forge…', 'Loading silicon…', 'Polishing tempered glass…', 'Calibrating ARGB…', 'Routing cables…'];
    let si = 0;
    const ticker = setInterval(() => { si = Math.min(si + 1, steps.length - 1); msg.textContent = steps[si]; bar.style.width = `${20 + si * 18}%`; }, 320);
    bar.style.width = '12%';

    loadInitial();
    sfx.setEnabled(state.sound);
    bindUI();
    renderLighting();
    renderAll();

    await Promise.race([
        Promise.all([document.fonts.load('700 40px "Chakra Petch"'), document.fonts.load('500 20px "Chakra Petch"')]).then(() => document.fonts.ready),
        wait(2500),
    ]).catch(() => {});

    try {
        const { RigScene } = await import('./scene.js');
        scene = new RigScene($('#stage'), { onHover: onSceneHover, onPick: onScenePick });
        window.rig = scene;   // handy for poking at the scene from DevTools
    } catch (err) {
        clearInterval(ticker);
        console.error(err);
        msg.textContent = 'Could not start 3D (WebGL unavailable or offline).';
        bar.style.width = '100%'; bar.style.background = 'var(--err)';
        return;
    }
    scene.setRGB(state.rgb, state.mode);
    scene.setAutoRotate(state.orbit);
    scene.introCamera();
    updateInsets();
    window.addEventListener('resize', updateInsets);

    await wait(1300);
    clearInterval(ticker);
    bar.style.width = '100%';
    msg.textContent = 'Ready';
    await wait(350);
    $('#loader').classList.add('done');
    document.body.classList.remove('booting');
    if (matchMedia('(max-width: 900px)').matches) setSheet('none');
    assemble(state.ids, { intro: true });   // sets the case synchronously, so the camera has a layout to aim at
    scene.focus('overview', 3.2);
    setTimeout(() => { $('#hint').style.opacity = '0.55'; }, 9000);
}

boot();
