// Tiny synthesized sound design — no audio files needed.
export class Sfx {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        this.hum = null;
        this.humWanted = false;
    }

    unlock() {
        if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.noise = this._noiseBuffer();
        if (this.humWanted) this._startHum();
    }

    setEnabled(on) {
        this.enabled = on;
        if (!this.ctx) return;
        this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
    }

    _ok() { return this.ctx && this.enabled && this.ctx.state === 'running'; }

    _noiseBuffer() {
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {           // brown-ish noise: softer than white
            const w = Math.random() * 2 - 1;
            last = (last + 0.04 * w) / 1.04;
            d[i] = last * 3.5;
        }
        return buf;
    }

    _tone({ freq = 440, to = null, dur = 0.1, type = 'sine', vol = 0.2, delay = 0 }) {
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.master);
        o.start(t); o.stop(t + dur + 0.02);
    }

    _sweep({ from = 400, to = 3000, dur = 0.35, vol = 0.25, q = 2, delay = 0 }) {
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noise;
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass'; f.Q.value = q;
        f.frequency.setValueAtTime(from, t);
        f.frequency.exponentialRampToValueAtTime(to, t + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.master);
        src.start(t, Math.random()); src.stop(t + dur + 0.05);
    }

    hover() { if (this._ok()) this._tone({ freq: 2200, dur: 0.03, vol: 0.025, type: 'triangle' }); }
    click() { if (this._ok()) this._tone({ freq: 900, to: 1400, dur: 0.06, vol: 0.08, type: 'triangle' }); }

    install() {
        if (!this._ok()) return;
        this._sweep({ from: 2600, to: 300, dur: 0.5, vol: 0.22 });
        this._tone({ freq: 150, to: 55, dur: 0.2, vol: 0.35, delay: 0.5 });
        this._tone({ freq: 1800, dur: 0.05, vol: 0.06, type: 'square', delay: 0.55 });
    }

    remove() {
        if (!this._ok()) return;
        this._sweep({ from: 300, to: 2400, dur: 0.3, vol: 0.18 });
    }

    error() {
        if (!this._ok()) return;
        this._tone({ freq: 160, dur: 0.12, vol: 0.12, type: 'square' });
        this._tone({ freq: 120, dur: 0.16, vol: 0.12, type: 'square', delay: 0.14 });
    }

    powerOn() {
        this.humWanted = true;
        if (!this._ok()) return;
        this._tone({ freq: 70, to: 220, dur: 0.9, vol: 0.18, type: 'sawtooth' });
        this._tone({ freq: 440, dur: 0.5, vol: 0.06, delay: 0.75 });
        this._tone({ freq: 660, dur: 0.6, vol: 0.05, delay: 0.85 });
        this._tone({ freq: 2400, dur: 0.08, vol: 0.05, type: 'square', delay: 1.2 }); // POST beep
        this._startHum();
    }

    powerOff() {
        this.humWanted = false;
        if (!this._ok()) { this._stopHum(); return; }
        this._tone({ freq: 220, to: 50, dur: 0.7, vol: 0.14, type: 'sawtooth' });
        this._stopHum();
    }

    _startHum() {
        if (!this.ctx || this.hum) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noise; src.loop = true;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 380;
        const g = this.ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.05, this.ctx.currentTime + 0.3, 0.6);
        src.connect(f).connect(g).connect(this.master);
        src.start();
        this.hum = { src, g };
    }

    _stopHum() {
        if (!this.hum || !this.ctx) return;
        const { src, g } = this.hum;
        g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25);
        src.stop(this.ctx.currentTime + 1.5);
        this.hum = null;
    }
}
