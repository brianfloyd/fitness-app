# Backend Scripts

## MacroFactor import

Imports **MacroFactor** Quick Export + Food Log xlsx into the fitness DB.

- **Parser:** `../helpers/macrofactor-xlsx.js` — reusable for future in-app import.
- **Script:** `import-macrofactor.js`

### Sheets

- **Quick Export:** Date (Excel serial), Trend Weight, Weight, Calories, Protein, Fat, Carbs, Steps. Used for daily weight and aggregate macros.
- **Food Log:** Date (YYYY-MM-DD), Food Name, Serving Size, Serving Qty, Serving Weight (g), Calories, Fat, Carbs, Protein. Used to build per-day food entries.

### Behavior

1. Parse both sheets; collect all dates.
2. For each date:
   - **Foods:** Build entries from Food Log. For each food, find or create a custom food `(name, serving_size = Serving Weight g, serving_unit = g)`. Store per-serving macros; log entries use `amount = Serving Qty`, `unit = 'serving'`.
   - **Weight, macros, steps:** From Quick Export (weight = Weight else Trend Weight).
3. **Existing logs:** `UPDATE` only `day_number`, `weight`, `protein`, `fat`, `carbs`, `foods`, `steps`. Preserve `workout`, `strava`, `sleep_time`, `sleep_score`, `photo`, `fat_percent`.
4. **New dates:** `INSERT` with MacroFactor data; other fields null.

### Calories & macros (MacroFactor-aligned)

- **Reported values only:** Use MacroFactor’s exported Calories, Protein, Fat, Carbs. No 4‑4‑9 or other recomputation.
- **Quick Export:** Use logged columns only (exclude “Target …”).
- **Food Log:** Per-entry totals = row values exactly. Per-serving = row ÷ Serving Qty; used for scaling when amount/unit is edited.
- **Scaling on edit:** `foodConversions.calculateMacrosForCustom` scales stored per-serving values by (amount in servings) or (grams ÷ serving size grams). Same idea as MacroFactor.

### Run

```bash
cd backend
node src/scripts/import-macrofactor.js "path/to/MacroFactor-YYYYMMDDHHMMSS.xlsx"
# or
npm run import-macrofactor -- "path/to/file.xlsx"
```

### Inspect xlsx

```bash
node src/scripts/inspect-macrofactor-xlsx.js "path/to/file.xlsx"
```
