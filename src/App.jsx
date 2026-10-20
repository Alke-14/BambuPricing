import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Clock,
  Scale,
  Layers,
  Settings2,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  Wrench,
  Sparkles,
  Info,
  ShieldCheck,
  Box,
  Zap,
  Tag,
  Sliders,
  HelpCircle
} from 'lucide-react';

const STORAGE_KEY = 'bambu_p1s_shop_settings_v1';

const DEFAULT_SETTINGS = {
  machineRatePerHour: 1.00,       // $1.00/hr (wear + electricity for Bambu Lab P1S)
  laborRatePerHour: 18.00,        // $18.00/hr
  swapTimePerPlateMins: 5,        // 5 mins per plate swap
  failureBufferPercent: 8,        // 8% buffer for purges, calibration & fails
  standardMarkupMultiplier: 2.0,  // 2.0x for catalog / inventory batches
  commissionMarkupMultiplier: 2.6 // 2.6x for 1-off custom commissions
};

const FILAMENT_PRESETS = [
  { id: 'standard', name: 'Standard PLA / PETG', pricePerKg: 20 },
  { id: 'specialty', name: 'Specialty / Matte / Silk PLA', pricePerKg: 26 },
  { id: 'engineering', name: 'Engineering ASA / ABS / TPU', pricePerKg: 35 },
  { id: 'custom', name: 'Custom Filament...', pricePerKg: 25 },
];

export default function App() {
  // Load shop settings from localStorage or fallback to defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to read settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Settings drawer state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);

  // Job reactive inputs
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [presetId, setPresetId] = useState('standard');
  const [customPricePerKg, setCustomPricePerKg] = useState('25.00');
  const [plates, setPlates] = useState('1');
  const [jobType, setJobType] = useState('standard'); // 'standard' | 'commission'

  // Clipboard & feedback states
  const [copied, setCopied] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  // Persist settings whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    const num = parseFloat(value);
    setSettings((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num),
    }));
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 2000);
  };

  const resetSettingsToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 2000);
  };

  // Job inputs reset
  const handleResetJob = () => {
    setHours('');
    setMinutes('');
    setWeightGrams('');
    setPresetId('standard');
    setCustomPricePerKg('25.00');
    setPlates('1');
    setJobType('standard');
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 2000);
  };

  // Calculations
  const calculations = useMemo(() => {
    const h = Math.max(0, parseFloat(hours) || 0);
    const m = Math.max(0, parseFloat(minutes) || 0);
    const w = Math.max(0, parseFloat(weightGrams) || 0);
    const p = Math.max(1, parseInt(plates, 10) || 1);

    // Active filament price
    let filamentPrice = 20;
    if (presetId === 'custom') {
      filamentPrice = Math.max(0, parseFloat(customPricePerKg) || 0);
    } else {
      const found = FILAMENT_PRESETS.find((item) => item.id === presetId);
      filamentPrice = found ? found.pricePerKg : 20;
    }

    // Material Cost = (Weight in grams / 1000) * Filament $/kg
    const materialCost = (w / 1000) * filamentPrice;

    // Total Print Hours = Hours + (Minutes / 60)
    const totalPrintHours = h + m / 60;

    // Machine Cost = Total Print Hours * Machine Rate ($/hr)
    const machineCost = totalPrintHours * settings.machineRatePerHour;

    // Hands-on Labor Time = (Plates * Swap Time per plate) + Base Setup (5 mins)
    const baseSetupMins = 5;
    const laborMinutes = (p * settings.swapTimePerPlateMins) + baseSetupMins;

    // Labor Cost = (Labor Minutes / 60) * Labor Rate ($/hr)
    const laborCost = (laborMinutes / 60) * settings.laborRatePerHour;

    // Subtotal = Material Cost + Machine Cost + Labor Cost
    const subtotal = materialCost + machineCost + laborCost;

    // Total Base Cost = Subtotal * (1 + Failure Buffer %)
    const failureBufferFactor = settings.failureBufferPercent / 100;
    const failureBufferCost = subtotal * failureBufferFactor;
    const totalBaseCost = subtotal + failureBufferCost;

    // Active Markup Multiplier
    const activeMultiplier =
      jobType === 'commission'
        ? settings.commissionMarkupMultiplier
        : settings.standardMarkupMultiplier;

    // Suggested Retail Price
    const exactRetailPrice = totalBaseCost * activeMultiplier;
    const suggestedRetailPriceRounded = Math.round(exactRetailPrice);
    const netProfitExact = exactRetailPrice - totalBaseCost;
    const netProfitRounded = suggestedRetailPriceRounded - totalBaseCost;
    const profitMargin = exactRetailPrice > 0 ? (netProfitExact / exactRetailPrice) * 100 : 0;

    // Visual breakdown percentages based on raw subtotal
    const subtotalSafe = subtotal > 0 ? subtotal : 1;
    const materialPct = subtotal > 0 ? (materialCost / subtotalSafe) * 100 : 33.33;
    const machinePct = subtotal > 0 ? (machineCost / subtotalSafe) * 100 : 33.33;
    const laborPct = subtotal > 0 ? (laborCost / subtotalSafe) * 100 : 33.34;

    return {
      filamentPrice,
      totalPrintHours,
      laborMinutes,
      materialCost,
      machineCost,
      laborCost,
      subtotal,
      failureBufferCost,
      totalBaseCost,
      activeMultiplier,
      exactRetailPrice,
      suggestedRetailPriceRounded,
      netProfitExact,
      netProfitRounded,
      profitMargin,
      materialPct,
      machinePct,
      laborPct,
      hasInputs: h > 0 || m > 0 || w > 0,
      activePresetName:
        presetId === 'custom'
          ? `Custom ($${filamentPrice.toFixed(2)}/kg)`
          : FILAMENT_PRESETS.find((item) => item.id === presetId)?.name || 'Custom',
    };
  }, [hours, minutes, weightGrams, presetId, customPricePerKg, plates, jobType, settings]);

  // Quick Copy Quote Handler
  const handleCopyQuote = async () => {
    const quoteText = [
      `========================================`,
      `  3D PRINT QUOTE — BAMBU LAB P1S`,
      `========================================`,
      `Job Type:        ${jobType === 'commission' ? 'Custom Commission' : 'Standard / Catalog Run'}`,
      `Print Time:      ${hours || 0}h ${minutes || 0}m (${calculations.totalPrintHours.toFixed(2)} hrs total)`,
      `Plates:          ${plates || 1} plate(s)`,
      `Filament:        ${calculations.activePresetName} (${weightGrams || 0}g)`,
      `----------------------------------------`,
      `COST BREAKDOWN:`,
      `• Material Cost:   $${calculations.materialCost.toFixed(2)}`,
      `• Machine & Power: $${calculations.machineCost.toFixed(2)} (${calculations.totalPrintHours.toFixed(2)}h @ $${settings.machineRatePerHour.toFixed(2)}/hr)`,
      `• Labor & Prep:    $${calculations.laborCost.toFixed(2)} (${calculations.laborMinutes}m @ $${settings.laborRatePerHour.toFixed(2)}/hr)`,
      `• Buffer (${settings.failureBufferPercent}%):    $${calculations.failureBufferCost.toFixed(2)}`,
      `----------------------------------------`,
      `Base Shop Cost:    $${calculations.totalBaseCost.toFixed(2)}`,
      `Markup:            ${calculations.activeMultiplier.toFixed(1)}x`,
      `----------------------------------------`,
      `SUGGESTED RETAIL:  $${calculations.suggestedRetailPriceRounded} ($${calculations.exactRetailPrice.toFixed(2)} exact)`,
      `Estimated Profit:  $${calculations.netProfitRounded.toFixed(2)} (~${calculations.profitMargin.toFixed(0)}% margin)`,
      `========================================`,
      `Generated by Bambu Lab P1S Pricing Calculator`,
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(quoteText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = quoteText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy quote', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-bambu-500 selection:text-white pb-12">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bambu-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-bambu-500/20 ring-1 ring-bambu-400/40">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">PrintCost Pro</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-bambu-500/20 text-bambu-400 border border-bambu-500/30">
                  Bambu Lab P1S
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Precision 3D Print Pricing & Shop Margin Calculator
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                showSettings
                  ? 'bg-bambu-500/20 text-bambu-300 border-bambu-500/50 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
              title="Configure Shop Rates"
            >
              <Settings2 className="w-4 h-4 text-bambu-400" />
              <span>Shop Settings</span>
              {showSettings ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            <button
              onClick={handleResetJob}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
              title="Reset job inputs to defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Job</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full space-y-6">
        {/* Global Notifications */}
        {resetNotice && (
          <div className="p-3 bg-slate-900 border border-slate-700 text-slate-300 text-xs sm:text-sm rounded-lg flex items-center justify-between animate-fadeIn shadow-md">
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              Job inputs have been reset to zero. Your shop settings remain intact.
            </span>
          </div>
        )}

        {/* Collapsible Shop Settings Drawer */}
        {showSettings && (
          <section className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-800/80 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-bambu-400" />
                    Bambu Lab P1S Shop Configuration
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Saved locally in browser
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust default machine, electricity, labor, and profit margins. These persist across all sessions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {settingsSavedNotice && (
                  <span className="text-xs text-bambu-400 flex items-center gap-1 font-medium bg-bambu-950/60 border border-bambu-800/50 px-2.5 py-1 rounded-md">
                    <Check className="w-3.5 h-3.5" /> Auto-saved
                  </span>
                )}
                <button
                  onClick={resetSettingsToDefault}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  Restore Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              {/* Machine Rate */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Machine Wear & Power Rate ($/hr)</span>
                  <span className="text-bambu-400 font-mono">${settings.machineRatePerHour.toFixed(2)}/hr</span>
                </label>
                <div className="relative mt-2">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={settings.machineRatePerHour}
                    onChange={(e) => updateSetting('machineRatePerHour', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  P1S draws ~150W avg ($0.03/hr @ $0.16/kWh) + depreciation & belts/nozzles replacement (~$0.97/hr).
                </p>
              </div>

              {/* Labor Rate */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Shop Labor Rate ($/hr)</span>
                  <span className="text-bambu-400 font-mono">${settings.laborRatePerHour.toFixed(2)}/hr</span>
                </label>
                <div className="relative mt-2">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    value={settings.laborRatePerHour}
                    onChange={(e) => updateSetting('laborRatePerHour', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Hourly rate for slicing, bed scraping, plate cleaning, and part inspection.
                </p>
              </div>

              {/* Swap Time Per Plate */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Plate Swap / Prep Time (Minutes)</span>
                  <span className="text-bambu-400 font-mono">{settings.swapTimePerPlateMins} mins</span>
                </label>
                <div className="relative mt-2">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={settings.swapTimePerPlateMins}
                    onChange={(e) => updateSetting('swapTimePerPlateMins', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Hands-on time spent per plate swap (+ 5m initial job setup).
                </p>
              </div>

              {/* Failure Buffer */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Purge & Failure Buffer (%)</span>
                  <span className="text-bambu-400 font-mono">{settings.failureBufferPercent}%</span>
                </label>
                <div className="relative mt-2">
                  <Percent className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={settings.failureBufferPercent}
                    onChange={(e) => updateSetting('failureBufferPercent', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Accounts for prime towers, purge poop (AMS), nozzle wipes, and occasional failed starts.
                </p>
              </div>

              {/* Standard Markup */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Standard Run Markup Multiplier</span>
                  <span className="text-bambu-400 font-mono">{settings.standardMarkupMultiplier.toFixed(1)}x</span>
                </label>
                <div className="relative mt-2">
                  <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={settings.standardMarkupMultiplier}
                    onChange={(e) => updateSetting('standardMarkupMultiplier', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Default multiplier for catalog products, recurring batch prints, or inventory.
                </p>
              </div>

              {/* Custom Commission Markup */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Custom Commission Multiplier</span>
                  <span className="text-bambu-400 font-mono">{settings.commissionMarkupMultiplier.toFixed(1)}x</span>
                </label>
                <div className="relative mt-2">
                  <Sparkles className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={settings.commissionMarkupMultiplier}
                    onChange={(e) => updateSetting('commissionMarkupMultiplier', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-medium focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Accounts for communication overhead, file inspection, orientation tweaks, and client revisions.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Reactive Job Inputs */}
          <div className="lg:col-span-7 space-y-5">
            {/* Job Type Toggle Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Job Type & Pricing Tier
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setJobType('standard')}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    jobType === 'standard'
                      ? 'bg-bambu-500 text-white shadow-md shadow-bambu-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  <span>Standard / Catalog</span>
                  <span className="text-[11px] opacity-80 font-mono">({settings.standardMarkupMultiplier.toFixed(1)}x)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJobType('commission')}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    jobType === 'commission'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Custom Commission</span>
                  <span className="text-[11px] opacity-80 font-mono">({settings.commissionMarkupMultiplier.toFixed(1)}x)</span>
                </button>
              </div>
            </div>

            {/* Print Parameters Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-bambu-400" />
                  Bambu Studio Slicer Estimates
                </h3>
                <span className="text-[11px] text-slate-400">Values from slicer summary</span>
              </div>

              {/* Print Time Inputs */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-bambu-400" />
                    Print Time Duration
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {calculations.totalPrintHours.toFixed(2)} hrs
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-mono text-base focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                      HOURS
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-mono text-base focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                      MINUTES
                    </span>
                  </div>
                </div>

                {/* Quick Time Shortcuts */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[11px] text-slate-500 self-center mr-1">Quick Add:</span>
                  {[
                    { label: '+30m', h: 0, m: 30 },
                    { label: '+1h', h: 1, m: 0 },
                    { label: '+3h', h: 3, m: 0 },
                    { label: '+6h', h: 6, m: 0 },
                    { label: '+12h', h: 12, m: 0 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const curH = parseInt(hours || '0', 10);
                        const curM = parseInt(minutes || '0', 10);
                        let nextM = curM + btn.m;
                        let nextH = curH + btn.h + Math.floor(nextM / 60);
                        nextM = nextM % 60;
                        setHours(String(nextH));
                        setMinutes(String(nextM));
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setHours('');
                      setMinutes('');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-800/40 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filament Weight Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-bambu-400" />
                    Filament Used (Grams)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {weightGrams ? `${(parseFloat(weightGrams) / 1000).toFixed(3)} kg` : '0.000 kg'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 145"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-mono text-base focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                    GRAMS
                  </span>
                </div>

                {/* Quick Weight Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[11px] text-slate-500 self-center mr-1">Presets:</span>
                  {[50, 100, 200, 350, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWeightGrams(String(amt))}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                    >
                      {amt}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Filament Preset Dropdown & Custom Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-bambu-400" />
                    Filament Type / Cost Preset
                  </span>
                  <span className="text-xs text-bambu-400 font-mono font-medium">
                    ${calculations.filamentPrice.toFixed(2)} / kg
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className={presetId === 'custom' ? 'sm:col-span-7' : 'sm:col-span-12'}>
                    <select
                      value={presetId}
                      onChange={(e) => setPresetId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500 appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1.2em',
                      }}
                    >
                      {FILAMENT_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                          {preset.name} {preset.id !== 'custom' ? `($${preset.pricePerKg}/kg)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {presetId === 'custom' && (
                    <div className="sm:col-span-5 relative">
                      <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Price / kg"
                        value={customPricePerKg}
                        onChange={(e) => setCustomPricePerKg(e.target.value)}
                        className="w-full bg-slate-950 border border-bambu-500/50 rounded-xl pl-9 pr-14 py-3 text-white font-mono text-sm focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                        / KG
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Number of Plates */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-bambu-400" />
                    Number of Build Plates
                  </span>
                  <span className="text-xs text-slate-400">
                    Prep & Swap Labor: {calculations.laborMinutes} mins total
                  </span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="1"
                      value={plates}
                      onChange={(e) => setPlates(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-base focus:border-bambu-500 focus:outline-none focus:ring-1 focus:ring-bambu-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                      {parseInt(plates, 10) === 1 ? 'PLATE' : 'PLATES'}
                    </span>
                  </div>
                  <div className="flex space-x-1.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlates(String(num))}
                        className={`w-10 h-11 rounded-xl text-xs font-bold border transition-all ${
                          parseInt(plates, 10) === num
                            ? 'bg-bambu-500/20 border-bambu-500 text-bambu-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  5 min base slicing/prep + {settings.swapTimePerPlateMins} min per plate for removing parts, cleaning textured PEI, and reloading.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Results & Output Cards */}
          <div className="lg:col-span-5 space-y-5">
            {/* Primary Retail Price Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-bambu-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden ring-1 ring-bambu-500/10">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-bambu-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-bambu-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Suggested Retail Price
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80 font-medium">
                  {calculations.activeMultiplier.toFixed(1)}x Markup
                </span>
              </div>

              {/* Big Hero Number */}
              <div className="flex items-baseline space-x-2 my-2">
                <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                  ${calculations.suggestedRetailPriceRounded}
                </span>
                <span className="text-sm sm:text-base text-slate-400 font-mono">
                  (${calculations.exactRetailPrice.toFixed(2)} exact)
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Suggested price rounded to the nearest whole dollar for clean customer quoting.
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Base Production Cost
                  </span>
                  <span className="text-xl font-bold text-slate-200 font-mono">
                    ${calculations.totalBaseCost.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Includes {settings.failureBufferPercent}% failure buffer
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Net Profit ({calculations.profitMargin.toFixed(0)}% margin)
                  </span>
                  <span className="text-xl font-bold text-bambu-400 font-mono">
                    +${calculations.netProfitRounded.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Above all labor & overhead
                  </span>
                </div>
              </div>

              {/* Action Buttons: Quick Copy Quote */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                    copied
                      ? 'bg-bambu-600 text-white ring-2 ring-bambu-400'
                      : 'bg-bambu-500 hover:bg-bambu-600 text-white shadow-bambu-500/25 active:scale-[0.99]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Quote Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Formatted Quote</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Cost Breakdown Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-bambu-400" />
                  Cost Share Distribution
                </h3>
                <span className="text-xs text-slate-400">
                  Subtotal: ${calculations.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex ring-1 ring-slate-800 p-0.5">
                  <div
                    style={{ width: `${calculations.materialPct}%` }}
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                    title={`Material: ${calculations.materialPct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${calculations.machinePct}%` }}
                    className="h-full bg-cyan-500 transition-all duration-300"
                    title={`Machine: ${calculations.machinePct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${calculations.laborPct}%` }}
                    className="h-full bg-indigo-500 rounded-r-full transition-all duration-300"
                    title={`Labor: ${calculations.laborPct.toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 px-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Material ({calculations.materialPct.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    Machine ({calculations.machinePct.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Labor ({calculations.laborPct.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Itemized Line-Item Detail Table */}
              <div className="divide-y divide-slate-800/80 text-xs">
                {/* Material Line */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Scale className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-medium block">Filament Material</span>
                      <span className="text-slate-500 text-[11px]">
                        {weightGrams || 0}g @ ${calculations.filamentPrice.toFixed(2)}/kg
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-200">
                    ${calculations.materialCost.toFixed(2)}
                  </span>
                </div>

                {/* Machine Line */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-medium block">Machine & Power</span>
                      <span className="text-slate-500 text-[11px]">
                        {calculations.totalPrintHours.toFixed(2)} hrs @ ${settings.machineRatePerHour.toFixed(2)}/hr
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-200">
                    ${calculations.machineCost.toFixed(2)}
                  </span>
                </div>

                {/* Labor Line */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-slate-200 font-medium block">Hands-on Labor</span>
                      <span className="text-slate-500 text-[11px]">
                        {calculations.laborMinutes} mins @ ${settings.laborRatePerHour.toFixed(2)}/hr
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-200">
                    ${calculations.laborCost.toFixed(2)}
                  </span>
                </div>

                {/* Failure Buffer Line */}
                <div className="py-2.5 flex items-center justify-between text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-slate-300 font-medium block">Purge & Failure Buffer</span>
                      <span className="text-slate-500 text-[11px]">
                        +{settings.failureBufferPercent}% applied to direct subtotal
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-amber-400">
                    +${calculations.failureBufferCost.toFixed(2)}
                  </span>
                </div>

                {/* Total Base Cost Line */}
                <div className="pt-3 flex items-center justify-between font-medium">
                  <span className="text-slate-300 font-semibold">Total Production Cost</span>
                  <span className="font-mono font-bold text-white text-sm">
                    ${calculations.totalBaseCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* P1S Quick Info Badge */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
              <Info className="w-4 h-4 text-bambu-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300 block mb-0.5">Bambu Lab P1S Specifics:</strong>
                Calculations calibrated for CoreXY speeds (up to 500 mm/s), 256×256×256 mm build volume, average 150W operational power, and standard textured PEI bed swap turnaround.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          Bambu Lab P1S 3D Print Pricing Calculator • Optimized for desktop & mobile
        </p>
        <p className="font-mono text-[11px] text-slate-500">
          Ready for GitHub Pages deployment
        </p>
      </footer>
    </div>
  );
}
