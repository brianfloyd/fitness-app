/**
 * Parse nutrition facts text from OCR and extract macros.
 * Handles common US Nutrition Facts label formats and common OCR errors
 * (e.g. Og→0g, 79→7g, Omg→0mg).
 * @param {string} text - Raw OCR text from label image
 * @returns {{ calories: number|null, protein: number|null, fat: number|null, carbs: number|null, servingSize: number|null, servingUnit: string }}
 */
export function parseNutritionLabel(text) {
  if (!text || typeof text !== 'string') {
    return { calories: null, protein: null, fat: null, carbs: null, servingSize: 100, servingUnit: 'g' };
  }

  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Normalize whole text for collapsed matching
  let t = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\bOmg\b/gi, '0mg')
    .replace(/\bOg\b/gi, '0g');

  let calories = null;
  let protein = null;
  let fat = null;
  let carbs = null;
  let servingSize = 100;
  let servingUnit = 'g';

  /**
   * Extract the gram value from a nutrition label line.
   * Nutrition lines typically look like: "Total Fat 17g   26%"
   * Priority: "Xg" → "X9"/"X8" (OCR misread g→9/8) → bare number.
   * Skip lines that are sub-items (Saturated, Trans, Dietary, Added, etc.)
   */
  function extractGrams(line, excludePrefixes) {
    if (excludePrefixes) {
      for (const ex of excludePrefixes) {
        if (ex.test(line)) return null;
      }
    }
    // Priority 1: number immediately followed by "g" (not "mg" or "%")
    const gMatches = [...line.matchAll(/(\d+\.?\d*)\s*g(?![\w])/gi)];
    if (gMatches.length > 0) return parseFloat(gMatches[0][1]);

    // Priority 2: OCR often reads "g" as "9" or "8" — e.g. "17g" → "179"
    // Look for a number ending in 9 or 8 that isn't followed by "%" or a letter
    const misreadG = line.match(/(\d+)[98](?:\s|$|[^%\w])/);
    if (misreadG) return parseFloat(misreadG[1]);

    // Priority 3: any number NOT followed by "%" or "mg"
    const allNums = [...line.matchAll(/(\d+\.?\d*)\s*(%|mg)?/gi)];
    for (const m of allNums) {
      if (m[2] === '%' || m[2] === 'mg') continue;
      return parseFloat(m[1]);
    }
    return null;
  }

  // --- CALORIES ---
  // Calories has no unit, just a bare number: "Calories 210"
  // On labels, "Calories" and the number are often in very large bold font.
  // OCR may put them on the same line or split across adjacent lines.
  const mCal = t.match(/calori\w*\s*:?\s*(\d{2,4})/i) || t.match(/(\d{2,4})\s*calori/i);
  if (mCal) {
    calories = Math.round(parseFloat(mCal[1]));
  } else {
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (/calor/i.test(line) || /ca[il1|]or/i.test(line)) {
        // Number on the same line
        const m = line.match(/(\d{2,4})/);
        if (m) { calories = Math.round(parseFloat(m[1])); break; }
        // Number might be on the next line (large font → OCR line split)
        if (li + 1 < lines.length) {
          const nextM = lines[li + 1].match(/^\s*(\d{2,4})\s*$/);
          if (nextM) { calories = Math.round(parseFloat(nextM[1])); break; }
        }
      }
      // Reverse: number on a line, "Calories" on the next
      if (/^\s*\d{2,4}\s*$/.test(line) && li + 1 < lines.length && /calor/i.test(lines[li + 1])) {
        const m = line.match(/(\d{2,4})/);
        if (m) { calories = Math.round(parseFloat(m[1])); break; }
      }
    }
  }

  // --- TOTAL FAT ---
  // Must match "Total Fat" and NOT "Saturated Fat", "Trans Fat", etc.
  const fatExclude = [/sat\w*\s*fat/i, /trans\s*fat/i, /monounsat/i, /polyunsat/i];
  const mFat = t.match(/total\s*fat\s*:?\s*(\d+\.?\d*)\s*g/i);
  if (mFat) {
    fat = parseFloat(mFat[1]);
  } else {
    for (const line of lines) {
      if (/tot\w*\s*fat/i.test(line)) {
        const v = extractGrams(line, []);
        if (v != null) { fat = v; break; }
      }
    }
    // Fallback: line starting with "Fat" (not preceded by Sat/Trans)
    if (fat == null) {
      for (const line of lines) {
        if (/\bfat\b/i.test(line)) {
          let skip = false;
          for (const ex of fatExclude) { if (ex.test(line)) { skip = true; break; } }
          if (skip) continue;
          const v = extractGrams(line, []);
          if (v != null) { fat = v; break; }
        }
      }
    }
  }

  // --- TOTAL CARBS ---
  // Must match "Total Carbohydrate" and NOT "Dietary Fiber", "Added Sugars", etc.
  const carbExclude = [/dietary/i, /fiber/i, /sugar/i, /added/i, /includes/i];
  const mCarb = t.match(/total\s*carb\w*\s*:?\s*(\d+\.?\d*)\s*g/i) ||
    t.match(/carb\w*\s*:?\s*(\d+\.?\d*)\s*g/i);
  if (mCarb) {
    carbs = parseFloat(mCarb[1]);
  } else {
    for (const line of lines) {
      if (/tot\w*\s*carb/i.test(line) || /^carb/i.test(line)) {
        const v = extractGrams(line, carbExclude);
        if (v != null) { carbs = v; break; }
      }
    }
  }

  // --- PROTEIN ---
  // Only match collapsed text when there's an explicit "g" after the number
  const mProt = t.match(/prot\w*\s*:?\s*(\d+\.?\d*)\s*g(?![\w])/i);
  if (mProt) {
    protein = parseFloat(mProt[1]);
  } else {
    for (const line of lines) {
      if (/prot/i.test(line)) {
        const v = extractGrams(line, []);
        if (v != null) { protein = v; break; }
      }
    }
  }

  // --- SERVING SIZE ---
  const mServing = t.match(/serving\s*size[^(]*\((\d+)\s*(g|oz)\)/i) ||
    t.match(/serving\s*size\s*[^(]*\((\d+)\s*(g|oz)/i) ||
    t.match(/serving\s*size\s*:?\s*(\d+\.?\d*)\s*(g|oz|ml)/i) ||
    t.match(/\(\s*(\d+)\s*(g|oz)\s*\)/i) ||
    t.match(/(\d+)\s*g\s*(?:\)|per\s*serving)/i);
  if (mServing) {
    servingSize = parseFloat(mServing[1]);
    servingUnit = mServing[2] && /oz/i.test(mServing[2]) ? 'oz' : 'g';
  }
  if (isNaN(servingSize) || servingSize <= 0) {
    servingSize = 100;
    servingUnit = 'g';
  }

  return {
    calories,
    protein: protein != null && !isNaN(protein) ? protein : null,
    fat: fat != null && !isNaN(fat) ? fat : null,
    carbs: carbs != null && !isNaN(carbs) ? carbs : null,
    servingSize,
    servingUnit,
  };
}
