# AI, Distance, and the Future of U.S. Manufacturing

An interactive, data-driven webpage examining whether AI adoption strengthens the economic case for reshoring U.S. manufacturing.

## What this is

I wrote this for a writing course, but the question behind it is one I think about at work: if AI makes domestic manufacturing more competitive on quality, reliability, and planning, does the old logic of offshoring for cheap labor still hold?

The project is a webpage designed for an executive audience. It walks through the argument in sections: how the traditional cost model depended on wage differentials and stable logistics, how AI changes the math on the factory floor (quality, predictive maintenance, scheduling), and what constraints still limit reshoring even when the technology is there. The tone is deliberately measured; the goal is to inform a strategic decision, not to hype AI.

The visualizations are built in R using Plotly and pull from real data sources (FRED, OECD, U.S. Census Bureau ASM). They show the decoupling of manufacturing output from employment, rising output per worker, and global supply chain pressure over time.

## Data sources

- Federal Reserve (FRED): Industrial Production Index (IPMAN), Manufacturing Employment (MANEMP)
- Federal Reserve Bank of New York: Global Supply Chain Pressure Index (GSCPI)
- OECD: Average Annual Wages by country
- U.S. Census Bureau: Annual Survey of Manufactures, 2022 benchmark

## How to run

Open `index.html` in a browser. The visualizations in `visuals/` are self-contained Plotly HTML files embedded via iframe.

To regenerate the visualizations from source data:

```bash
cd dataSets
Rscript generate_plotly_visuals.R
```

Requires R with dplyr, readr, plotly, readxl, htmlwidgets, and tidyr.

## Structure

- `index.html` — main webpage
- `css/styles.css` — dark UI styling
- `js/main.js` — scroll interactions and typed heading animations
- `dataSets/` — source CSVs, GSCPI data, R scripts for generating visualizations
- `visuals/` — generated Plotly HTML charts
- `WorksCited.md` — full bibliography

## Sources cited

Kinkel (2020), Firooz et al. (2022), Bowman (2021), Infor (2021), BLS, OECD, FRED. Full citations in WorksCited.md.
