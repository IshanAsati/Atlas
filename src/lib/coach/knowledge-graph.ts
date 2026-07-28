/**
 * Atlas Knowledge Graph — structured topic knowledge for the AI coach.
 *
 * Each topic has:
 * - Core concepts the student must understand
 * - Common misconceptions with corrections
 * - NCERT chapter references
 * - Scaffolded question progression (easy → hard)
 *
 * This is injected into the system prompt so the coach knows the material
 * before the student even says hello.
 */

interface Concept {
  name: string;
  /** A 1–2 sentence explanation in NCERT terminology. */
  blurb: string;
}

interface Misconception {
  /** What the student often thinks. */
  wrong: string;
  /** What is actually true. */
  right: string;
}

interface TopicKnowledge {
  concepts: Concept[];
  misconceptions: Misconception[];
  ncertChapter: string;
  /** Questions ordered easiest to hardest. */
  questions: string[];
}

const GRAPH: Record<string, TopicKnowledge> = {
  "Magnetic Effects": {
    ncertChapter: "Class 10 Science, Chapter 12",
    concepts: [
      { name: "Magnetic field lines", blurb: "Closed loops running north to south outside a magnet. Never intersect. Tangent at any point gives the field direction." },
      { name: "Right-hand thumb rule", blurb: "For a straight current-carrying wire: thumb points in current direction, curled fingers show the magnetic field direction (concentric circles around the wire)." },
      { name: "Solenoid", blurb: "A coil of many circular turns of insulated copper wire. Inside it, field lines are parallel and uniform — like a bar magnet. One end is north, the other south." },
      { name: "Electromagnetic induction", blurb: "A changing magnetic field induces a current in a nearby conductor. The induced current lasts only while the field is changing. Fleming's right-hand rule gives its direction." },
      { name: "Fleming's left-hand rule", blurb: "For a current-carrying conductor in a magnetic field: forefinger = field, middle finger = current, thumb = force/motion. Used for motors, not generators." },
      { name: "Electric motor", blurb: "Converts electrical energy to mechanical. A coil in a magnetic field rotates when current flows. Split-ring commutator reverses current every half-turn to keep rotation going." },
      { name: "Electric generator", blurb: "Converts mechanical energy to electrical. A coil rotates in a magnetic field, inducing an alternating current. Uses slip rings (AC) or split rings (DC)." },
    ],
    misconceptions: [
      { wrong: "Longer wire means stronger field at the centre of a loop", right: "At the centre of a circular loop, every segment's field adds up in the same direction — it is stronger than a straight wire, not weaker." },
      { wrong: "Fleming's left-hand and right-hand rules are interchangeable", right: "Left-hand rule is for motors (force on a current-carrying conductor). Right-hand rule is for generators (induced current direction)." },
      { wrong: "Magnetic field lines start at the north pole and end at the south pole", right: "Field lines are continuous closed loops. They don't start or end anywhere — monopoles don't exist." },
      { wrong: "A stationary magnet near a coil induces current", right: "Only a changing magnetic field induces current. The magnet must be moving, or the current in a nearby coil must be changing." },
    ],
    questions: [
      "What do magnetic field lines tell us about the direction and strength of the field at any point?",
      "A straight wire carries current north to south. Use the right-hand thumb rule to describe the magnetic field around it.",
      "Why is the field at the centre of a current-carrying loop stronger than that near a straight wire carrying the same current?",
      "Compare a solenoid's magnetic field with that of a bar magnet. How can you tell which end is the north pole?",
      "A student wraps a coil around a nail and connects it to a battery. Explain why this creates an electromagnet and what factors control its strength.",
      "Describe what happens in a coil when a magnet is pushed into it, held stationary inside it, then pulled out. What is induced, and when?",
      "A generator produces alternating current. What would you change to make it produce direct current instead, and why does that work?",
    ],
  },

  "Electricity": {
    ncertChapter: "Class 10 Science, Chapter 11",
    concepts: [
      { name: "Ohm's Law", blurb: "V = IR. Current through a conductor is directly proportional to potential difference across it, provided temperature remains constant." },
      { name: "Resistance", blurb: "Opposition to current flow. R = ρL/A — depends on material (resistivity ρ), length (L), and cross-sectional area (A)." },
      { name: "Series vs parallel", blurb: "Series: current same, voltage divides. Parallel: voltage same, current divides. Equivalent resistance: Rs = R₁ + R₂ + …; 1/Rp = 1/R₁ + 1/R₂ + …" },
      { name: "Heating effect", blurb: "H = I²Rt. Used in electric iron, heater, fuse. The filament of a bulb gets hot and glows because of this effect." },
      { name: "Electric power", blurb: "P = VI = I²R = V²/R. Measured in watts. 1 kWh (unit) = 1000 watt × 1 hour. Commercial unit of energy." },
    ],
    misconceptions: [
      { wrong: "Resistance is a fixed property of a conductor", right: "Resistance depends on temperature. For metals, resistance increases with temperature. For semiconductors, it decreases." },
      { wrong: "Series circuits always draw more current", right: "Adding resistors in series increases total resistance, so total current decreases (same voltage). Parallel provides more paths — total current increases." },
      { wrong: "Power is always I²R for any circuit", right: "P = I²R gives the power dissipated as heat in a resistor. The total power delivered by a source is P = VI." },
    ],
    questions: [
      "A wire of length L and resistance R is stretched to twice its length. What happens to its resistance and why?",
      "Two resistors of 4 Ω and 6 Ω are connected in parallel across a 12 V battery. Find the current through each resistor and the total current from the battery.",
      "Why does the filament of a bulb glow but the connecting wires do not, even though the same current flows through both?",
      "An electric heater draws 5 A from a 220 V line. How much energy does it consume in 2 hours? Express it in joules and in kilowatt-hours.",
    ],
  },

  "Trigonometry": {
    ncertChapter: "Class 10 Mathematics, Chapter 8",
    concepts: [
      { name: "Trigonometric ratios", blurb: "In a right triangle: sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse, tan θ = opposite/adjacent. Defined for acute angles (0° to 90°)." },
      { name: "Fundamental identity", blurb: "sin²θ + cos²θ = 1. Derived directly from Pythagoras theorem. This single identity generates all the others." },
      { name: "Complementary angles", blurb: "sin(90° − θ) = cos θ, cos(90° − θ) = sin θ, tan(90° − θ) = cot θ, etc. The ratios of complementary angles are co-ratios." },
      { name: "Heights and distances", blurb: "Practical applications using angle of elevation (line of sight above horizontal) and angle of depression (line of sight below horizontal)." },
    ],
    misconceptions: [
      { wrong: "sin²θ + cos²θ = 1 must be memorised", right: "It is Pythagoras with hypotenuse = 1. Draw the triangle: opposite² + adjacent² = 1², which is exactly sin²θ + cos²θ = 1." },
      { wrong: "Trigonometric ratios work for any angle in any triangle", right: "The basic definitions (opposite/hypotenuse, etc.) only apply to right triangles for angles 0° to 90°. For general triangles, you need the sine rule or cosine rule." },
      { wrong: "Angle of elevation and angle of depression are different types of angles", right: "They are both measured from the horizontal. Elevation is upward from the horizontal; depression is downward from the horizontal. Mathematically, they are equal when the observer and object are at the same horizontal level." },
    ],
    questions: [
      "Define sin θ for a right triangle. Without a calculator, explain why sin θ is always between 0 and 1 for acute angles.",
      "If sin A = 3/5, find cos A and tan A using the fundamental identity.",
      "Prove that (sin A + cos A)² + (sin A − cos A)² = 2, for any angle A.",
      "From a point on the ground 30 m from the foot of a tower, the angle of elevation of the top is 60°. Find the height of the tower.",
    ],
  },

  "Carbon Compounds": {
    ncertChapter: "Class 10 Science, Chapter 4",
    concepts: [
      { name: "Covalent bonding in carbon", blurb: "Carbon has 4 valence electrons. It shares electrons to complete its octet — never transfers. This is why it forms covalent bonds. Catenation: carbon atoms link together to form long chains, branches, and rings." },
      { name: "Functional groups", blurb: "An atom or group of atoms that determines the chemical properties of an organic compound. Examples: −OH (alcohol), −COOH (carboxylic acid), −CHO (aldehyde), −CO− (ketone), −Cl/Br (halogen)." },
      { name: "Homologous series", blurb: "A series of compounds with the same functional group and general formula. Each successive member differs by a −CH₂− unit. Same chemical properties, gradation in physical properties." },
      { name: "IUPAC nomenclature", blurb: "Prefix (substituent) + Word root (number of carbons in longest chain) + Suffix (functional group). Chain numbering gives the functional group the lowest possible number." },
    ],
    misconceptions: [
      { wrong: "The suffix of a compound depends on the name of the longest chain", right: "The suffix is determined by the functional group present (−ol for alcohol, −oic acid for carboxylic acid, −al for aldehyde). The chain name (meth-, eth-, prop-, …) gives the word root." },
      { wrong: "All carbon compounds are organic", right: "Carbon dioxide, carbon monoxide, carbonates, and bicarbonates contain carbon but are classified as inorganic compounds." },
      { wrong: "Soap works because it simply washes dirt away", right: "Soap molecules have a hydrophobic (water-repelling) hydrocarbon tail and a hydrophilic (water-attracting) ionic head. The tail dissolves in grease; the head stays in water. This forms a micelle that lifts the dirt off." },
    ],
    questions: [
      "Why does carbon form covalent bonds rather than ionic bonds? Explain using its electronic configuration.",
      "Name the compound CH₃−CH₂−CH₂−OH. Identify its functional group and explain how the IUPAC name is constructed.",
      "Two compounds have the molecular formula C₂H₆O but different structures. Draw both and explain why they are different even though the formula is the same.",
      "Explain the cleansing action of soap with a diagram. Why is soap ineffective in hard water?",
    ],
  },

  "Acids, Bases & Salts": {
    ncertChapter: "Class 10 Science, Chapter 2",
    concepts: [
      { name: "Arrhenius definition", blurb: "Acids produce H⁺ ions in water. Bases produce OH⁻ ions in water. Strong acids/bases ionise completely; weak ones ionise partially." },
      { name: "pH scale", blurb: "Measures hydrogen ion concentration. 0 (strongly acidic) to 14 (strongly basic). pH 7 is neutral. Each unit change is a 10× change in H⁺ concentration." },
      { name: "Neutralisation", blurb: "Acid + Base → Salt + Water. The H⁺ from the acid combines with OH⁻ from the base to form H₂O. The remaining ions form the salt." },
      { name: "Common salts and their uses", blurb: "NaCl (table salt, industrial), NaHCO₃ (baking soda — antacid, fire extinguisher), Na₂CO₃·10H₂O (washing soda — cleaning), CaSO₄·½H₂O (Plaster of Paris — casts, moulds)." },
    ],
    misconceptions: [
      { wrong: "A strong acid is the same as a concentrated acid", right: "Strong/weak refers to the degree of ionisation (HCl is strong because it fully dissociates). Concentrated/dilute refers to the amount of acid dissolved in water. A concentrated weak acid exists." },
      { wrong: "pH 6 is slightly acidic", right: "pH 6 is 10× more acidic than pH 7, and 100× more acidic than pH 8. The scale is logarithmic, not linear." },
      { wrong: "All salts are neutral", right: "Salts of a strong acid + weak base are acidic (e.g. NH₄Cl). Salts of a weak acid + strong base are basic (e.g. Na₂CO₃). Only salts of strong acid + strong base are neutral (e.g. NaCl)." },
    ],
    questions: [
      "A solution has pH 4. How many times more acidic is it than a solution with pH 6?",
      "Classify these as strong/weak acids and concentrated/dilute: 0.1 M HCl, 10 M CH₃COOH. Explain the difference between the two classifications.",
      "Describe the preparation of Plaster of Paris from gypsum. Write the chemical equation and explain why POP is stored in a moisture-proof container.",
      "A student mixes sodium carbonate solution with hydrochloric acid. Name the gas evolved and write the balanced equation. How would you test for this gas?",
    ],
  },

  "Quadratic Equations": {
    ncertChapter: "Class 10 Mathematics, Chapter 4",
    concepts: [
      { name: "Standard form", blurb: "ax² + bx + c = 0 where a ≠ 0. A quadratic equation has exactly two roots (they may be equal)." },
      { name: "Discriminant", blurb: "D = b² − 4ac. D > 0 → two distinct real roots. D = 0 → two equal real roots. D < 0 → no real roots." },
      { name: "Quadratic formula", blurb: "x = [−b ± √(b² − 4ac)] / 2a. Derived by completing the square. Works for every quadratic, even when factoring fails." },
      { name: "Nature of roots without solving", blurb: "Use the discriminant to determine how many real roots exist and whether they are rational or irrational — without actually solving the equation." },
    ],
    misconceptions: [
      { wrong: "Every quadratic has real roots", right: "If the discriminant is negative, the roots are complex (not real). In Class 10, this means 'no real roots.'" },
      { wrong: "The coefficient 'a' doesn't matter much", right: "'a' determines the parabola's opening (upward if a > 0, downward if a < 0) and its width. Setting a = 0 makes it a linear equation, not quadratic." },
    ],
    questions: [
      "Solve x² − 5x + 6 = 0 by factoring and verify using the quadratic formula.",
      "Without solving, determine the nature of the roots of 2x² − 4x + 5 = 0. Explain how you know.",
      "The sum of two numbers is 27 and their product is 182. Find the numbers by forming a quadratic equation.",
      "Find the value of k for which the equation x² + kx + 64 = 0 has equal roots.",
    ],
  },

  "Life Processes": {
    ncertChapter: "Class 10 Science, Chapter 5",
    concepts: [
      { name: "Nutrition", blurb: "Autotrophic (plants — photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ using sunlight and chlorophyll) and heterotrophic (animals — holozoic, saprophytic, parasitic)." },
      { name: "Respiration", blurb: "Breakdown of glucose to release energy. Aerobic (O₂ present): C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 ATP. Anaerobic (O₂ absent): glucose → ethanol + CO₂ + 2 ATP (yeast) or glucose → lactic acid + 2 ATP (muscles)." },
      { name: "Transportation", blurb: "In humans: heart pumps blood through arteries, veins, capillaries. Double circulation. In plants: xylem (water & minerals upward) and phloem (food in both directions using ATP)." },
      { name: "Excretion", blurb: "Removal of nitrogenous wastes. Humans: kidneys filter blood, form urine (urea). Plants: stomata, lenticels, shedding leaves; waste products stored as resins and gums." },
    ],
    misconceptions: [
      { wrong: "Plants photosynthesise and animals respire", right: "Plants do both — photosynthesis during the day, respiration all the time. Respiration is universal across all living organisms." },
      { wrong: "Blood is only red because of oxygen", right: "Haemoglobin (an iron-containing protein) is red in colour regardless. Oxyhaemoglobin is bright red; deoxyhaemoglobin is dark red/purple. Blood is never blue." },
      { wrong: "Urine is just excess water", right: "Urine contains urea, uric acid, excess salts, and water-soluble vitamins. It is the kidney's filtered output of nitrogenous waste from protein metabolism." },
    ],
    questions: [
      "Write the balanced equation for photosynthesis. What happens to the glucose produced?",
      "Compare aerobic and anaerobic respiration in terms of products, ATP yield, and where each occurs in the human body.",
      "Trace the path of a red blood cell from the right atrium to the left ventricle, naming every chamber and vessel.",
      "Explain how the nephron filters blood. What is reabsorbed back into the blood, and what stays in the filtrate?",
    ],
  },
};

/** Fallback for topics not explicitly in the graph. */
const FALLBACK_KNOWLEDGE: TopicKnowledge = {
  ncertChapter: "NCERT textbook",
  concepts: [{ name: "Core idea", blurb: "Use NCERT terminology. Focus on definitions, equations, and diagrams." }],
  misconceptions: [],
  questions: [
    "In your own words, what does this topic describe?",
    "What is the most important equation or definition in this topic?",
    "Can you explain one real-world application of this concept?",
  ],
};

function bestMatch(topic: string): string | null {
  const lower = topic.toLowerCase();
  for (const key of Object.keys(GRAPH)) {
    if (lower.includes(key.toLowerCase())) return key;
  }
  return null;
}

export function getKnowledge(topic: string): TopicKnowledge {
  const key = bestMatch(topic);
  return key ? GRAPH[key] : FALLBACK_KNOWLEDGE;
}

/** Compact representation injected into the coach system prompt. */
export function knowledgeAsPrompt(topic: string): string {
  const k = getKnowledge(topic);
  const conceptLines = k.concepts.map((c) => `  - ${c.name}: ${c.blurb}`).join("\n");
  const misconceptionLines = k.misconceptions.map((m) => `  - Wrong: "${m.wrong}" → Right: "${m.right}"`).join("\n");
  const questionLines = k.questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n");

  return `### Topic Knowledge (${k.ncertChapter}) ###
Core concepts the student should know:
${conceptLines}

Common misconceptions to watch for:
${misconceptionLines}

Suggested questions (easiest to hardest; pick one that fits the student's level):
${questionLines}`;
}
