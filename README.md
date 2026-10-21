# Bambu Lab P1S | 3D Print Pricing Calculator

A responsive, modern single-page 3D print pricing and quote generator tailored for the **Bambu Lab P1S** 3D printer. Built with **React**, **Vite**, and **Tailwind CSS**, designed for mobile and desktop, and pre-configured for instant **GitHub Pages** deployment.

---

## ✨ Features

- **⚡ Bambu Lab P1S Calibrated:** Tuned for P1S power profiles (~150W operational), wear/depreciation, and rapid turnaround on textured PEI build plates. Easily customizable for other models (X1C, A1, etc.).
- **⏱ Reactive Slicer Inputs:** Direct input for hours, minutes, filament weight in grams, and multi-plate setups. Quick-add helper buttons (+30m, +1h, presets for weight) speed up data entry.
- **🧵 Filament Presets & Custom Rates:**
  - Standard PLA / PETG ($20/kg)
  - Specialty / Matte / Silk PLA ($26/kg)
  - Engineering ASA / ABS / TPU ($35/kg)
  - Custom ($/kg editable on the fly)
- **🎛 Collapsible Shop Settings (Persisted in `localStorage`):**
  - Machine Wear & Electricity Rate ($1.00/hr default)
  - Shop Labor Rate ($18.00/hr default)
  - Plate Swap / Clean Time (5 mins default)
  - Failure / Purge Buffer (8% default)
  - Standard Multiplier (2.0x default) & Custom Commission Multiplier (2.6x default)
  - "Restore Defaults" button with auto-save indicators
- **📊 Dynamic Cost Share Visualization:** Visual segmented bar chart showing Material vs. Machine vs. Labor shares in real-time.
- **📋 One-Click Quote Copy:** Copies a clean, professional text summary directly to the clipboard for Discord, email, or invoice drafting.
- **🔄 Fast Job Reset:** Resets job parameters to zero without wiping your saved shop rates.
- **🌙 Bambu Dark Aesthetic:** Slate dark theme with Bambu signature green accents and Lucide icons.

---

## 🧮 Calculation Formulas

```text
1. Total Print Hours   = Hours + (Minutes / 60)
2. Material Cost       = (Weight in grams / 1000) * Filament ($/kg)
3. Machine Cost        = Total Print Hours * Machine Rate ($/hr)
4. Hands-on Labor Time = (Plates * Swap Time per plate) + Base Setup (5 mins)
5. Labor Cost          = (Labor Minutes / 60) * Labor Rate ($/hr)
6. Subtotal            = Material Cost + Machine Cost + Labor Cost
7. Total Base Cost     = Subtotal * (1 + Failure Buffer %)
8. Suggested Retail    = Total Base Cost * Active Markup Multiplier (rounded to nearest $1)
```

---

## 🚀 Quick Start

### 1. Run Locally

```bash
# Clone the repository
git clone <repo-url>
cd Bamcu_Calculator

# Install dependencies
npm install

# Start local development server
npm run dev
```

### 2. Build for Production

```bash
npm run build
```
The compiled output is generated in `./dist` with relative paths (`base: './'`), ready to be served from any directory or host.

---
