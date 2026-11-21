// Parts catalog. Prices are sample values for the demo — swap in your own data source later.
// Units: lengths in mm, power in W, prices in USD.

export const CATEGORIES = [
    { id: 'case',        label: 'Case',         short: 'Case',  required: true },
    { id: 'cpu',         label: 'Processor',    short: 'CPU',   required: true },
    { id: 'motherboard', label: 'Motherboard',  short: 'Board', required: true },
    { id: 'cooler',      label: 'CPU Cooler',   short: 'Cool',  required: true },
    { id: 'ram',         label: 'Memory',       short: 'RAM',   required: true },
    { id: 'gpu',         label: 'Graphics',     short: 'GPU',   required: true },
    { id: 'storage',     label: 'Storage',      short: 'SSD',   required: true },
    { id: 'psu',         label: 'Power Supply', short: 'PSU',   required: true },
    { id: 'fans',        label: 'Fans & RGB',   short: 'Fans',  required: false },
];

export const ICONS = {
    case: '<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="16.5" r="2.2"/><path d="M9 6h6"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    motherboard: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="6.5" y="6.5" width="5.5" height="5.5"/><path d="M15 6.5v11M18 6.5v11M6.5 15h5.5M6.5 18h5.5"/>',
    cooler: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c0-3.5 1.6-5.6 4.2-4.8M13.8 12c3.5 0 5.6 1.6 4.8 4.2M12 13.8c0 3.5-1.6 5.6-4.2 4.8M10.2 12c-3.5 0-5.6-1.6-4.8-4.2"/>',
    ram: '<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 10v3M10 10v3M14 10v3M18 10v3M5 16v3M19 16v3"/>',
    gpu: '<rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="8" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 17v3"/>',
    storage: '<rect x="2" y="8.5" width="20" height="7" rx="1"/><path d="M5.5 12h7"/><circle cx="18" cy="12" r="1"/>',
    psu: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/>',
    fans: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
};

export const PARTS = {
    case: [
        { id: 'aero-m', name: 'Aero M Mesh', price: 109, color: 'black', front: 'mesh', forms: ['ATX', 'mATX'],
          gpuClear: 400, coolerClear: 170, rads: [240, 360], dims: { d: 4.5, h: 4.8, w: 2.15 },
          blurb: 'High-airflow mid tower with a perforated steel front.' },
        { id: 'lumen-x', name: 'Lumen X Panoramic', price: 149, color: 'white', front: 'glass', forms: ['ATX', 'mATX'],
          gpuClear: 420, coolerClear: 175, rads: [240, 360], dims: { d: 4.7, h: 4.9, w: 2.25 },
          blurb: 'Dual tempered-glass showcase chassis in arctic white.' },
        { id: 'core-c', name: 'Core C Compact', price: 79, color: 'black', front: 'mesh', forms: ['mATX'],
          gpuClear: 330, coolerClear: 160, rads: [240], dims: { d: 3.9, h: 4.2, w: 2.05 },
          blurb: 'Small-footprint micro-ATX case. Watch your GPU length.' },
        { id: 'obsidian', name: 'Obsidian Full Tower', price: 199, color: 'black', front: 'glass', forms: ['ATX', 'mATX'],
          gpuClear: 450, coolerClear: 185, rads: [240, 360], dims: { d: 5.0, h: 5.3, w: 2.35 },
          blurb: 'Full tower with smoked glass front and room for anything.' },
        { id: 'aero-m-w', name: 'Aero M Mesh White', price: 115, color: 'white', front: 'mesh', forms: ['ATX', 'mATX'],
          gpuClear: 400, coolerClear: 170, rads: [240, 360], dims: { d: 4.5, h: 4.8, w: 2.15 },
          blurb: 'The airflow favourite, powder-coated in white.' },
        { id: 'vortex', name: 'Vortex Airflow', price: 99, color: 'black', front: 'mesh', forms: ['ATX', 'mATX'],
          gpuClear: 410, coolerClear: 172, rads: [240, 360], dims: { d: 4.6, h: 4.9, w: 2.2 },
          blurb: 'Budget-friendly mesh tower that still breathes well.' },
        { id: 'nebula-m', name: 'Nebula M Micro', price: 89, color: 'white', front: 'glass', forms: ['mATX'],
          gpuClear: 360, coolerClear: 165, rads: [240], dims: { d: 4.1, h: 4.4, w: 2.1 },
          blurb: 'Compact micro-ATX showcase with a glass front.' },
        { id: 'sakura', name: 'Sakura Pastel', price: 139, color: 'white', tint: '#f3c5d3', front: 'glass', forms: ['ATX', 'mATX'],
          gpuClear: 420, coolerClear: 175, rads: [240, 360], dims: { d: 4.7, h: 4.9, w: 2.25 },
          blurb: 'Soft pink panoramic chassis for a pastel build.' },
        { id: 'graphite', name: 'Graphite Silent', price: 119, color: 'black', tint: '#2a2f37', front: 'solid', forms: ['ATX', 'mATX'],
          gpuClear: 400, coolerClear: 168, rads: [240, 360], dims: { d: 4.6, h: 4.8, w: 2.2 },
          blurb: 'Sound-dampened solid front in gunmetal. Quiet over flashy.' },
        { id: 'monolith-xl', name: 'Monolith XL', price: 249, color: 'black', front: 'glass', forms: ['ATX', 'mATX'],
          gpuClear: 480, coolerClear: 190, rads: [240, 360], dims: { d: 5.4, h: 5.6, w: 2.45 },
          blurb: 'Huge full tower. Fits the longest cards with room to spare.' },
    ],
    cpu: [
        { id: 'r5-7600', name: 'AMD Ryzen 5 7600', brand: 'amd', price: 179, socket: 'AM5', cores: 6, threads: 12, boost: 5.1, power: 90, gaming: 72, work: 44 },
        { id: 'r7-9800x3d', name: 'AMD Ryzen 7 9800X3D', brand: 'amd', price: 479, socket: 'AM5', cores: 8, threads: 16, boost: 5.2, power: 120, gaming: 100, work: 66 },
        { id: 'r9-9950x', name: 'AMD Ryzen 9 9950X', brand: 'amd', price: 549, socket: 'AM5', cores: 16, threads: 32, boost: 5.7, power: 200, gaming: 88, work: 100 },
        { id: 'i5-14600k', name: 'Intel Core i5-14600K', brand: 'intel', price: 229, socket: 'LGA1700', cores: 14, threads: 20, boost: 5.3, power: 160, gaming: 80, work: 60 },
        { id: 'u7-265k', name: 'Intel Core Ultra 7 265K', brand: 'intel', price: 299, socket: 'LGA1851', cores: 20, threads: 20, boost: 5.5, power: 170, gaming: 84, work: 82 },
        { id: 'u9-285k', name: 'Intel Core Ultra 9 285K', brand: 'intel', price: 549, socket: 'LGA1851', cores: 24, threads: 24, boost: 5.7, power: 220, gaming: 87, work: 95 },
        { id: 'r5-5600', name: 'AMD Ryzen 5 5600', brand: 'amd', price: 99, socket: 'AM4', cores: 6, threads: 12, boost: 4.4, power: 76, gaming: 58, work: 34 },
        { id: 'r7-5700x3d', name: 'AMD Ryzen 7 5700X3D', brand: 'amd', price: 199, socket: 'AM4', cores: 8, threads: 16, boost: 4.1, power: 105, gaming: 78, work: 46 },
        { id: 'r5-9600x', name: 'AMD Ryzen 5 9600X', brand: 'amd', price: 229, socket: 'AM5', cores: 6, threads: 12, boost: 5.4, power: 105, gaming: 82, work: 52 },
        { id: 'r7-9700x', name: 'AMD Ryzen 7 9700X', brand: 'amd', price: 299, socket: 'AM5', cores: 8, threads: 16, boost: 5.5, power: 120, gaming: 85, work: 64 },
        { id: 'r9-9950x3d', name: 'AMD Ryzen 9 9950X3D', brand: 'amd', price: 699, socket: 'AM5', cores: 16, threads: 32, boost: 5.7, power: 200, gaming: 99, work: 100 },
        { id: 'i5-14400f', name: 'Intel Core i5-14400F', brand: 'intel', price: 149, socket: 'LGA1700', cores: 10, threads: 16, boost: 4.7, power: 120, gaming: 70, work: 46 },
        { id: 'i7-14700k', name: 'Intel Core i7-14700K', brand: 'intel', price: 349, socket: 'LGA1700', cores: 20, threads: 28, boost: 5.6, power: 230, gaming: 85, work: 84 },
        { id: 'u5-245k', name: 'Intel Core Ultra 5 245K', brand: 'intel', price: 229, socket: 'LGA1851', cores: 14, threads: 14, boost: 5.2, power: 160, gaming: 78, work: 66 },
    ],
    motherboard: [
        { id: 'b650-vector', name: 'Vector B650 WiFi', price: 179, socket: 'AM5', form: 'ATX', mem: 'DDR5', chipset: 'B650', color: 'black' },
        { id: 'b650m-air', name: 'Vector B650M Air', price: 149, socket: 'AM5', form: 'mATX', mem: 'DDR5', chipset: 'B650', color: 'white' },
        { id: 'x870e-titan', name: 'Forge X870E Elite', price: 349, socket: 'AM5', form: 'ATX', mem: 'DDR5', chipset: 'X870E', color: 'black' },
        { id: 'z790-classic', name: 'Vector Z790 DDR4', price: 189, socket: 'LGA1700', form: 'ATX', mem: 'DDR4', chipset: 'Z790', color: 'black' },
        { id: 'z890-titan', name: 'Forge Z890 Elite', price: 329, socket: 'LGA1851', form: 'ATX', mem: 'DDR5', chipset: 'Z890', color: 'black' },
        { id: 'b860m-frost', name: 'Vector B860M Frost', price: 159, socket: 'LGA1851', form: 'mATX', mem: 'DDR5', chipset: 'B860', color: 'white' },
        { id: 'b650m-stealth', name: 'Vector B650M Stealth', price: 129, socket: 'AM5', form: 'mATX', mem: 'DDR5', chipset: 'B650', color: 'black' },
        { id: 'x870-frost', name: 'Vector X870 Frost WiFi', price: 249, socket: 'AM5', form: 'ATX', mem: 'DDR5', chipset: 'X870', color: 'white' },
        { id: 'b550-classic', name: 'Vector B550 Classic', price: 119, socket: 'AM4', form: 'ATX', mem: 'DDR4', chipset: 'B550', color: 'black' },
        { id: 'b550m-frost', name: 'Vector B550M Frost', price: 109, socket: 'AM4', form: 'mATX', mem: 'DDR4', chipset: 'B550', color: 'white' },
        { id: 'b760m-classic', name: 'Vector B760M DDR4', price: 109, socket: 'LGA1700', form: 'mATX', mem: 'DDR4', chipset: 'B760', color: 'black' },
        { id: 'z790-forge', name: 'Forge Z790 Elite', price: 299, socket: 'LGA1700', form: 'ATX', mem: 'DDR5', chipset: 'Z790', color: 'black' },
        { id: 'b860-vector', name: 'Vector B860 WiFi', price: 179, socket: 'LGA1851', form: 'ATX', mem: 'DDR5', chipset: 'B860', color: 'black' },
    ],
    cooler: [
        { id: 'glacier-120', name: 'Glacier 120 Tower', price: 39, type: 'air', height: 155, rating: 180, rgb: false, color: 'black' },
        { id: 'glacier-duo', name: 'Glacier Duo 140', price: 89, type: 'air', dual: true, height: 165, rating: 260, rgb: true, color: 'black' },
        { id: 'hydra-240', name: 'Hydra 240 ARGB', price: 119, type: 'aio', rad: 240, rating: 250, rgb: true, color: 'black' },
        { id: 'hydra-360', name: 'Hydra 360 ARGB', price: 159, type: 'aio', rad: 360, rating: 320, rgb: true, color: 'black' },
        { id: 'hydra-360w', name: 'Hydra 360 ARGB White', price: 169, type: 'aio', rad: 360, rating: 320, rgb: true, color: 'white' },
        { id: 'slim-92', name: 'Slim 92 Low-Profile', price: 29, type: 'air', height: 70, rating: 95, rgb: false, color: 'black' },
        { id: 'glacier-120w', name: 'Glacier 120 White ARGB', price: 45, type: 'air', height: 155, rating: 180, rgb: true, color: 'white' },
        { id: 'glacier-duo-w', name: 'Glacier Duo 140 White', price: 99, type: 'air', dual: true, height: 165, rating: 260, rgb: true, color: 'white' },
        { id: 'hydra-240w', name: 'Hydra 240 ARGB White', price: 129, type: 'aio', rad: 240, rating: 250, rgb: true, color: 'white' },
        { id: 'hydra-360-elite', name: 'Hydra 360 Elite', price: 229, type: 'aio', rad: 360, rating: 340, rgb: true, color: 'black' },
    ],
    ram: [
        { id: 'pulse-32', name: 'Pulse RGB 32GB DDR5-6000', price: 109, mem: 'DDR5', capacity: 32, speed: 6000, sticks: 2, rgb: true, color: 'black' },
        { id: 'pulse-64', name: 'Pulse RGB 64GB DDR5-6400', price: 219, mem: 'DDR5', capacity: 64, speed: 6400, sticks: 2, rgb: true, color: 'black' },
        { id: 'frost-32', name: 'Frost RGB 32GB DDR5-6000', price: 119, mem: 'DDR5', capacity: 32, speed: 6000, sticks: 2, rgb: true, color: 'white' },
        { id: 'stealth-128', name: 'Stealth 128GB DDR5-5600', price: 349, mem: 'DDR5', capacity: 128, speed: 5600, sticks: 4, rgb: false, color: 'black' },
        { id: 'classic-32', name: 'Classic RGB 32GB DDR4-3600', price: 69, mem: 'DDR4', capacity: 32, speed: 3600, sticks: 2, rgb: true, color: 'black' },
        { id: 'classic-16', name: 'Classic 16GB DDR4-3200', price: 39, mem: 'DDR4', capacity: 16, speed: 3200, sticks: 2, rgb: false, color: 'black' },
        { id: 'classic-64', name: 'Classic RGB 64GB DDR4-3600', price: 139, mem: 'DDR4', capacity: 64, speed: 3600, sticks: 4, rgb: true, color: 'black' },
        { id: 'stealth-32', name: 'Stealth 32GB DDR5-5600', price: 89, mem: 'DDR5', capacity: 32, speed: 5600, sticks: 2, rgb: false, color: 'black' },
        { id: 'pulse-48', name: 'Pulse RGB 48GB DDR5-6000', price: 159, mem: 'DDR5', capacity: 48, speed: 6000, sticks: 2, rgb: true, color: 'black' },
        { id: 'frost-64', name: 'Frost RGB 64GB DDR5-6400', price: 239, mem: 'DDR5', capacity: 64, speed: 6400, sticks: 2, rgb: true, color: 'white' },
        { id: 'frost-96', name: 'Frost RGB 96GB DDR5-6400', price: 319, mem: 'DDR5', capacity: 96, speed: 6400, sticks: 2, rgb: true, color: 'white' },
    ],
    gpu: [
        { id: 'rtx5060ti', name: 'GeForce RTX 5060 Ti 16GB', badge: 'RTX 5060 Ti', brand: 'nvidia', price: 429, vram: 16, length: 240, slots: 2, fans: 2, power: 180, fps: 88, color: 'black' },
        { id: 'rtx5070', name: 'GeForce RTX 5070 12GB', badge: 'RTX 5070', brand: 'nvidia', price: 549, vram: 12, length: 285, slots: 2.5, fans: 3, power: 250, fps: 116, color: 'black' },
        { id: 'rtx5070w', name: 'GeForce RTX 5070 Frost', badge: 'RTX 5070', brand: 'nvidia', price: 579, vram: 12, length: 300, slots: 2.5, fans: 3, power: 250, fps: 116, color: 'white' },
        { id: 'rx9070xt', name: 'Radeon RX 9070 XT 16GB', badge: 'RX 9070 XT', brand: 'amd', price: 649, vram: 16, length: 310, slots: 3, fans: 3, power: 304, fps: 128, color: 'black' },
        { id: 'rtx5080', name: 'GeForce RTX 5080 16GB', badge: 'RTX 5080', brand: 'nvidia', price: 1099, vram: 16, length: 340, slots: 3, fans: 3, power: 360, fps: 155, color: 'black' },
        { id: 'rtx5090', name: 'GeForce RTX 5090 32GB', badge: 'RTX 5090', brand: 'nvidia', price: 2199, vram: 32, length: 360, slots: 3.5, fans: 3, power: 575, fps: 210, color: 'black' },
        { id: 'rtx5050', name: 'GeForce RTX 5050 8GB', badge: 'RTX 5050', brand: 'nvidia', price: 249, vram: 8, length: 200, slots: 2, fans: 2, power: 130, fps: 62, color: 'black' },
        { id: 'arc-b580', name: 'Intel Arc B580 12GB', badge: 'ARC B580', brand: 'intel', price: 249, vram: 12, length: 272, slots: 2, fans: 2, power: 190, fps: 70, color: 'black' },
        { id: 'rtx5060', name: 'GeForce RTX 5060 8GB', badge: 'RTX 5060', brand: 'nvidia', price: 299, vram: 8, length: 220, slots: 2, fans: 2, power: 145, fps: 74, color: 'black' },
        { id: 'rx9060xt', name: 'Radeon RX 9060 XT 16GB', badge: 'RX 9060 XT', brand: 'amd', price: 349, vram: 16, length: 240, slots: 2, fans: 2, power: 160, fps: 82, color: 'black' },
        { id: 'rx9070', name: 'Radeon RX 9070 16GB', badge: 'RX 9070', brand: 'amd', price: 549, vram: 16, length: 290, slots: 2.5, fans: 3, power: 220, fps: 118, color: 'black' },
        { id: 'rtx5070ti', name: 'GeForce RTX 5070 Ti 16GB', badge: 'RTX 5070 Ti', brand: 'nvidia', price: 749, vram: 16, length: 320, slots: 3, fans: 3, power: 300, fps: 138, color: 'black' },
        { id: 'rtx5080w', name: 'GeForce RTX 5080 Frost', badge: 'RTX 5080', brand: 'nvidia', price: 1149, vram: 16, length: 345, slots: 3, fans: 3, power: 360, fps: 155, color: 'white' },
    ],
    storage: [
        { id: 'nv-1tb', name: 'Swift NVMe 1TB Gen4', price: 69, capacity: '1TB', gen: 4, read: 7000 },
        { id: 'nv-2tb', name: 'Swift NVMe 2TB Gen4', price: 129, capacity: '2TB', gen: 4, read: 7300 },
        { id: 'nv5-2tb', name: 'Hyper NVMe 2TB Gen5', price: 219, capacity: '2TB', gen: 5, read: 12400 },
        { id: 'nv5-4tb', name: 'Hyper NVMe 4TB Gen5', price: 399, capacity: '4TB', gen: 5, read: 14000 },
        { id: 'nv3-1tb', name: 'Basic NVMe 1TB Gen3', price: 49, capacity: '1TB', gen: 3, read: 3500 },
        { id: 'nv-500', name: 'Swift NVMe 500GB Gen4', price: 45, capacity: '500GB', gen: 4, read: 5000 },
        { id: 'nv-4tb', name: 'Swift NVMe 4TB Gen4', price: 249, capacity: '4TB', gen: 4, read: 7400 },
        { id: 'nv5-1tb', name: 'Hyper NVMe 1TB Gen5', price: 149, capacity: '1TB', gen: 5, read: 11000 },
    ],
    psu: [
        { id: 'volt-650', name: 'Volt 650 Bronze', price: 69, watts: 650, rating: 'Bronze' },
        { id: 'volt-850', name: 'Volt 850 Gold', price: 119, watts: 850, rating: 'Gold' },
        { id: 'volt-1000', name: 'Volt 1000 Platinum', price: 199, watts: 1000, rating: 'Platinum' },
        { id: 'volt-1300', name: 'Volt 1300 Titanium', price: 329, watts: 1300, rating: 'Titanium' },
        { id: 'volt-550', name: 'Volt 550 Bronze', price: 59, watts: 550, rating: 'Bronze' },
        { id: 'volt-750', name: 'Volt 750 Gold', price: 99, watts: 750, rating: 'Gold' },
        { id: 'volt-850w', name: 'Volt 850 Gold White', price: 129, watts: 850, rating: 'Gold', color: 'white' },
        { id: 'volt-1200', name: 'Volt 1200 Platinum', price: 279, watts: 1200, rating: 'Platinum' },
        { id: 'volt-1600', name: 'Volt 1600 Titanium', price: 449, watts: 1600, rating: 'Titanium' },
    ],
    fans: [
        { id: 'stock', name: 'Stock Exhaust Fan', price: 0, front: 0, top: 0, rear: 1, rgb: false, color: 'black' },
        { id: 'halo-3', name: 'Halo 120 ARGB ×3', price: 69, front: 3, top: 0, rear: 1, rgb: true, color: 'black' },
        { id: 'halo-6', name: 'Halo 120 ARGB ×6', price: 129, front: 3, top: 2, rear: 1, rgb: true, color: 'black' },
        { id: 'halo-6w', name: 'Halo 120 ARGB White ×6', price: 139, front: 3, top: 2, rear: 1, rgb: true, color: 'white' },
        { id: 'halo-3w', name: 'Halo 120 ARGB White ×3', price: 75, front: 3, top: 0, rear: 1, rgb: true, color: 'white' },
        { id: 'breeze-6', name: 'Breeze 120 PWM ×6', price: 79, front: 3, top: 2, rear: 1, rgb: false, color: 'black' },
        { id: 'halo-7', name: 'Halo 120 ARGB ×7', price: 149, front: 3, top: 3, rear: 1, rgb: true, color: 'black' },
    ],
};

export const PRESETS = [
    { id: 'starter', name: 'Starter 1080p', build: { case: 'core-c', cpu: 'r5-7600', motherboard: 'b650m-air', cooler: 'glacier-120', ram: 'pulse-32', gpu: 'rtx5060ti', storage: 'nv-1tb', psu: 'volt-650', fans: 'halo-3' } },
    { id: 'sweet', name: 'Sweet Spot 1440p', build: { case: 'aero-m', cpu: 'r7-9800x3d', motherboard: 'b650-vector', cooler: 'hydra-240', ram: 'pulse-32', gpu: 'rx9070xt', storage: 'nv-2tb', psu: 'volt-850', fans: 'halo-6' } },
    { id: 'snow', name: 'Snowblind White', build: { case: 'lumen-x', cpu: 'u7-265k', motherboard: 'b860m-frost', cooler: 'hydra-360w', ram: 'frost-32', gpu: 'rtx5070w', storage: 'nv-2tb', psu: 'volt-850', fans: 'halo-6w' } },
    { id: 'creator', name: 'Creator Workstation', build: { case: 'aero-m', cpu: 'r9-9950x', motherboard: 'x870e-titan', cooler: 'glacier-duo', ram: 'stealth-128', gpu: 'rtx5080', storage: 'nv5-4tb', psu: 'volt-1000', fans: 'halo-3' } },
    { id: 'ultimate', name: 'No-Compromise 4K', build: { case: 'obsidian', cpu: 'r7-9800x3d', motherboard: 'x870e-titan', cooler: 'hydra-360', ram: 'pulse-64', gpu: 'rtx5090', storage: 'nv5-4tb', psu: 'volt-1300', fans: 'halo-6' } },
    { id: 'value', name: 'Value AM4', build: { case: 'vortex', cpu: 'r7-5700x3d', motherboard: 'b550-classic', cooler: 'glacier-120', ram: 'classic-32', gpu: 'rx9060xt', storage: 'nv-1tb', psu: 'volt-650', fans: 'halo-3' } },
    { id: 'sakura', name: 'Sakura Pastel', build: { case: 'sakura', cpu: 'r5-9600x', motherboard: 'x870-frost', cooler: 'hydra-240w', ram: 'frost-32', gpu: 'rtx5070w', storage: 'nv-2tb', psu: 'volt-850w', fans: 'halo-6w' } },
    { id: 'silent', name: 'Silent Studio', build: { case: 'graphite', cpu: 'r7-9700x', motherboard: 'b650-vector', cooler: 'glacier-duo', ram: 'stealth-32', gpu: 'rtx5070ti', storage: 'nv-4tb', psu: 'volt-750', fans: 'breeze-6' } },
];

export function findPart(cat, id) {
    return PARTS[cat]?.find(p => p.id === id) || null;
}

/** Turn {cat: id} into {cat: part}. Unknown ids are dropped. */
export function resolveBuild(ids) {
    const out = {};
    for (const c of CATEGORIES) {
        const p = ids && ids[c.id] ? findPart(c.id, ids[c.id]) : null;
        if (p) out[c.id] = p;
    }
    return out;
}

export function specChips(cat, p) {
    switch (cat) {
        case 'case': return [p.forms.join(' / '), `GPU ≤ ${p.gpuClear}mm`, `Cooler ≤ ${p.coolerClear}mm`, `Rad ${p.rads.join('/')}`];
        case 'cpu': return [`${p.cores}C / ${p.threads}T`, `${p.boost} GHz`, p.socket, `${p.power}W`];
        case 'motherboard': return [p.socket, p.form, p.mem, p.color === 'white' ? 'White PCB' : 'Black PCB'];
        case 'cooler': return p.type === 'air'
            ? [p.dual ? 'Dual tower' : 'Air tower', `${p.height}mm tall`, `${p.rating}W rated`, p.rgb ? 'ARGB' : 'No RGB']
            : [`${p.rad}mm AIO`, `${p.rating}W rated`, 'ARGB pump', p.color === 'white' ? 'White' : 'Black'];
        case 'ram': return [`${p.capacity}GB`, `${p.mem}-${p.speed}`, `${p.sticks} sticks`, p.rgb ? 'ARGB' : 'Low profile'];
        case 'gpu': return [`${p.vram}GB VRAM`, `${p.length}mm`, `${p.slots}-slot`, `${p.power}W`];
        case 'storage': return [p.capacity, `PCIe Gen${p.gen}`, `${p.read.toLocaleString()} MB/s`];
        case 'psu': return [`${p.watts}W`, `80+ ${p.rating}`, 'Fully modular', 'ATX 3.1'];
        case 'fans': return [`${p.front + p.top + p.rear} fans`, p.rgb ? 'ARGB' : 'No RGB', p.color === 'white' ? 'White' : 'Black'];
        default: return [];
    }
}
