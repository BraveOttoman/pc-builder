// Compatibility checks, power estimate and performance estimate.
import { CATEGORIES } from './parts.js';

/** How many fans of a pack actually fit in a case (shared with the 3D scene). */
export function fanLayout(caseP, fans, cooler) {
    if (!fans) return { front: 0, top: 0, rear: 0, dropped: 0, topBlocked: false };
    const h = caseP ? caseP.dims.h : 4.8;
    const d = caseP ? caseP.dims.d : 4.5;
    const frontFit = Math.min(3, Math.floor((h - 0.5) / 1.25));
    const topFit = Math.min(3, Math.floor((d - 0.8) / 1.25));
    const topBlocked = !!(cooler && cooler.type === 'aio');
    const front = Math.min(fans.front, frontFit);
    const top = topBlocked ? 0 : Math.min(fans.top, topFit);
    const dropped = (fans.front - front) + (topBlocked ? 0 : fans.top - top);
    return { front, top, rear: fans.rear, dropped, topBlocked: topBlocked && fans.top > 0 };
}

export function estimateWatts(b) {
    let w = 0;
    if (b.cpu) w += b.cpu.power;
    if (b.gpu) w += b.gpu.power;
    if (b.motherboard) w += b.motherboard.chipset.startsWith('X') || b.motherboard.chipset.startsWith('Z') ? 60 : 45;
    if (b.ram) w += b.ram.sticks * 5;
    if (b.storage) w += b.storage.gen === 5 ? 10 : 7;
    if (b.cooler) w += b.cooler.type === 'aio' ? 15 : 4;
    const fl = fanLayout(b.case, b.fans, b.cooler);
    w += (fl.front + fl.top + fl.rear) * 3 + (b.cooler?.type === 'aio' ? (b.cooler.rad / 120) * 3 : 0);
    return Math.round(w);
}

/** Smooth bottleneck blend: result is close to min(a, b) but never a hard corner. */
function softMin(a, b, k = 4) {
    return Math.pow(Math.pow(a, -k) + Math.pow(b, -k), -1 / k);
}

export function estimatePerf(b) {
    if (!b.gpu || !b.cpu) return null;
    const ramMul = b.ram ? (b.ram.mem === 'DDR4' ? 0.94 : b.ram.speed >= 6000 ? 1 : 0.97) : 0.85;
    const cpuCap = b.cpu.gaming * 2.6 * ramMul;      // frames the CPU can feed
    const res = { '1080p': 1.42, '1440p': 1, '4K': 0.52 };
    const fps = {};
    let bottleneck = 'Balanced';
    for (const [k, mul] of Object.entries(res)) {
        const g = b.gpu.fps * mul;
        fps[k] = Math.round(softMin(g, cpuCap));
    }
    const g1440 = b.gpu.fps;
    if (cpuCap < g1440 * 1.15) bottleneck = 'CPU-bound at 1440p';
    else if (g1440 * 1.42 < cpuCap * 0.7) bottleneck = 'GPU-bound';
    const ramWork = b.ram ? Math.min(1, 0.75 + b.ram.capacity / 256) : 0.6;
    const work = Math.round(b.cpu.work * ramWork * (b.gpu.vram >= 16 ? 1 : 0.95));
    return { fps, bottleneck, work };
}

/**
 * Full analysis of a build ({cat: part}).
 * Issues: { level: 'error' | 'warn' | 'info', cats: [...], msg }
 */
export function analyze(b) {
    const issues = [];
    const add = (level, cats, msg) => issues.push({ level, cats, msg });

    if (b.cpu && b.motherboard && b.cpu.socket !== b.motherboard.socket)
        add('error', ['cpu', 'motherboard'], `${b.cpu.socket} CPU won't fit the ${b.motherboard.socket} socket`);

    if (b.ram && b.motherboard && b.ram.mem !== b.motherboard.mem)
        add('error', ['ram', 'motherboard'], `Board takes ${b.motherboard.mem}, memory is ${b.ram.mem}`);

    if (b.case && b.motherboard && !b.case.forms.includes(b.motherboard.form))
        add('error', ['case', 'motherboard'], `${b.case.name} doesn't fit ${b.motherboard.form} boards`);

    if (b.case && b.gpu && b.gpu.length > b.case.gpuClear)
        add('error', ['case', 'gpu'], `GPU is ${b.gpu.length}mm, case fits ${b.case.gpuClear}mm`);

    if (b.case && b.cooler) {
        if (b.cooler.type === 'air' && b.cooler.height > b.case.coolerClear)
            add('error', ['case', 'cooler'], `Cooler is ${b.cooler.height}mm tall, case allows ${b.case.coolerClear}mm`);
        if (b.cooler.type === 'aio' && !b.case.rads.includes(b.cooler.rad))
            add('error', ['case', 'cooler'], `${b.cooler.rad}mm radiator won't mount in ${b.case.name}`);
    }

    if (b.cpu && b.cooler) {
        if (b.cooler.rating < b.cpu.power)
            add('warn', ['cpu', 'cooler'], `Cooler is rated ${b.cooler.rating}W, CPU pulls up to ${b.cpu.power}W — expect throttling`);
    }

    const watts = estimateWatts(b);
    if (b.psu) {
        if (watts > b.psu.watts) add('error', ['psu'], `Estimated draw ${watts}W exceeds the ${b.psu.watts}W PSU`);
        else if (watts * 1.3 > b.psu.watts) add('warn', ['psu'], `Only ${Math.round((b.psu.watts / watts - 1) * 100)}% PSU headroom — aim for 30%+`);
    }

    if (b.fans) {
        const fl = fanLayout(b.case, b.fans, b.cooler);
        if (fl.topBlocked) add('info', ['fans'], 'Top fans replaced by the radiator fans');
        if (fl.dropped > 0) add('info', ['fans'], fl.dropped > 1 ? `${fl.dropped} fans won't fit this case and were left out` : `1 fan won't fit this case and was left out`);
    }

    const missing = CATEGORIES.filter(c => c.required && !b[c.id]).map(c => c.id);
    const price = Object.values(b).reduce((s, p) => s + (p?.price || 0), 0);
    const perf = estimatePerf(b);
    const errors = issues.filter(i => i.level === 'error').length;
    return { issues, watts, price, perf, missing, errors, complete: missing.length === 0 };
}

/** Would putting `part` into `cat` cause errors with the rest of the build? Returns messages. */
export function conflictsFor(build, cat, part) {
    const trial = { ...build, [cat]: part };
    return analyze(trial).issues
        .filter(i => i.level === 'error' && i.cats.includes(cat) && i.cats.every(c => trial[c]))
        .map(i => i.msg);
}

/** Issues grouped by category, worst level per category. */
export function statusByCat(result) {
    const rank = { info: 1, warn: 2, error: 3 };
    const out = {};
    for (const i of result.issues) {
        for (const c of i.cats) {
            if (!out[c] || rank[i.level] > rank[out[c]]) out[c] = i.level;
        }
    }
    return out;
}
