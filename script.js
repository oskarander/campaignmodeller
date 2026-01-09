// Import React and hooks
import React, { useState, useMemo } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
// Import Lucide icons
import { TrendingUp, TrendingDown, Users, DollarSign, AlertCircle, Calendar, Settings, Info, PieChart } from 'https://esm.sh/lucide-react@0.294.0?deps=react@18.2.0';

// --- CONFIGURATION DATA ---
const INITIAL_CHANNELS = {
    web: {
        id: 'web',
        name: 'Website',
        traffic: 150000,
        cr: 15.0,
        bizShare: 50,
        returnMix: 40,
        avgGroupSize: 1.2,
    },
    app: {
        id: 'app',
        name: 'App',
        traffic: 30000,
        cr: 50.0,
        bizShare: 50,
        returnMix: 30,
        avgGroupSize: 1.0,
    },
    kiosk: {
        id: 'kiosk',
        name: 'Kiosks',
        traffic: 15000,
        cr: 90.0,
        bizShare: 50,
        returnMix: 50,
        avgGroupSize: 1.5,
    }
};

const DEFAULT_TICKET_PRICES = {
    adult: 340,
    pensioner: 210,
    youth: 160,
    child: 160,
};

const DEFAULT_LEISURE_MIX = {
    adult: 60,
    pensioner: 20,
    youth: 10,
    child: 10,
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => (
    React.createElement("div", { className: `bg-white rounded-xl shadow-sm border border-gray-200 card-transition ${className}` }, children)
);

const SliderInput = ({ label, value, onChange, min, max, step = 1, unit = "", tooltip = "", colorClass = "text-yellow-500" }) => (
    React.createElement("div", { className: "mb-4" },
        React.createElement("div", { className: "flex justify-between items-center mb-1.5" },
            React.createElement("label", { className: "text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1" },
                label,
                tooltip && React.createElement("span", { className: "text-gray-300 cursor-help transition-colors hover:text-gray-500", title: tooltip },
                    React.createElement(Info, { className: "w-3 h-3" })
                )
            ),
            React.createElement("span", { className: `text-xs font-black p-1 bg-gray-50 rounded min-w-[40px] text-center border border-gray-100 ${colorClass}` }, `${value}${unit}`)
        ),
        React.createElement("input", {
            type: "range",
            min: min,
            max: max,
            step: step,
            value: value,
            onChange: (e) => onChange(parseFloat(e.target.value)),
            className: `w-full ${colorClass}`
        })
    )
);

const NumberInput = ({ label, value, onChange, unit = "" }) => (
    React.createElement("div", { className: "mb-4" },
        React.createElement("label", { className: "block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5" }, label),
        React.createElement("div", { className: "relative group" },
            React.createElement("input", {
                type: "number",
                value: value,
                onChange: (e) => onChange(parseFloat(e.target.value)),
                className: "block w-full text-right pr-10 pl-3 py-2 text-sm border-gray-200 border rounded-lg focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all outline-none"
            }),
            React.createElement("span", { className: "absolute right-3 top-2 text-xs font-bold text-gray-300" }, unit)
        )
    )
);

// --- MAIN APP COMPONENT ---
function RevenueModeler() {
    // STATE
    const [channels, setChannels] = useState(INITIAL_CHANNELS);
    const [prices, setPrices] = useState(DEFAULT_TICKET_PRICES);
    const [leisureMix, setLeisureMix] = useState(DEFAULT_LEISURE_MIX);

    const [scenario, setScenario] = useState({
        active: true,
        name: "New Campaign",
        targetChannel: "web",
        targetSegment: "leisure",
        yieldImpact: 0,
        crImpact: 0,
    });

    // LOGIC
    const calculateYield = (mix) => {
        const total = mix.adult + mix.pensioner + mix.youth + mix.child;
        const factor = total === 0 ? 0 : 100 / total;
        return (
            (prices.adult * (mix.adult * factor) / 100) +
            (prices.pensioner * (mix.pensioner * factor) / 100) +
            (prices.youth * (mix.youth * factor) / 100) +
            (prices.child * (mix.child * factor) / 100)
        );
    };

    const yieldBiz = prices.adult;
    const yieldLei = calculateYield(leisureMix);

    const calculateChannelMetrics = (channelData, scenarioData, applyScenario = false) => {
        let { traffic, cr, bizShare, returnMix, avgGroupSize } = channelData;
        let channelYieldBiz = yieldBiz;
        let channelYieldLei = yieldLei;

        if (applyScenario && scenarioData.active) {
            const isTargetChannel = scenarioData.targetChannel === 'all' || scenarioData.targetChannel === channelData.id;
            if (isTargetChannel) {
                const impactYield = 1 + (scenarioData.yieldImpact / 100);
                const impactCR = 1 + (scenarioData.crImpact / 100);

                if (scenarioData.targetSegment === 'business' || scenarioData.targetSegment === 'both') {
                    channelYieldBiz *= impactYield;
                    const crUplift = cr * (bizShare / 100) * (impactCR - 1);
                    cr += crUplift;
                }
                if (scenarioData.targetSegment === 'leisure' || scenarioData.targetSegment === 'both') {
                    channelYieldLei *= impactYield;
                    const crUplift = cr * ((100 - bizShare) / 100) * (impactCR - 1);
                    cr += crUplift;
                }
            }
        }

        const transactions = traffic * (cr / 100);
        const totalTickets = transactions * avgGroupSize;
        const tripsPerTicket = ((100 - returnMix) / 100 * 1) + (returnMix / 100 * 2);
        const totalPax = totalTickets * tripsPerTicket;
        const ticketsBiz = totalTickets * (bizShare / 100);
        const ticketsLei = totalTickets * ((100 - bizShare) / 100);
        const revenueBiz = ticketsBiz * channelYieldBiz * tripsPerTicket;
        const revenueLei = ticketsLei * channelYieldLei * tripsPerTicket;

        return { transactions, totalPax, revenue: revenueBiz + revenueLei, effectiveCR: cr };
    };

    const results = useMemo(() => {
        const baseline = { pax: 0, revenue: 0 };
        const simulated = { pax: 0, revenue: 0 };
        const channelDetails = {};

        Object.values(channels).forEach(ch => {
            const base = calculateChannelMetrics(ch, scenario, false);
            const sim = calculateChannelMetrics(ch, scenario, true);
            baseline.pax += base.totalPax;
            baseline.revenue += base.revenue;
            simulated.pax += sim.totalPax;
            simulated.revenue += sim.revenue;
            channelDetails[ch.id] = { base, sim };
        });
        return { baseline, simulated, channelDetails };
    }, [channels, scenario, prices, leisureMix]);

    const updateChannel = (id, field, value) => {
        setChannels(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };
    const updateMix = (field, value) => setLeisureMix(prev => ({ ...prev, [field]: value }));

    const fmtNum = (n) => Math.round(n).toLocaleString();
    const fmtSEK = (n) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
    const fmtDiff = (n) => (n > 0 ? "+" : "") + fmtNum(n);
    const fmtDiffSEK = (n) => (n > 0 ? "+" : "") + fmtSEK(n);

    return (
        React.createElement("div", { className: "min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800" },
            // HEADER
            React.createElement("div", { className: "max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in" },
                React.createElement("div", null,
                    React.createElement("div", { className: "flex items-center gap-3 mb-1" },
                        React.createElement("span", { className: "bg-yellow-400 text-slate-900 px-2 py-0.5 rounded font-black text-xs italic" }, "AX"),
                        React.createElement("h1", { className: "text-2xl font-black text-slate-900 tracking-tight uppercase" }, "Revenue Strategy Lab")
                    ),
                    React.createElement("p", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest" }, "Baseline vs Challenger Growth Simulation")
                ),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("div", { className: "bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-right" },
                        React.createElement("p", { className: "text-[9px] font-black text-slate-400 uppercase" }, "Current Simulation"),
                        React.createElement("p", { className: "text-sm font-black text-slate-800" }, scenario.name || "Untitled Scenario")
                    )
                )
            ),

            // TICKET PRICING
            React.createElement("div", { className: "max-w-6xl mx-auto mb-8 animate-fade-in", style: { animationDelay: '0.1s' } },
                React.createElement(Card, null,
                    React.createElement("div", { className: "bg-slate-900 text-white px-6 py-4 rounded-t-xl flex justify-between items-center" },
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement(PieChart, { className: "w-5 h-5 text-yellow-400" }),
                            React.createElement("h2", { className: "font-black uppercase text-xs tracking-widest" }, "Market & Pricing Configuration")
                        ),
                        React.createElement("div", { className: "flex gap-4 text-[10px] font-bold" },
                            React.createElement("div", { className: "bg-slate-800 px-3 py-1 rounded-full border border-slate-700" },
                                "Lei Yield: ", React.createElement("span", { className: "text-yellow-400" }, Math.round(yieldLei), " SEK")
                            ),
                            React.createElement("div", { className: "bg-slate-800 px-3 py-1 rounded-full border border-slate-700" },
                                "Biz Yield: ", React.createElement("span", { className: "text-indigo-400" }, Math.round(yieldBiz), " SEK")
                            )
                        )
                    ),
                    React.createElement("div", { className: "p-8 grid grid-cols-1 lg:grid-cols-2 gap-12" },
                        React.createElement("div", null,
                            React.createElement("h3", { className: "text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2" },
                                React.createElement("span", { className: "w-1 h-4 bg-yellow-400 rounded-full" }), "Baseline Price Tiers (Single)"
                            ),
                            React.createElement("div", { className: "grid grid-cols-2 gap-x-8 gap-y-2" },
                                React.createElement(NumberInput, { label: "Adult (26-65)", value: prices.adult, onChange: v => setPrices({ ...prices, adult: v }), unit: "kr" }),
                                React.createElement(NumberInput, { label: "Pensioner (65+)", value: prices.pensioner, onChange: v => setPrices({ ...prices, pensioner: v }), unit: "kr" }),
                                React.createElement(NumberInput, { label: "Youth (18-25)", value: prices.youth, onChange: v => setPrices({ ...prices, youth: v }), unit: "kr" }),
                                React.createElement(NumberInput, { label: "Child (0-17)", value: prices.child, onChange: v => setPrices({ ...prices, child: v }), unit: "kr" })
                            )
                        ),
                        React.createElement("div", null,
                            React.createElement("h3", { className: "text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2" },
                                React.createElement("span", { className: "w-1 h-4 bg-indigo-500 rounded-full" }), "Leisure Segment Mix (%)"
                            ),
                            React.createElement("div", { className: "space-y-6" },
                                React.createElement("div", { className: "grid grid-cols-2 gap-8" },
                                    React.createElement(SliderInput, { label: "Adult", value: leisureMix.adult, onChange: v => updateMix('adult', v), min: 0, max: 100, unit: "%", colorClass: "text-indigo-600" }),
                                    React.createElement(SliderInput, { label: "Pensioner", value: leisureMix.pensioner, onChange: v => updateMix('pensioner', v), min: 0, max: 100, unit: "%", colorClass: "text-indigo-600" })
                                ),
                                React.createElement("div", { className: "grid grid-cols-2 gap-8" },
                                    React.createElement(SliderInput, { label: "Youth", value: leisureMix.youth, onChange: v => updateMix('youth', v), min: 0, max: 100, unit: "%", colorClass: "text-indigo-600" }),
                                    React.createElement(SliderInput, { label: "Child", value: leisureMix.child, onChange: v => updateMix('child', v), min: 0, max: 100, unit: "%", colorClass: "text-indigo-600" })
                                ),
                                React.createElement("div", { className: "bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center" },
                                    React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-tight" },
                                        `Total Weight: ${leisureMix.adult + leisureMix.pensioner + leisureMix.youth + leisureMix.child}% `,
                                        React.createElement("span", { className: "text-slate-300 italic font-normal" }, "(Normalized in real-time)")
                                    )
                                )
                            )
                        )
                    )
                )
            ),

            // SCENARIO
            React.createElement("div", { className: "max-w-6xl mx-auto mb-8 animate-fade-in", style: { animationDelay: '0.2s' } },
                React.createElement(Card, { className: "border-l-4 border-l-yellow-400 overflow-hidden" },
                    React.createElement("div", { className: "bg-yellow-50/50 px-6 py-4 border-b border-yellow-100 flex justify-between items-center" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                            React.createElement(Settings, { className: "w-5 h-5 text-yellow-600" }),
                            React.createElement("h2", { className: "font-black uppercase text-xs tracking-widest text-yellow-800" }, "Simulation Levers & Assumptions")
                        ),
                        React.createElement("div", { className: "flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-yellow-200" },
                            React.createElement("label", { className: "text-[10px] font-black text-yellow-800 uppercase" }, "Activate Scenario"),
                            React.createElement("input", { type: "checkbox", checked: scenario.active, onChange: e => setScenario({ ...scenario, active: e.target.checked }), className: "w-4 h-4 accent-yellow-500 cursor-pointer" })
                        )
                    ),
                    React.createElement("div", { className: "p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start" },
                        React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", null,
                                React.createElement("label", { className: "block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2" }, "Feature / Label"),
                                React.createElement("input", { type: "text", value: scenario.name, onChange: e => setScenario({ ...scenario, name: e.target.value }), className: "w-full border border-slate-200 rounded-lg p-3 text-sm font-bold bg-white focus:ring-2 focus:ring-yellow-400/20 outline-none" })
                            ),
                            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5" }, "Channel"),
                                    React.createElement("select", { value: scenario.targetChannel, onChange: e => setScenario({ ...scenario, targetChannel: e.target.value }), className: "w-full border border-slate-100 rounded-lg p-2 text-[11px] font-bold bg-slate-50 uppercase tracking-tighter" },
                                        React.createElement("option", { value: "all" }, "Global (All)"),
                                        React.createElement("option", { value: "web" }, "Website"),
                                        React.createElement("option", { value: "app" }, "App"),
                                        React.createElement("option", { value: "kiosk" }, "Kiosks")
                                    )
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", { className: "block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5" }, "Segment"),
                                    React.createElement("select", { value: scenario.targetSegment, onChange: e => setScenario({ ...scenario, targetSegment: e.target.value }), className: "w-full border border-slate-100 rounded-lg p-2 text-[11px] font-bold bg-slate-50 uppercase tracking-tighter" },
                                        React.createElement("option", { value: "both" }, "Both"),
                                        React.createElement("option", { value: "leisure" }, "Leisure"),
                                        React.createElement("option", { value: "business" }, "Business")
                                    )
                                )
                            )
                        ),
                        React.createElement("div", { className: "lg:col-span-2 bg-slate-50/50 rounded-xl p-6 border border-slate-100" },
                            React.createElement("div", { className: "grid grid-cols-2 gap-12" },
                                React.createElement("div", null,
                                    React.createElement(SliderInput, {
                                        label: "Yield Impact (Price)",
                                        value: scenario.yieldImpact,
                                        onChange: v => setScenario({ ...scenario, yieldImpact: v }),
                                        min: -50, max: 50, step: 5, unit: "%",
                                        tooltip: "Positive values simulate price increases. Negative values simulate discounts.",
                                        colorClass: "text-rose-500"
                                    }),
                                    React.createElement("div", { className: "bg-white p-2 rounded-lg text-center mt-2 border border-slate-100 shadow-sm" },
                                        React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, scenario.yieldImpact < 0 ? "📉 Yield Erosion" : scenario.yieldImpact > 0 ? "📈 Yield Accretion" : "Yield Neutral")
                                    )
                                ),
                                React.createElement("div", null,
                                    React.createElement(SliderInput, {
                                        label: "Conversion (Elasticity)",
                                        value: scenario.crImpact,
                                        onChange: v => setScenario({ ...scenario, crImpact: v }),
                                        min: -50, max: 100, step: 5, unit: "%",
                                        tooltip: "Simulates traffic/conversion uplift as a result of the scenario.",
                                        colorClass: "text-emerald-500"
                                    }),
                                    React.createElement("div", { className: "bg-white p-2 rounded-lg text-center mt-2 border border-slate-100 shadow-sm" },
                                        React.createElement("span", { className: "text-[10px] font-bold text-slate-400 uppercase" }, scenario.crImpact > 0 ? "🚀 Volume Growth" : scenario.crImpact < 0 ? "⚠️ Volume Loss" : "Volume Stable")
                                    )
                                )
                            )
                        ),
                        React.createElement("div", { className: "h-full bg-yellow-400 rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-lg shadow-yellow-100" },
                            React.createElement("div", { className: "text-[10px] text-slate-900 font-black uppercase mb-1" }, "Scope Targeting"),
                            React.createElement("div", { className: "text-xl font-black text-slate-900 leading-tight mb-2" },
                                scenario.targetChannel === 'all' ? 'Entire Fleet' : INITIAL_CHANNELS[scenario.targetChannel].name
                            ),
                            React.createElement("div", { className: "bg-slate-900 text-yellow-400 text-[10px] font-black px-3 py-1 rounded-full uppercase italic" },
                                `Targeting: ${scenario.targetSegment}`
                            )
                        )
                    )
                )
            ),

            // IMPACT DASHBOARD
            React.createElement("div", { className: "max-w-6xl mx-auto mb-12 animate-fade-in", style: { animationDelay: '0.3s' } },
                React.createElement("div", { className: "flex justify-between items-center mb-6" },
                    React.createElement("h3", { className: "text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2" },
                        React.createElement(Calendar, { className: "w-4 h-4" }), "Scenario Impact Forecast"
                    ),
                    React.createElement("div", { className: "h-[1px] flex-1 mx-6 bg-slate-200" }),
                    React.createElement("span", { className: "text-[10px] font-bold text-slate-300 italic" }, "*Projections based on monthly baselines")
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                    // Week
                    React.createElement(Card, { className: "p-6" },
                        React.createElement("div", { className: "text-[10px] font-black text-slate-400 uppercase mb-4" }, "1 Week Impact"),
                        React.createElement("div", { className: "space-y-4" },
                            React.createElement("div", { className: "flex justify-between items-end border-b border-slate-50 pb-2" },
                                React.createElement("span", { className: "text-xs font-bold text-slate-500" }, "Total PAX"),
                                React.createElement("div", { className: `text-xl font-black ${(results.simulated.pax - results.baseline.pax) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiff((results.simulated.pax - results.baseline.pax) * 0.25))
                            ),
                            React.createElement("div", { className: "flex justify-between items-end" },
                                React.createElement("span", { className: "text-xs font-bold text-slate-500" }, "Rev Delta"),
                                React.createElement("div", { className: `text-xl font-black ${(results.simulated.revenue - results.baseline.revenue) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiffSEK((results.simulated.revenue - results.baseline.revenue) * 0.25))
                            )
                        )
                    ),
                    // Month
                    React.createElement(Card, { className: "p-6 relative overflow-hidden border-2 border-slate-800" },
                        React.createElement("div", { className: "absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest" }, "Strategic View"),
                        React.createElement("div", { className: "text-[10px] font-black text-slate-400 uppercase mb-4" }, "1 Month Growth"),
                        React.createElement("div", { className: "space-y-4" },
                            React.createElement("div", { className: "flex justify-between items-end border-b border-slate-100 pb-2" },
                                React.createElement("div", null,
                                    React.createElement("span", { className: "text-xs font-bold text-slate-500 block" }, "PAX Delta"),
                                    React.createElement("span", { className: "text-[10px] text-slate-300 font-bold" }, fmtNum(results.simulated.pax), " Total")
                                ),
                                React.createElement("div", { className: `text-2xl font-black ${(results.simulated.pax - results.baseline.pax) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiff(results.simulated.pax - results.baseline.pax))
                            ),
                            React.createElement("div", { className: "flex justify-between items-end" },
                                React.createElement("div", null,
                                    React.createElement("span", { className: "text-xs font-bold text-slate-500 block" }, "Revenue Delta"),
                                    React.createElement("span", { className: "text-[10px] text-slate-300 font-bold" }, fmtSEK(results.simulated.revenue), " Total")
                                ),
                                React.createElement("div", { className: `text-2xl font-black ${(results.simulated.revenue - results.baseline.revenue) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiffSEK(results.simulated.revenue - results.baseline.revenue))
                            )
                        )
                    ),
                    // Year
                    React.createElement(Card, { className: "p-6" },
                        React.createElement("div", { className: "text-[10px] font-black text-slate-400 uppercase mb-4" }, "Annualized Forecast"),
                        React.createElement("div", { className: "space-y-4" },
                            React.createElement("div", { className: "flex justify-between items-end border-b border-slate-50 pb-2" },
                                React.createElement("span", { className: "text-xs font-bold text-slate-500" }, "Proj. PAX"),
                                React.createElement("div", { className: `text-xl font-black ${(results.simulated.pax - results.baseline.pax) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiff((results.simulated.pax - results.baseline.pax) * 12))
                            ),
                            React.createElement("div", { className: "flex justify-between items-end" },
                                React.createElement("span", { className: "text-xs font-bold text-slate-500" }, "Proj. Revenue"),
                                React.createElement("div", { className: `text-xl font-black ${(results.simulated.revenue - results.baseline.revenue) >= 0 ? 'text-emerald-500' : 'text-rose-500'}` }, fmtDiffSEK((results.simulated.revenue - results.baseline.revenue) * 12))
                            )
                        )
                    )
                )
            ),

            // CHANNELS
            React.createElement("div", { className: "max-w-6xl mx-auto animate-fade-in", style: { animationDelay: '0.4s' } },
                React.createElement("div", { className: "flex items-center gap-3 mb-6" },
                    React.createElement(PieChart, { className: "w-5 h-5 text-slate-400" }),
                    React.createElement("h3", { className: "text-xs font-black uppercase text-slate-700 tracking-widest" }, "Channel Granularity")
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8" },
                    Object.values(channels).map(channel => {
                        const metrics = results.channelDetails[channel.id];
                        const isImpacted = scenario.active && (scenario.targetChannel === 'all' || scenario.targetChannel === channel.id);
                        return React.createElement(Card, { key: channel.id, className: `overflow-hidden border-t-4 ${channel.id === 'web' ? 'border-t-slate-800' : channel.id === 'app' ? 'border-t-slate-600' : 'border-t-slate-400'} ${isImpacted ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}` },
                            React.createElement("div", { className: "px-6 py-4 border-b border-slate-50 flex justify-between items-center" },
                                React.createElement("span", { className: "text-sm font-black text-slate-800 uppercase italic tracking-tight" }, channel.name),
                                isImpacted && React.createElement("span", { className: "bg-yellow-400 text-slate-900 text-[8px] font-black px-2 py-0.5 rounded italic uppercase" }, "Scenario Active")
                            ),
                            React.createElement("div", { className: "p-6 space-y-8" },
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-50 pb-1" }, "Inbound Volume"),
                                    React.createElement(NumberInput, { label: "Monthly Traffic", value: channel.traffic, onChange: v => updateChannel(channel.id, 'traffic', v) }),
                                    React.createElement("div", { className: "bg-slate-50/50 p-4 rounded-lg flex justify-between items-center border border-slate-100" },
                                        React.createElement("div", { className: "w-1/2" },
                                            React.createElement(NumberInput, { label: "Baseline CR", value: channel.cr, onChange: v => updateChannel(channel.id, 'cr', v), unit: "%" })
                                        ),
                                        (isImpacted && metrics.sim.effectiveCR !== metrics.base.effectiveCR) && React.createElement("div", { className: "animate-pulse" },
                                            React.createElement("p", { className: "text-[9px] font-black text-slate-400 uppercase text-right mb-1" }, "Simulated"),
                                            React.createElement("p", { className: "text-sm font-black text-indigo-500 text-right" }, `${metrics.sim.effectiveCR.toFixed(1)}%`)
                                        )
                                    )
                                ),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-50 pb-1" }, "Traffic Quality"),
                                    React.createElement(SliderInput, {
                                        label: "Biz / Lei Mix",
                                        value: channel.bizShare,
                                        onChange: v => updateChannel(channel.id, 'bizShare', v),
                                        min: 0, max: 100, unit: "%",
                                        colorClass: "text-slate-800"
                                    }),
                                    React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[10px] font-black text-center mt-3 uppercase tracking-tighter" },
                                        React.createElement("div", { className: "bg-slate-100/50 p-2 rounded text-slate-500 border border-slate-50" }, `Business: ${channel.bizShare}%`),
                                        React.createElement("div", { className: "bg-orange-50/50 p-2 rounded text-orange-600 border border-orange-50" }, `Leisure: ${100 - channel.bizShare}%`)
                                    )
                                ),
                                React.createElement("div", null,
                                    React.createElement("h4", { className: "text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-50 pb-1" }, "Purchase Behavior"),
                                    React.createElement(SliderInput, { label: "Return Ticket Rate", value: channel.returnMix, onChange: v => updateChannel(channel.id, 'returnMix', v), min: 0, max: 100, unit: "%", colorClass: "text-slate-800" }),
                                    React.createElement(SliderInput, { label: "Group Size Avg", value: channel.avgGroupSize, onChange: v => updateChannel(channel.id, 'avgGroupSize', v), min: 1.0, max: 4.0, step: 0.1, colorClass: "text-slate-800" })
                                ),
                                React.createElement("div", { className: "bg-slate-900 px-4 py-4 rounded-xl shadow-xl shadow-slate-200 space-y-3" },
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-[9px] font-black text-slate-500 uppercase italic" }, "Modelled PAX Volume"),
                                        React.createElement("div", { className: "text-right" },
                                            React.createElement("span", { className: "text-sm font-black text-white block" }, fmtNum(metrics.sim.totalPax)),
                                            isImpacted && metrics.sim.totalPax !== metrics.base.totalPax &&
                                            React.createElement("span", { className: `text-[10px] font-bold ${metrics.sim.totalPax > metrics.base.totalPax ? 'text-emerald-400' : 'text-rose-400'}` }, `${fmtDiff(metrics.sim.totalPax - metrics.base.totalPax)}`)
                                        )
                                    ),
                                    React.createElement("div", { className: "h-[1px] bg-slate-800" }),
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-[9px] font-black text-slate-500 uppercase italic" }, "Modelled Revenue"),
                                        React.createElement("div", { className: "text-right" },
                                            React.createElement("span", { className: "text-sm font-black text-yellow-400 block tracking-tighter" }, fmtSEK(metrics.sim.revenue)),
                                            isImpacted && metrics.sim.revenue !== metrics.base.revenue &&
                                            React.createElement("span", { className: `text-[10px] font-bold ${metrics.sim.revenue > metrics.base.revenue ? 'text-emerald-400' : 'text-rose-400'}` }, `${fmtDiffSEK(metrics.sim.revenue - metrics.base.revenue)}`)
                                        )
                                    )
                                )
                            )
                        );
                    })
                )
            ),

            // SUMMARY TABLE
            React.createElement("div", { className: "max-w-6xl mx-auto mt-12 animate-fade-in", style: { animationDelay: '0.5s' } },
                React.createElement(Card, { className: "bg-slate-900 border-none rounded-2xl overflow-hidden shadow-2xl" },
                    React.createElement("div", { className: "p-10" },
                        React.createElement("div", { className: "flex items-center gap-3 mb-10" },
                            React.createElement(TrendingUp, { className: "w-6 h-6 text-yellow-400" }),
                            React.createElement("h3", { className: "text-lg font-black text-white uppercase tracking-widest italic" }, "Aggregated Monthly Impact Breakdown")
                        ),
                        React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-16" },
                            // PAX COLUMN
                            React.createElement("div", null,
                                React.createElement("div", { className: "flex justify-between items-end border-b border-slate-800 pb-4 mb-6" },
                                    React.createElement("span", { className: "text-slate-500 text-[10px] font-black uppercase tracking-widest" }, "Metric Flow"),
                                    React.createElement("span", { className: "text-slate-500 text-[10px] font-black uppercase tracking-widest" }, "Boardings (PAX)")
                                ),
                                React.createElement("div", { className: "space-y-4" },
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-slate-400 text-sm font-bold" }, "Baseline Status Quo"),
                                        React.createElement("span", { className: "text-xl font-black text-white" }, fmtNum(results.baseline.pax))
                                    ),
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-slate-400 text-sm font-bold" }, "Simulated Outcome"),
                                        React.createElement("span", { className: "text-xl font-black text-yellow-400" }, fmtNum(results.simulated.pax))
                                    ),
                                    React.createElement("div", { className: "h-[1px] bg-slate-800 my-4" }),
                                    React.createElement("div", { className: "flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-800" },
                                        React.createElement("span", { className: "text-xs font-black text-white uppercase italic" }, "Net Volume Delta"),
                                        React.createElement("span", { className: `text-2xl font-black ${(results.simulated.pax - results.baseline.pax) >= 0 ? 'text-emerald-400' : 'text-rose-400'}` },
                                            fmtDiff(results.simulated.pax - results.baseline.pax)
                                        )
                                    )
                                )
                            ),
                            // REVENUE COLUMN
                            React.createElement("div", null,
                                React.createElement("div", { className: "flex justify-between items-end border-b border-slate-800 pb-4 mb-6" },
                                    React.createElement("span", { className: "text-slate-500 text-[10px] font-black uppercase tracking-widest" }, "Metric Flow"),
                                    React.createElement("span", { className: "text-slate-500 text-[10px] font-black uppercase tracking-widest" }, "Yield (SEK)")
                                ),
                                React.createElement("div", { className: "space-y-4" },
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-slate-400 text-sm font-bold" }, "Baseline Status Quo"),
                                        React.createElement("span", { className: "text-xl font-black text-white tracking-tighter" }, fmtSEK(results.baseline.revenue))
                                    ),
                                    React.createElement("div", { className: "flex justify-between items-center" },
                                        React.createElement("span", { className: "text-slate-400 text-sm font-bold" }, "Simulated Outcome"),
                                        React.createElement("span", { className: "text-xl font-black text-yellow-400 tracking-tighter" }, fmtSEK(results.simulated.revenue))
                                    ),
                                    React.createElement("div", { className: "h-[1px] bg-slate-800 my-4" }),
                                    React.createElement("div", { className: "flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-800" },
                                        React.createElement("span", { className: "text-xs font-black text-white uppercase italic" }, "Net Revenue Delta"),
                                        React.createElement("span", { className: `text-2xl font-black ${(results.simulated.revenue - results.baseline.revenue) >= 0 ? 'text-emerald-400' : 'text-rose-400'}` },
                                            fmtDiffSEK(results.simulated.revenue - results.baseline.revenue)
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ),

            // LOGIC FOOTER
            React.createElement("footer", { className: "max-w-6xl mx-auto mt-20 pt-10 border-t border-slate-200 pb-20" },
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-12" },
                    React.createElement("div", null,
                        React.createElement("h4", { className: "text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2" },
                            React.createElement(Info, { className: "w-4 h-4 text-indigo-500" }), "Model Methodology"
                        ),
                        React.createElement("div", { className: "space-y-4 text-xs text-slate-400 font-bold leading-relaxed tracking-tight" },
                            React.createElement("p", null, "1. YIELD: Derived from weighted average transaction price across Adult/Pensioner/Youth/Child segments based on configured demographic mix."),
                            React.createElement("p", null, "2. PAX COUNT: Calculated as: Transactions × Group Size × ((ReturnMix% × 2) + (Single% × 1))."),
                            React.createElement("p", null, "3. SIMULATION: Applies percentage-based modifiers to Yield and Conversion rates specifically for targeted sub-segments.")
                        )
                    ),
                    React.createElement("div", { className: "text-right flex flex-col items-end justify-end" },
                        React.createElement("p", { className: "text-[10px] font-black text-slate-300 uppercase italic" }, "Arlanda Express Strategy Lab"),
                        React.createElement("p", { className: "text-[9px] text-slate-200 italic" }, "Built for Product & Revenue Analytics v2.4")
                    )
                )
            )
        )
    );
}

// --- RENDER ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(React.createElement(RevenueModeler));
}
