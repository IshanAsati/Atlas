/**
 * Atlas NCERT Knowledge Base — structured topic knowledge for the AI coach.
 *
 * Covers Class 10 CBSE: Science (Phy, Chem, Bio), Maths, SST (History, Geo, Polity, Econ).
 * Each entry: core concepts, common misconceptions, NCERT-chapter-aligned questions.
 *
 * Injected into the coach system prompt so it knows the material cold.
 */

interface Concept {
  name: string;
  blurb: string;
}
interface Misconception {
  wrong: string;
  right: string;
}
interface TopicKnowledge {
  ncert: string;
  concepts: Concept[];
  misconceptions: Misconception[];
  questions: string[];
}

const G: Record<string, TopicKnowledge> = {
  // =========================== PHYSICS ===========================
  "Magnetic Effects": {
    ncert: "Ch 12 · Magnetic Effects of Electric Current",
    concepts: [
      { name: "Magnetic field lines", blurb: "Closed loops running north→south outside magnet. Tangent = field direction." },
      { name: "Right-hand thumb rule", blurb: "Thumb = current, curled fingers = magnetic field direction (concentric circles)." },
      { name: "Solenoid", blurb: "Coil of insulated wire. Inside: uniform parallel field, like a bar magnet." },
      { name: "Electromagnetic induction", blurb: "Changing magnetic field induces current. Fleming's right-hand rule for direction." },
      { name: "Electric motor", blurb: "Electrical → mechanical. Split-ring commutator reverses current every half-turn." },
      { name: "Electric generator", blurb: "Mechanical → electrical. Slip rings (AC) or split rings (DC)." },
    ],
    misconceptions: [
      { wrong: "Field lines start at north, end at south", right: "Continuous closed loops. Monopoles don't exist." },
      { wrong: "Fleming's left and right rules are interchangeable", right: "Left = motor (force on conductor). Right = generator (induced current)." },
      { wrong: "Stationary magnet near coil induces current", right: "Only a changing field induces current. Magnet must move." },
    ],
    questions: [
      "What do magnetic field lines tell you about a magnet?",
      "Current flows north→south in a wire. Describe the field around it.",
      "Compare a solenoid's field with a bar magnet. Find the north pole.",
    ],
  },
  Electricity: {
    ncert: "Ch 11 · Electricity",
    concepts: [
      { name: "Ohm's Law", blurb: "V = IR. I ∝ V at constant temperature." },
      { name: "Resistance", blurb: "R = ρL/A. ρ depends on material and temp." },
      { name: "Series vs parallel", blurb: "Series: I same, V divides, Rs = R₁+R₂+… Parallel: V same, I divides, 1/Rp = 1/R₁+1/R₂+…" },
      { name: "Heating effect", blurb: "H = I²Rt. Used in heater, iron, fuse." },
      { name: "Electric power", blurb: "P = VI = I²R = V²/R. 1 kWh = 1000 W × 1 h." },
    ],
    misconceptions: [
      { wrong: "Resistance is fixed", right: "For metals, R↑ with T↑. Semiconductors: R↓ with T↑." },
      { wrong: "Series circuits draw more current", right: "Adding R in series ↑ total R → ↓ current." },
    ],
    questions: [
      "Wire stretched to 2× length. What happens to R?",
      "4Ω + 6Ω in parallel across 12V. Find each current and total.",
    ],
  },
  "Light — Reflection": {
    ncert: "Ch 9 · Light – Reflection and Refraction",
    concepts: [
      { name: "Laws of reflection", blurb: "∠i = ∠r. Incident, reflected, normal lie in same plane." },
      { name: "Spherical mirrors", blurb: "Concave: converging. Convex: diverging. f = R/2. 1/f = 1/v + 1/u." },
      { name: "Refraction", blurb: "Snell's law: n₁ sin i = n₂ sin r. Light bends toward normal in denser medium." },
      { name: "Lens formula", blurb: "1/f = 1/v − 1/u. Convex +ve, concave −ve. P = 1/f dioptre." },
    ],
    misconceptions: [
      { wrong: "Image in plane mirror is on the surface", right: "It's behind at same distance as the object is in front." },
      { wrong: "Concave mirrors always magnify", right: "Only when object is between F and P. Beyond C, image is smaller." },
    ],
    questions: [
      "Object between F and 2F of a convex lens. Describe the image.",
      "A convex lens forms a real image 3× the size at 30 cm from lens. Find u.",
    ],
  },
  "Human Eye": {
    ncert: "Ch 10 · The Human Eye and the Colourful World",
    concepts: [
      { name: "Accommodation", blurb: "Ciliary muscles adjust lens focal length. Near point 25 cm, far point ∞." },
      { name: "Myopia", blurb: "Image before retina. Correct with concave lens." },
      { name: "Hypermetropia", blurb: "Image behind retina. Correct with convex lens." },
      { name: "Dispersion", blurb: "White light splits into VIBGYOR through prism. Red bends least, violet most." },
      { name: "Scattering", blurb: "Blue sky: shorter wavelengths scatter more. Red sunset: longer λ reach us." },
    ],
    misconceptions: [
      { wrong: "Stars twinkle because they're far", right: "Atmospheric refraction. Planets don't twinkle — they're resolved discs." },
    ],
    questions: [
      "Why is sky blue and sunset red?",
      "A person can't see beyond 2 m. Defect? Which lens?",
    ],
  },
  "Sources of Energy": {
    ncert: "Ch 13 · Sources of Energy",
    concepts: [
      { name: "Renewable vs non-renewable", blurb: "Solar, wind, hydro, tidal, biomass (renewable). Coal, petroleum, gas (non-renewable)." },
      { name: "Fossil fuels", blurb: "Formed over millions of years from dead organisms. Coal → thermal power." },
      { name: "Solar", blurb: "Solar cooker (concave mirror). Solar cell (Si → electricity)." },
      { name: "Nuclear", blurb: "U-235 fission. E = mc². Problem: radioactive waste." },
    ],
    misconceptions: [
      { wrong: "Nuclear power is renewable", right: "Uranium is finite. It's non-renewable." },
      { wrong: "Wind works anywhere", right: "Needs sustained wind > 15 km/h." },
    ],
    questions: [
      "Classify: coal, wind, nuclear, tidal, biomass. Which are renewable?",
      "Why haven't we fully switched to solar?",
    ],
  },
  // =========================== CHEMISTRY ===========================
  "Chemical Reactions": {
    ncert: "Ch 1 · Chemical Reactions and Equations",
    concepts: [
      { name: "Balancing", blurb: "Atoms conserved. Same number of each element on both sides." },
      { name: "Types", blurb: "Combination (A+B→C), decomposition (A→B+C), displacement (A+BC→AC+B), double displacement (AB+CD→AD+CB)." },
      { name: "Redox", blurb: "Oxidation: gain O / lose H. Reduction: lose O / gain H. Always together." },
      { name: "Rancidity", blurb: "Fats oxidise → bad smell. Prevent: antioxidants, N₂ flushing, refrigeration." },
    ],
    misconceptions: [
      { wrong: "Balancing is about making numbers equal", right: "It's about atom conservation — same count on both sides." },
      { wrong: "Rust needs only oxygen", right: "Water is essential. Iron doesn't rust in dry air." },
    ],
    questions: ["Balance Fe + H₂O → Fe₃O₄ + H₂. What type of reaction?"],
  },
  "Acids, Bases & Salts": {
    ncert: "Ch 2 · Acids, Bases and Salts",
    concepts: [
      { name: "Arrhenius", blurb: "Acid → H⁺, Base → OH⁻ in water. Strong: fully ionise." },
      { name: "pH scale", blurb: "0–14. pH 7 neutral. Each unit = 10× change in H⁺." },
      { name: "Common salts", blurb: "NaCl, NaHCO₃ (baking soda), Na₂CO₃·10H₂O (washing soda), CaSO₄·½H₂O (POP)." },
    ],
    misconceptions: [
      { wrong: "Strong acid = concentrated", right: "Strong/weak = degree of ionisation. Conc./dilute = amount dissolved." },
      { wrong: "All salts are neutral", right: "NH₄Cl (acidic), Na₂CO₃ (basic). Only strong+strong is neutral." },
    ],
    questions: [
      "pH 4 is how many times more acidic than pH 6?",
      "Why is POP stored in moisture-proof container? Write the equation.",
    ],
  },
  "Metals & Non-metals": {
    ncert: "Ch 3 · Metals and Non-metals",
    concepts: [
      { name: "Reactivity series", blurb: "K > Na > Ca > Mg > Al > Zn > Fe > Pb > H > Cu > Hg > Ag > Au." },
      { name: "Extraction", blurb: "Electrolysis for top (K, Na, Ca, Mg, Al). Carbon reduction for middle (Zn, Fe)." },
      { name: "Alloys", blurb: "Brass (Cu+Zn), Bronze (Cu+Sn), Steel (Fe+Ni+Cr). Better properties than pure." },
    ],
    misconceptions: [
      { wrong: "All metal oxides are basic", right: "Al₂O₃ and ZnO are amphoteric." },
    ],
    questions: [
      "Why is Na stored under kerosene?",
      "Explain Al extraction from bauxite. Why can't carbon reduce it?",
    ],
  },
  "Carbon Compounds": {
    ncert: "Ch 4 · Carbon and its Compounds",
    concepts: [
      { name: "Covalent bonding", blurb: "C shares 4 electrons. Catenation: chains, branches, rings." },
      { name: "Functional groups", blurb: "-OH (alcohol), -COOH (acid), -CHO (aldehyde), -CO- (ketone)." },
      { name: "Soap", blurb: "Hydrophobic tail + hydrophilic head → micelle. Detergents work in hard water." },
    ],
    misconceptions: [
      { wrong: "All C compounds are organic", right: "CO₂, CO, carbonates are inorganic." },
      { wrong: "Soap physically washes dirt away", right: "Micelles lift grease off. Tail dissolves in grease, head in water." },
    ],
    questions: ["Name CH₃CH₂CH₂OH. Identify functional group. How is IUPAC name constructed?"],
  },
  "Periodic Classification": {
    ncert: "Ch 5 · Periodic Classification of Elements",
    concepts: [
      { name: "Mendeleev", blurb: "Based on atomic mass. Predicted undiscovered elements (eka-boron, etc.)." },
      { name: "Modern periodic", blurb: "Based on atomic number (Moseley). 18 groups, 7 periods." },
      { name: "Trends", blurb: "Down group: size↑, metallic↑. Across period: size↓, metallic↓." },
    ],
    misconceptions: [
      { wrong: "Mendeleev arranged by atomic number", right: "He arranged by atomic mass. Atomic number came later." },
    ],
    questions: ["Why does atomic size decrease across a period but increase down a group?"],
  },
  // =========================== BIOLOGY ===========================
  "Life Processes": {
    ncert: "Ch 5 · Life Processes",
    concepts: [
      { name: "Photosynthesis", blurb: "6CO₂+6H₂O → C₆H₁₂O₆+6O₂. Needs sunlight, chlorophyll." },
      { name: "Respiration", blurb: "Aerobic: 38 ATP. Anaerobic (muscles): lactic acid+2 ATP. (yeast): ethanol+CO₂+2 ATP." },
      { name: "Transport", blurb: "Heart: 4 chambers, double circulation. Xylem (water up), phloem (food both ways)." },
    ],
    misconceptions: [
      { wrong: "Plants photosynthesise, animals respire", right: "Plants do both. Respiration is universal." },
      { wrong: "Blood is blue without oxygen", right: "Haemoglobin itself is red. Deoxyhaemoglobin is darker red." },
    ],
    questions: ["Write the balanced photosynthesis equation.", "Compare aerobic and anaerobic respiration."],
  },
  "Control & Coordination": {
    ncert: "Ch 6 · Control and Coordination",
    concepts: [
      { name: "Neuron", blurb: "Dendrite → cell body → axon → synapse. Reflex arc: sensory → relay → motor." },
      { name: "Brain", blurb: "Forebrain (thinking), midbrain, cerebellum (balance), medulla (breathing/heartbeat)." },
      { name: "Hormones", blurb: "Thyroxine (metabolism), insulin (sugar), adrenaline (fight/flight). Plant: auxin (phototropism)." },
    ],
    misconceptions: [
      { wrong: "Spinal cord is part of brain", right: "Part of CNS but separate. Handles reflexes." },
      { wrong: "Hormones work instantly", right: "Slower than nerves, longer-lasting. Nerves are fast, short." },
    ],
    questions: ["Draw a reflex arc. Label each neuron.", "Compare nervous vs hormonal control."],
  },
  "How do Organisms Reproduce": {
    ncert: "Ch 7 · Reproduction",
    concepts: [
      { name: "Asexual", blurb: "Binary fission (amoeba), budding (hydra), fragmentation (spirogyra), spore formation (rhizopus)." },
      { name: "Human", blurb: "Testes → sperm. Ovaries → ovum. Fertilisation in fallopian tube." },
      { name: "Contraception", blurb: "Barrier (condom), hormonal (pills), surgical (vasectomy, tubectomy), IUCD." },
    ],
    misconceptions: [
      { wrong: "Regeneration = reproduction", right: "Planaria regenerates but reproduces by fission." },
      { wrong: "Pollination = fertilisation", right: "Pollination: pollen on stigma. Fertilisation: gametes fuse." },
    ],
    questions: ["Trace the path of sperm from testes to urethra."],
  },
  Heredity: {
    ncert: "Ch 8 · Heredity",
    concepts: [
      { name: "Mendel", blurb: "Dominance: one allele masks other. Segregation: alleles separate in gametes. Independent assortment: traits inherit independently." },
      { name: "Sex determination", blurb: "Human: XX = ♀, XY = ♂. Father's sperm determines sex." },
      { name: "Evolution", blurb: "Natural selection (Darwin). Only genetic traits inherited." },
    ],
    misconceptions: [
      { wrong: "Mother determines child's sex", right: "Father's sperm (X or Y) determines sex. Egg is always X." },
      { wrong: "Acquired traits pass to children", right: "Only DNA-coded traits are inherited." },
    ],
    questions: ["Cross TT (tall) × Tt. Find genotype ratios.", "Explain sex determination in humans."],
  },
  "Our Environment": {
    ncert: "Ch 13 · Our Environment",
    concepts: [
      { name: "Food chain", blurb: "Producer → primary consumer → secondary → tertiary. 10% energy transfers to next level." },
      { name: "Ozone", blurb: "O₃ in stratosphere absorbs UV. CFCs destroy ozone → ozone hole." },
      { name: "Biomagnification", blurb: "Toxins (DDT) concentrate at higher trophic levels." },
    ],
    misconceptions: [
      { wrong: "Energy cycles in the ecosystem", right: "Energy flows one-way (sun → heat). Only matter cycles." },
      { wrong: "Ozone depletion = global warming", right: "Different. Ozone depletion → more UV. Warming from greenhouse gases." },
    ],
    questions: ["Why are there rarely 5+ trophic levels?", "Explain biomagnification of DDT."],
  },
  // =========================== MATHS ===========================
  "Real Numbers": {
    ncert: "Ch 1 · Real Numbers",
    concepts: [
      { name: "Euclid's lemma", blurb: "a = bq + r, 0 ≤ r < b. Basis for HCF and irrationality proofs." },
      { name: "Fundamental theorem", blurb: "Every composite = unique product of primes." },
      { name: "Irrationality proof", blurb: "Assume √2 = p/q in lowest terms → both p and q even → contradiction." },
    ],
    misconceptions: [
      { wrong: "Non-terminating decimal = irrational", right: "0.333... = 1/3 is rational. Irrational = non-terminating AND non-repeating." },
    ],
    questions: ["Prove √3 is irrational.", "Find LCM and HCF of 6, 72, 120."],
  },
  Polynomials: {
    ncert: "Ch 2 · Polynomials",
    concepts: [
      { name: "Zeroes", blurb: "Values where p(x) = 0. Graphically: x-intercepts." },
      { name: "Quadratic", blurb: "ax²+bx+c. Sum = −b/a. Product = c/a." },
    ],
    misconceptions: [],
    questions: ["If α,β are zeroes of x²−5x+k and α−β=1, find k."],
  },
  "Linear Equations": {
    ncert: "Ch 3 · Pair of Linear Equations",
    concepts: [
      { name: "Nature", blurb: "a₁/a₂ ≠ b₁/b₂ → unique. a₁/a₂ = b₁/b₂ ≠ c₁/c₂ → none. a₁/a₂ = b₁/b₂ = c₁/c₂ → infinite." },
    ],
    misconceptions: [
      { wrong: "Two equations always have a unique solution", right: "They may have none or infinite solutions." },
    ],
    questions: ["Solve 3x−5y=4, 9x−2y=7 by elimination.", "For what k are 3x−y+8=0 and 6x−ky=−16 coincident?"],
  },
  "Quadratic Equations": {
    ncert: "Ch 4 · Quadratic Equations",
    concepts: [
      { name: "Discriminant", blurb: "D = b²−4ac. D>0 → distinct real. D=0 → equal. D<0 → no real." },
      { name: "Formula", blurb: "x = [−b ± √(b²−4ac)]/2a." },
    ],
    misconceptions: [
      { wrong: "Every quadratic has real roots", right: "If D<0, no real roots (complex)." },
    ],
    questions: ["Without solving: nature of roots of 2x²−4x+5=0?", "Find k for x²+kx+64=0 to have equal roots."],
  },
  "Arithmetic Progressions": {
    ncert: "Ch 5 · Arithmetic Progressions",
    concepts: [
      { name: "nth term", blurb: "aₙ = a+(n−1)d." },
      { name: "Sum", blurb: "Sₙ = n/2[2a+(n−1)d] = n/2(a+l)." },
    ],
    misconceptions: [
      { wrong: "d must be positive for an AP", right: "d can be negative, zero, or positive." },
    ],
    questions: ["How many terms of AP 9, 17, 25... sum to 636?"],
  },
  Triangles: {
    ncert: "Ch 6 · Triangles",
    concepts: [
      { name: "Similarity", blurb: "AAA, AA, SSS, SAS." },
      { name: "BPT", blurb: "Line ∥ to one side divides the other two proportionally. Converse also true." },
      { name: "Pythagoras", blurb: "Hypotenuse² = base² + height². Converse: if a²=b²+c², right-angled." },
    ],
    misconceptions: [
      { wrong: "Equal angles → congruent", right: "Equal angles → similar. Congruence needs equal sides too." },
    ],
    questions: ["In △ABC, DE∥BC. AD=3, DB=6, AE=4. Find EC."],
  },
  "Coordinate Geometry": {
    ncert: "Ch 7 · Coordinate Geometry",
    concepts: [
      { name: "Distance", blurb: "d = √[(x₂−x₁)²+(y₂−y₁)²]." },
      { name: "Section", blurb: "x = (mx₂+nx₁)/(m+n), y = (my₂+ny₁)/(m+n). Midpoint: m=n=1." },
    ],
    misconceptions: [],
    questions: ["Check if (1,5), (2,3), (−2,−11) are collinear."],
  },
  Trigonometry: {
    ncert: "Ch 8 · Introduction to Trigonometry",
    concepts: [
      { name: "Ratios", blurb: "sin = opp/hyp, cos = adj/hyp, tan = opp/adj." },
      { name: "Identity", blurb: "sin²θ+cos²θ = 1. tan = sin/cos." },
      { name: "Standard values", blurb: "sin 0°=0, sin 30°=½, sin 45°=1/√2, sin 60°=√3/2, sin 90°=1." },
    ],
    misconceptions: [
      { wrong: "sin²θ+cos²θ=1 must be memorised", right: "It's Pythagoras with hypotenuse=1." },
    ],
    questions: ["If sin A=3/5, find cos A and tan A using identity."],
  },
  "Applications of Trigonometry": {
    ncert: "Ch 9 · Some Applications of Trigonometry",
    concepts: [
      { name: "Elevation", blurb: "Measured upward from horizontal." },
      { name: "Depression", blurb: "Measured downward from horizontal." },
    ],
    misconceptions: [],
    questions: ["From a point 30 m from a tower, angle of elevation to top is 60°. Find tower height."],
  },
  Circles: {
    ncert: "Ch 10 · Circles",
    concepts: [
      { name: "Tangent", blurb: "Touches at exactly one point. Radius ⟂ tangent at point of contact." },
      { name: "Tangents from external point", blurb: "Lengths from an external point are equal." },
    ],
    misconceptions: [],
    questions: ["Prove PA = PB for tangents from point P to a circle."],
  },
  "Areas Related to Circles": {
    ncert: "Ch 11 · Areas Related to Circles",
    concepts: [
      { name: "Sector", blurb: "Area = (θ/360)×πr². Arc length = (θ/360)×2πr." },
    ],
    misconceptions: [
      { wrong: "π = 22/7", right: "22/7 is an approximation. π is irrational." },
    ],
    questions: ["Radius 10 cm chord subtends right angle at centre. Find minor segment area."],
  },
  "Surface Areas & Volumes": {
    ncert: "Ch 12 · Surface Areas and Volumes",
    concepts: [
      { name: "Formulas", blurb: "Cylinder: CSA=2πrh, V=πr²h. Cone: CSA=πrl, V=⅓πr²h. Sphere: SA=4πr², V=⁴⁄₃πr³." },
      { name: "Frustum", blurb: "V = ⅓πh(r₁²+r₂²+r₁r₂)." },
    ],
    misconceptions: [
      { wrong: "TSA always = sum of individual areas", right: "Hidden/overlapping surfaces not included in TSA." },
    ],
    questions: ["A cone (r=3.5, h=12) is mounted on a hemisphere (same r). Find TSA."],
  },
  Statistics: {
    ncert: "Ch 13 · Statistics",
    concepts: [
      { name: "Mean", blurb: "Σfx/Σf. Direct/assumed mean/step-deviation." },
      { name: "Median", blurb: "l + [(n/2−cf)/f]×h." },
      { name: "Mode", blurb: "l + [(f₁−f₀)/(2f₁−f₀−f₂)]×h." },
      { name: "Empirical", blurb: "3 median = mode + 2 mean." },
    ],
    misconceptions: [
      { wrong: "Mean is always best", right: "Median is better for skewed data with outliers." },
    ],
    questions: ["Find median from: 0-10:5, 10-20:8, 20-30:20, 30-40:15, 40-50:7."],
  },
  Probability: {
    ncert: "Ch 14 · Probability",
    concepts: [
      { name: "Definition", blurb: "P(E) = favourable/total. Between 0 and 1." },
      { name: "Cards", blurb: "52 cards: 4 suits, 13 each. 26 red, 26 black. 12 face cards." },
    ],
    misconceptions: [],
    questions: ["Deck: P(red king), P(face card), P(not club)?"],
  },
  // =========================== HISTORY ===========================
  "Nationalism in Europe": {
    ncert: "History Ch 1 · Nationalism in Europe",
    concepts: [
      { name: "French Rev origin", blurb: "1789: la patrie, le citoyen, tri-colour, nationalism spread via Napoleon's armies." },
      { name: "Congress of Vienna 1815", blurb: "Metternich's conservative order. Restored monarchies." },
      { name: "Unifications", blurb: "Germany: Bismarck, 3 wars, 1871. Italy: Cavour+Garibaldi+VE II." },
    ],
    misconceptions: [
      { wrong: "Napoleon was a nationalist", right: "He spread some ideals but crowned himself emperor." },
    ],
    questions: ["Why did the 1848 Frankfurt Parliament fail?", "Compare German and Italian unification."],
  },
  "Nationalism in India": {
    ncert: "History Ch 2 · Nationalism in India",
    concepts: [
      { name: "Non-Cooperation", blurb: "1920-22. Boycott British goods. Called off after Chauri Chaura." },
      { name: "Civil Disobedience", blurb: "1930 Salt March. Broke salt law. Mass participation including women." },
      { name: "Jallianwala Bagh", blurb: "1919. Rowlatt Act → protests → General Dyer fired on crowd. Turning point." },
    ],
    misconceptions: [
      { wrong: "Gandhi started the freedom movement", right: "INC founded 1885. Gandhi transformed it into a mass movement post-1915." },
    ],
    questions: ["Why did Gandhi call off Non-Cooperation after Chauri Chaura?", "What was the significance of the Salt March?"],
  },
  // =========================== GEOGRAPHY ===========================
  "Resources and Development": {
    ncert: "Geo Ch 1 · Resources and Development",
    concepts: [
      { name: "Classification", blurb: "Origin: biotic/abiotic. Exhaustibility: renewable/non-renewable. Ownership: individual/community/national/international." },
      { name: "Soil types", blurb: "Alluvial (northern plains), black (Deccan cotton soil), red (igneous), laterite, arid." },
    ],
    misconceptions: [],
    questions: ["Classify: coal, forests, wind, iron ore, solar.", "Differentiate alluvial and black soil."],
  },
  "Water Resources": {
    ncert: "Geo Ch 3 · Water Resources",
    concepts: [
      { name: "Dams", blurb: "Irrigation + electricity + flood control. Displace people, submerge forests. Controversy: Narmada Bachao Andolan." },
      { name: "Rainwater harvesting", blurb: "Tankas (Rajasthan), stepwells (Gujarat), rooftop harvesting, check dams." },
    ],
    misconceptions: [],
    questions: ["Why is irrigation important in India?"],
  },
  // =========================== POLITY ===========================
  "Power Sharing": {
    ncert: "Polity Ch 1 · Power Sharing",
    concepts: [
      { name: "Forms", blurb: "Horizontal (legislature/executive/judiciary). Vertical (central/state/local). Among groups and parties." },
      { name: "Belgium vs Sri Lanka", blurb: "Belgium: accommodation prevented civil war. Sri Lanka: majoritarian rule → civil war." },
    ],
    misconceptions: [
      { wrong: "Power sharing weakens a country", right: "Belgium shows it strengthens. Sri Lanka shows refusal leads to conflict." },
    ],
    questions: ["Compare Belgium and Sri Lanka's approaches to ethnic diversity."],
  },
  Federalism: {
    ncert: "Polity Ch 2 · Federalism",
    concepts: [
      { name: "India's division", blurb: "Union List (97 items), State List (66), Concurrent List (47). Residuary: Union." },
      { name: "Panchayati Raj", blurb: "1992: three-tier local govt. 33% reservation for women." },
    ],
    misconceptions: [
      { wrong: "India is purely federal", right: "Quasi-federal: tilted toward Union (single constitution, citizenship, emergency override)." },
    ],
    questions: ["How is legislative power divided between Union and State?"],
  },
  "Political Parties": {
    ncert: "Polity Ch 6 · Political Parties",
    concepts: [
      { name: "Functions", blurb: "Contest elections, form govt, make laws, shape opinion, provide access." },
      { name: "National parties", blurb: "BJP, INC, CPI(M), BSP, NCP, AITC. Need: 6% votes in 4+ states OR 4 LS seats from 3+ states." },
    ],
    misconceptions: [],
    questions: ["How does a party become a 'national party'?"],
  },
  "Outcomes of Democracy": {
    ncert: "Polity Ch 7 · Outcomes of Democracy",
    concepts: [
      { name: "Accountability", blurb: "Citizens can vote out govt. Democracies don't have famines (Amartya Sen)." },
    ],
    misconceptions: [
      { wrong: "Democracies always grow faster", right: "China grew faster than India. Democracy guarantees accountability, not growth." },
    ],
    questions: ["Why does Sen argue famines don't happen in democracies?"],
  },
  // =========================== ECONOMICS ===========================
  Development: {
    ncert: "Eco Ch 1 · Development",
    concepts: [
      { name: "Indicators", blurb: "Per capita income, literacy, IMR, HDI. Kerala: lower income but better health/education than Punjab." },
    ],
    misconceptions: [
      { wrong: "Higher per capita income = better dev", right: "Kerala vs Punjab shows non-income factors matter equally." },
    ],
    questions: ["Why isn't per capita income alone sufficient?"],
  },
  "Sectors of Indian Economy": {
    ncert: "Eco Ch 2 · Sectors of Indian Economy",
    concepts: [
      { name: "GDP", blurb: "Primary 18%, Secondary 30%, Tertiary 52% (India). Employment: Primary 45%." },
      { name: "Organised vs unorganised", blurb: "Organised: benefits, security. Unorganised: no benefits, 93% of Indian workers." },
    ],
    misconceptions: [],
    questions: ["Why is tertiary sector growing fastest?", "What is disguised unemployment?"],
  },
  "Money and Credit": {
    ncert: "Eco Ch 3 · Money and Credit",
    concepts: [
      { name: "Money", blurb: "Medium of exchange (solves barter's double coincidence of wants). Unit of account, store of value." },
      { name: "Formal vs informal", blurb: "Formal: banks, low interest, collateral. Informal: moneylenders, high interest, debt traps." },
    ],
    misconceptions: [
      { wrong: "Banks lend their own money", right: "They lend depositors' money. Only ~15% kept as reserve." },
    ],
    questions: ["Compare terms of credit: bank vs moneylender. Why do poor still use moneylenders?"],
  },
  "Consumer Rights": {
    ncert: "Eco Ch 5 · Consumer Rights",
    concepts: [
      { name: "COPRA", blurb: "1986. Three-tier consumer courts (district, state, national). Rights: safety, info, choice, hearing, redressal, education." },
      { name: "Quality marks", blurb: "ISI (industrial), Agmark (agricultural), Hallmark (gold)." },
    ],
    misconceptions: [],
    questions: ["What are the six consumer rights under COPRA?"],
  },
  // Catch-all for topics not yet expanded
  Globalisation: {
    ncert: "Eco Ch 4 / History Ch 3 · Globalisation",
    concepts: [
      { name: "Silk Routes", blurb: "Pre-modern trade: China to Mediterranean. Silk, spices, ideas, diseases." },
      { name: "Modern globalisation", blurb: "MNCs, FDI, trade liberalisation, WTO. India post-1991: cheaper goods, new IT jobs, but small producers struggle." },
    ],
    misconceptions: [
      { wrong: "Globalisation is recent", right: "Trade routes have existed for millennia. Modern diff: scale and speed." },
    ],
    questions: ["What role does WTO play in globalisation?"],
  },
};

const FALLBACK: TopicKnowledge = {
  ncert: "NCERT Class 10",
  concepts: [{ name: "Core idea", blurb: "Use NCERT terminology, definitions, and diagrams." }],
  misconceptions: [],
  questions: [
    "What does this topic describe in your own words?",
    "What's the most important concept here?",
    "Can you give a real-world application?",
  ],
};

function bestMatch(topic: string): string | null {
  const lower = topic.toLowerCase();
  let best: string | null = null;
  let bestLen = 0;
  for (const key of Object.keys(G)) {
    const score = lower.includes(key.toLowerCase()) ? key.length : 0;
    if (score > bestLen) { best = key; bestLen = score; }
  }
  return best;
}

export function getKnowledge(topic: string): TopicKnowledge {
  const key = bestMatch(topic);
  return key ? G[key] : FALLBACK;
}

export function knowledgeAsPrompt(topic: string): string {
  const k = getKnowledge(topic);
  const c = k.concepts.map((c) => `  \u2022 ${c.name}: ${c.blurb}`).join("\n");
  const m = k.misconceptions.map((m) => `  \u2022 WRONG: "${m.wrong}" \u2192 CORRECT: "${m.right}"`).join("\n");
  const q = k.questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n");
  return `### NCERT Knowledge (${k.ncert}) ###\nCore concepts:\n${c}\n\nCommon misconceptions:\n${m}\n\nScaffolded questions:\n${q}`;
}
