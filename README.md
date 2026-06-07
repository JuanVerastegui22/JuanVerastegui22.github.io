# Continuous Probability Modeling Lab
## Global Economics · Grade 10 · Term 3 · 2025–2026

**Students:** Juan Verastegui & Juan Cuibes  
**Teacher:** Nicolás López Cuéllar  
**Website:** [www.webpageGlobal_JuanVerastegui_JuanCuibes.com](http://www.webpageGlobal_JuanVerastegui_JuanCuibes.com)

---

## Project Structure

```
probability_project/
├── index.html       ← Main webpage (C8 + C9 + AI record)
├── style.css        ← Stylesheet
├── app.js           ← All JavaScript logic
├── dataset1.csv     ← Weekly screen time data (G10 groups)
├── dataset2.csv     ← Delivery time data (routes)
├── dataset3.csv     ← Resale value data (plans)
└── README.md        ← This file
```

---

## Features

### C8 — Simulation Mode
- **5 distributions:** Uniform, Triangular, Linear (Inc/Dec), Piecewise, Normal
- Interactive parameter inputs — graph updates on every change
- Probability shading: below, above, between two points
- Numerical probability displayed with 6 decimal places
- Formula shown for each distribution

### C9 — Data Modeling Mode
- Upload any CSV file or paste data directly
- Auto-detects numeric columns
- Fits: Uniform, Triangular, Linear, Piecewise Uniform, Normal
- Shows estimated parameters + fit interpretation
- Empirical histogram overlaid with fitted PDF
- One-click loading of all 3 provided datasets

### AI Development Record (built into the page)
- Links to AI conversations used
- Prompts submitted
- Code verified and corrected
- Testing process documented

---

## How to Deploy (GitHub Pages)

1. Create a GitHub account at github.com
2. Create a new public repository named `webpageGlobal_JuanVerastegui_JuanCuibes`
3. Upload all files in this folder to the repository
4. Go to **Settings → Pages → Source → main branch / root**
5. GitHub will generate a URL like: `https://juanverastegui.github.io/webpageGlobal_JuanVerastegui_JuanCuibes/`
6. To use a custom domain like `www.webpageGlobal_JuanVerastegui_JuanCuibes.com`:
   - Purchase the domain from a registrar (Namecheap, GoDaddy, etc.)
   - Add it under Settings → Pages → Custom domain
   - Add a CNAME record in your DNS pointing to `juanverastegui.github.io`

---

## Testing the Datasets

All three CSV files (dataset1.csv, dataset2.csv, dataset3.csv) are also embedded
as built-in datasets in the C9 tab — click the dataset buttons to load them instantly
without needing to upload files.

---

## Technologies Used
- HTML5 + CSS3 (no frameworks)
- Vanilla JavaScript (ES2020)
- Chart.js 4.4.0 (via CDN)
- Google Fonts: DM Serif Display, DM Mono, Manrope
