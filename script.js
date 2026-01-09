const products = [
    { name: "Adult 1", s: 340, r: 640, size: 1, bSh: 25, bRet: 30, cSh: 25, cRet: 35, cFl: 20 },
    { name: "Adult 2", s: 460, r: 920, size: 2, bSh: 15, bRet: 20, cSh: 15, cRet: 30, cFl: 10 },
    { name: "Adult 3", s: 580, r: 1160, size: 3, bSh: 8, bRet: 15, cSh: 8, cRet: 25, cFl: 10 },
    { name: "Adult 4", s: 700, r: 1400, size: 4, bSh: 7, bRet: 10, cSh: 7, cRet: 20, cFl: 10 },
    { name: "Adult 5", s: 820, r: 1640, size: 5, bSh: 2, bRet: 5, cSh: 2, cRet: 10, cFl: 5 },
    { name: "Adult 6", s: 940, r: 1880, size: 6, bSh: 1, bRet: 5, cSh: 1, cRet: 10, cFl: 5 },
    { name: "Adult 7", s: 1060, r: 2120, size: 7, bSh: 1, bRet: 5, cSh: 1, cRet: 10, cFl: 5 },
    { name: "Adult 8", s: 1180, r: 2360, size: 8, bSh: 1, bRet: 5, cSh: 1, cRet: 10, cFl: 5 },
    { name: "Pensioner", s: 210, r: 420, size: 1, bSh: 10, bRet: 40, cSh: 10, cRet: 45, cFl: 5 },
    { name: "Youth", s: 160, r: 320, size: 1, bSh: 15, bRet: 50, cSh: 15, cRet: 60, cFl: 5 },
    { name: "Travel Pass 12", s: 3670, r: 3670, size: 1, bSh: 10, bRet: 0, cSh: 10, cRet: 0, cFl: 0, isPass: true },
    { name: "Travel Pass 24", s: 6200, r: 6200, size: 1, bSh: 5, bRet: 0, cSh: 5, cRet: 0, cFl: 0, isPass: true }
];

function render() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;
    
    grid.innerHTML = products.map((p, i) => `
        <div class="grid grid-cols-12 items-center p-4 hover:bg-slate-50 transition-colors">
            <div class="col-span-3">
                <h4 class="font-black text-slate-800 text-sm uppercase italic tracking-tight">${p.name}</h4>
                <span class="text-[9px] font-bold text-slate-400">UNIT PRICE: ${p.s} | ${p.r} SEK</span>
            </div>

            <div class="col-span-3 px-6 flex items-center gap-4">
                <div class="w-16">
                    <input type="number" value="${p.bSh}" onchange="up(${i},'bSh',this.value)" class="input-num text-slate-400">
                </div>
                <div class="flex-grow">
                    ${p.isPass ? '' : `<div class="flex justify-between mb-1"><span class="text-[9px] font-bold text-slate-400 uppercase">Return Share: <span id="lbl-bRet-${i}" class="text-slate-600">${p.bRet}%</span></span></div><input type="range" value="${p.bRet}" oninput="up(${i},'bRet',this.value, this)" class="sr-slider" style="--val: ${p.bRet}%">`}
                </div>
            </div>

            <div class="col-span-6 px-6 flex items-center gap-4 bg-indigo-50/20 py-1 rounded-xl">
                <div class="w-16">
                    <input type="number" value="${p.cSh}" onchange="up(${i},'cSh',this.value)" class="input-num text-indigo-700">
                </div>
                <div class="flex-grow">
                    ${p.isPass ? '' : `<div class="flex justify-between mb-1"><span class="text-[9px] font-bold text-indigo-300 uppercase">Return Share: <span id="lbl-cRet-${i}" class="text-indigo-600">${p.cRet}%</span></span></div><input type="range" value="${p.cRet}" oninput="up(${i},'cRet',this.value, this)" class="sr-slider" style="--val: ${p.cRet}%">`}
                </div>
                <div class="w-16">
                    ${p.isPass ? '' : `<input type="number" value="${p.cFl}" onchange="up(${i},'cFl',this.value)" class="input-num text-indigo-700">`}
                </div>
                <div class="w-24 text-right">
                    <span id="delta-${i}" class="font-black text-xs text-green-500">+0</span>
                </div>
            </div>
        </div>
    `).join('');
}

function up(i, f, v, el) {
    products[i][f] = parseFloat(v) || 0;
    if (f.includes('Ret')) {
        if (el) el.style.setProperty('--val', products[i][f] + '%');
        const lbl = document.getElementById(`lbl-${f}-${i}`);
        if (lbl) lbl.innerText = products[i][f] + '%';
    }
    calculate();
}

function calculate() {
    const baseTargetInput = document.getElementById('baseTarget');
    const flexPriceInput = document.getElementById('flexPrice');
    const retDiscInput = document.getElementById('retDisc');
    
    if (!baseTargetInput || !flexPriceInput || !retDiscInput) return;

    const baseTarget = parseFloat(baseTargetInput.value) || 0;
    const flexP = parseFloat(flexPriceInput.value) || 0;
    const retD = (100 - parseFloat(retDiscInput.value)) / 100;

    let bShSum = 0, cShSum = 0, bPxT = 0, cPxT = 0, bYieldT = 0, cYieldT = 0, cFlexYield = 0;

    products.forEach((p, i) => {
        bShSum += p.bSh; cShSum += p.cSh;

        // BASELINE
        const bBlend = p.isPass ? p.s : ((1 - p.bRet / 100) * p.s) + (p.bRet / 100 * p.r);
        const bTrans = (p.bSh / 100) * baseTarget; 
        const bRev = bTrans * bBlend;
        bYieldT += bRev;
        bPxT += p.isPass ? bTrans * (p.name.includes('12') ? 12 : 24) : bTrans * p.size * (1 + (p.bRet / 100));

        // CHALLENGER
        const cBlend = p.isPass ? p.s : ((1 - p.cRet / 100) * p.s) + (p.cRet / 100 * (p.r * retD));
        const cTrans = (p.cSh / 100) * baseTarget;
        const fY = p.isPass ? 0 : (cTrans * (p.cFl / 100) * flexP);
        const cRevBase = cTrans * cBlend;
        cFlexYield += fY;
        const cRevFinal = cRevBase + fY;
        cYieldT += cRevFinal;
        cPxT += p.isPass ? cTrans * (p.name.includes('12') ? 12 : 24) : cTrans * p.size * (1 + (p.cRet / 100));

        const d = (cRevFinal - bRev) / 12; // Monthly delta
        const el = document.getElementById(`delta-${i}`);
        if (el) {
            el.innerText = (d >= 0 ? "+" : "") + Math.round(d / 1000) + "k";
            el.className = d >= 0 ? "font-black text-xs text-green-500" : "font-black text-xs text-red-500";
        }
    });

    // Update UI elements
    const baseYieldEl = document.getElementById('baseYield');
    const totalYieldEl = document.getElementById('totalYield');
    const netYieldEl = document.getElementById('netYield');
    const revVarEl = document.getElementById('revVar');
    const flexRevTotalEl = document.getElementById('flexRevTotal');
    const basePaxDisplayEl = document.getElementById('basePaxDisplay');
    const paxDeltaEl = document.getElementById('paxDelta');
    
    if (baseYieldEl) baseYieldEl.innerText = (bYieldT / 1000000).toFixed(1) + "M SEK";
    if (totalYieldEl) totalYieldEl.innerText = (cYieldT / 1000000).toFixed(1) + "M SEK";
    if (netYieldEl) netYieldEl.innerText = (cYieldT - bYieldT >= 0 ? "+" : "") + Math.round(cYieldT - bYieldT).toLocaleString() + " SEK";
    if (revVarEl) revVarEl.innerText = (bYieldT === 0 ? "0.0%" : ((cYieldT - bYieldT) / bYieldT * 100).toFixed(1) + "%");
    if (flexRevTotalEl) flexRevTotalEl.innerText = Math.round(cFlexYield).toLocaleString() + " SEK";
    if (basePaxDisplayEl) basePaxDisplayEl.innerText = Math.round(bPxT).toLocaleString();
    if (paxDeltaEl) paxDeltaEl.innerText = (cPxT - bPxT >= 0 ? "+" : "") + Math.round(cPxT - bPxT).toLocaleString();

    const bc = document.getElementById('baseCheck'), cc = document.getElementById('chalCheck');
    if (bc) {
        bc.innerText = `Share: ${bShSum.toFixed(1)}%`; 
        bc.className = `share-pill ${Math.abs(bShSum - 100) < 0.1 ? 'valid' : 'invalid'}`;
    }
    if (cc) {
        cc.innerText = `Share: ${cShSum.toFixed(1)}%`; 
        cc.className = `share-pill ${Math.abs(cShSum - 100) < 0.1 ? 'valid' : 'invalid'}`;
    }
}

// Global scope if needed for onchange handlers in HTML
window.calculate = calculate;
window.up = up;

window.onload = () => { render(); calculate(); };
