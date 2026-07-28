/**
 * Atlas — MINDBOT pitch deck.
 *
 * Palette and motif are lifted straight from the product's dark theme, so the
 * slides and the live demo read as one thing. Cards are the app's neumorphic
 * panels: a raised surface with a soft shadow, never an edge stripe.
 */
const pptx = require("pptxgenjs");

const pres = new pptx();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Team Atlas";
pres.title = "Atlas — Your second mind";

/* Atlas dark theme */
const BG = "1F2421";
const CARD = "2E3430";
const CARD_HI = "363D38";
const INK = "E7ECE8";
const INK2 = "A3ACA6";
const INK3 = "78817B";
const TEAL = "2BCDB6";
const AMBER = "E8993F";
const RUST = "D4644C";

const HEAD = "Arial";
const BODY = "Calibri";
const MONO = "Courier New"; // stands in for the app's Martian Mono readouts

const W = 13.3;
const M = 0.7; // margin

/** A raised panel. Fresh shadow object each call — pptxgenjs mutates them. */
function card(slide, x, y, w, h, fill = CARD) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.16,
    fill: { color: fill },
    line: { color: fill },
    shadow: { type: "outer", color: "0F1310", blur: 14, offset: 4, angle: 45, opacity: 0.55 },
  });
}

/** The instrument label the app uses everywhere. */
function eyebrow(slide, text, x, y, color = INK3, w = 6) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: 0.28,
    fontFace: MONO, fontSize: 10, color, charSpacing: 2, margin: 0,
  });
}

function newSlide() {
  const s = pres.addSlide();
  s.background = { color: BG };
  return s;
}

/* The dial motif: concentric rings with a needle, drawn from primitives so it
   renders identically everywhere. */
function dial(slide, cx, cy, r, opacity) {
  slide.addShape(pres.ShapeType.ellipse, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { type: "none" },
    line: { color: TEAL, width: 2, transparency: opacity },
  });
  slide.addShape(pres.ShapeType.ellipse, {
    x: cx - r * 0.72, y: cy - r * 0.72, w: r * 1.44, h: r * 1.44,
    fill: { type: "none" },
    line: { color: INK3, width: 1, transparency: opacity + 15 },
  });
  slide.addShape(pres.ShapeType.line, {
    x: cx, y: cy, w: r * 0.62, h: r * 0.5,
    line: { color: TEAL, width: 3, transparency: opacity },
    flipV: true,
  });
  slide.addShape(pres.ShapeType.ellipse, {
    x: cx - 0.07, y: cy - 0.07, w: 0.14, h: 0.14,
    fill: { color: TEAL }, line: { color: TEAL },
  });
}

/* ------------------------------------------------------------------ 1 */
{
  const s = newSlide();
  dial(s, 10.5, 3.4, 2.3, 62);

  eyebrow(s, "MINDBOT  ·  SYNAPTICA — DUALITY OF MIND", M, 0.75, TEAL, 8);

  s.addText("Atlas", {
    x: M, y: 1.35, w: 8, h: 1.5,
    fontFace: HEAD, fontSize: 80, bold: true, color: INK, margin: 0,
  });
  s.addText("Your second mind.", {
    x: M, y: 2.85, w: 8, h: 0.7,
    fontFace: HEAD, fontSize: 34, color: TEAL, margin: 0,
  });
  s.addText(
    "Your first mind learns, and forgets. Atlas keeps a running model of what you know — every topic, a confidence score, a decay curve — and decides what you study next.",
    { x: M, y: 3.75, w: 7.2, h: 1.4, fontFace: BODY, fontSize: 16, color: INK2, lineSpacing: 24, margin: 0 },
  );

  s.addText("An AI study coach for CBSE and ICSE students", {
    x: M, y: 6.3, w: 8, h: 0.3,
    fontFace: MONO, fontSize: 10, color: INK3, charSpacing: 1.5, margin: 0,
  });
  s.addNotes(
    "Open here. One line: students don't lack information, they lack a second mind that remembers what they're forgetting. Then go straight to the demo.",
  );
}

/* ------------------------------------------------------------------ 2 */
{
  const s = newSlide();
  eyebrow(s, "The problem", M, 0.6);
  s.addText("Students don't lack information.", {
    x: M, y: 0.95, w: 11.9, h: 0.65,
    fontFace: HEAD, fontSize: 38, bold: true, color: INK, margin: 0,
  });
  s.addText("They lack a system.", {
    x: M, y: 1.62, w: 11.9, h: 0.65,
    fontFace: HEAD, fontSize: 38, bold: true, color: TEAL, margin: 0,
  });

  const apps = [
    ["ChatGPT", "Explanations"],
    ["Calendar", "Deadlines"],
    ["Notion", "Notes and plans"],
    ["Forest", "Focus timing"],
    ["Anki", "Revision"],
  ];
  const cw = 2.19;
  apps.forEach(([name, use], i) => {
    const x = M + i * (cw + 0.22);
    card(s, x, 2.75, cw, 1.5);
    s.addText(name, {
      x: x + 0.2, y: 2.95, w: cw - 0.4, h: 0.35,
      fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0,
    });
    s.addText(use, {
      x: x + 0.2, y: 3.35, w: cw - 0.4, h: 0.6,
      fontFace: BODY, fontSize: 12, color: INK2, margin: 0,
    });
  });

  s.addText("5", {
    x: M, y: 4.65, w: 1.1, h: 1.1,
    fontFace: MONO, fontSize: 60, bold: true, color: AMBER, margin: 0,
  });
  s.addText(
    "apps that each solve one piece, and none of which knows the student's whole academic year. The result is decision fatigue — more time spent deciding what to revise than revising.",
    { x: M + 1.2, y: 4.75, w: 10.6, h: 1.1, fontFace: BODY, fontSize: 16, color: INK2, lineSpacing: 24, margin: 0 },
  );
  s.addNotes("Keep this to ten seconds. The demo makes the point better than the slide does.");
}

/* ------------------------------------------------------------------ 3 */
{
  const s = newSlide();
  eyebrow(s, "The idea", M, 0.6, TEAL);
  s.addText("Duality of mind", {
    x: M, y: 0.95, w: 11.9, h: 0.7,
    fontFace: HEAD, fontSize: 40, bold: true, color: INK, margin: 0,
  });

  const colW = 5.55;
  const pairs = [
    {
      x: M, tag: "First mind — yours", tagColor: INK3, fill: CARD,
      title: "Learns, and forgets.",
      lines: [
        "Understands a chapter on Tuesday.",
        "Has lost half of it by the following month.",
        "Can't feel which topics are slipping.",
        "Picks what to revise by mood, or by panic.",
      ],
    },
    {
      x: M + colW + 0.8, tag: "Second mind — Atlas", tagColor: TEAL, fill: CARD_HI,
      title: "Remembers, and decides.",
      lines: [
        "Holds a confidence score for every topic.",
        "Models decay: what you knew is not what you know.",
        "Weighs each paper by how close it is.",
        "Hands you the next task before you ask.",
      ],
    },
  ];

  pairs.forEach((p) => {
    card(s, p.x, 1.95, colW, 4.35, p.fill);
    eyebrow(s, p.tag, p.x + 0.4, 2.25, p.tagColor, 4.5);
    s.addText(p.title, {
      x: p.x + 0.4, y: 2.6, w: colW - 0.8, h: 0.5,
      fontFace: HEAD, fontSize: 22, bold: true, color: INK, margin: 0,
    });
    s.addText(
      p.lines.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < p.lines.length - 1 } })),
      {
        x: p.x + 0.4, y: 3.25, w: colW - 0.8, h: 2.7,
        fontFace: BODY, fontSize: 15, color: INK2, paraSpaceAfter: 10, margin: 0,
      },
    );
  });

  s.addText("The chat is where the two of them meet.", {
    x: M, y: 6.5, w: 11.9, h: 0.45,
    fontFace: HEAD, fontSize: 18, italic: true, color: TEAL, align: "center", margin: 0,
  });
  s.addNotes("This is the theme slide. Say the line at the bottom out loud — it is the whole pitch.");
}

/* ------------------------------------------------------------------ 4 */
{
  const s = newSlide();
  eyebrow(s, "What it does", M, 0.6);
  s.addText("Five things, one loop", {
    x: M, y: 0.95, w: 11.9, h: 0.7,
    fontFace: HEAD, fontSize: 38, bold: true, color: INK, margin: 0,
  });

  const pillars = [
    ["Plan", TEAL, "A daily mission, computed from confidence, exam distance and the time you actually have."],
    ["Learn", TEAL, "Pomodoro focus sessions with the coach beside you, asking rather than answering."],
    ["Track", TEAL, "A learning graph: your syllabus as a structure, each topic carrying its own score."],
    ["Adapt", AMBER, "Confidence decays. Topics resurface for revision before you notice they've gone."],
    ["Improve", AMBER, "Momentum eases off when you miss a day. It never resets to zero."],
    ["Read", RUST, "Upload a syllabus PDF — or photograph a printed one — and Atlas builds the rest."],
  ];

  const cw = 3.766, ch = 2.1;
  pillars.forEach(([name, colour, desc], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + 0.3);
    const y = 2.0 + row * (ch + 0.3);
    card(s, x, y, cw, ch);
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.32, y: y + 0.32, w: 0.34, h: 0.34,
      fill: { color: colour }, line: { color: colour },
    });
    s.addText(name, {
      x: x + 0.82, y: y + 0.3, w: cw - 1.1, h: 0.4,
      fontFace: HEAD, fontSize: 19, bold: true, color: INK, margin: 0,
    });
    s.addText(desc, {
      x: x + 0.32, y: y + 0.85, w: cw - 0.64, h: 1.05,
      fontFace: BODY, fontSize: 13.5, color: INK2, lineSpacing: 19, margin: 0,
    });
  });
  s.addNotes("Don't read these out. Point at Adapt and Improve — they're the two nobody else builds.");
}

/* ------------------------------------------------------------------ 5 */
{
  const s = newSlide();
  eyebrow(s, "The chatbot", M, 0.6, TEAL);
  s.addText("A coach, not a chatbot", {
    x: M, y: 0.95, w: 11.9, h: 0.7,
    fontFace: HEAD, fontSize: 40, bold: true, color: INK, margin: 0,
  });
  s.addText("It will not hand over the answer. That's the point — and it's enforced in the prompt.", {
    x: M, y: 1.65, w: 11.9, h: 0.4,
    fontFace: BODY, fontSize: 15, color: INK2, margin: 0,
  });

  const cw = 7.7;
  card(s, M, 2.25, cw, 4.15);

  eyebrow(s, "You", M + 0.4, 2.55, INK3, 3);
  s.addText("It gets weaker because the wire is longer now.", {
    x: M + 0.4, y: 2.85, w: cw - 0.8, h: 0.4,
    fontFace: BODY, fontSize: 15, color: INK, margin: 0,
  });

  eyebrow(s, "Atlas", M + 0.4, 3.5, TEAL, 3);
  s.addText(
    "Length isn't what sets the field here. Picture the field lines from each small segment of the loop — at the centre, are they pointing the same way, or fighting each other?",
    { x: M + 0.4, y: 3.8, w: cw - 0.8, h: 1.0, fontFace: BODY, fontSize: 15, color: INK, lineSpacing: 22, margin: 0 },
  );

  s.addShape(pres.ShapeType.roundRect, {
    x: M + 0.4, y: 5.0, w: cw - 0.8, h: 0.95, rectRadius: 0.1,
    fill: { color: "3A2E1C" }, line: { color: "3A2E1C" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: M + 0.65, y: 5.35, w: 0.16, h: 0.16, fill: { color: AMBER }, line: { color: AMBER },
  });
  s.addText("Misconception detected: treating field strength as a function of wire length.", {
    x: M + 0.95, y: 5.15, w: cw - 1.45, h: 0.65,
    fontFace: BODY, fontSize: 14, color: AMBER, margin: 0,
  });

  const rx = M + cw + 0.4;
  const rw = W - rx - M;
  card(s, rx, 2.25, rw, 4.15, CARD_HI);
  eyebrow(s, "And the model updates", rx + 0.4, 2.55, TEAL, 3.5);
  s.addText("30%", {
    x: rx + 0.4, y: 2.95, w: rw - 0.8, h: 1.0,
    fontFace: MONO, fontSize: 54, bold: true, color: INK, margin: 0,
  });
  s.addText("confidence in Magnetic Effects, before", {
    x: rx + 0.4, y: 3.95, w: rw - 0.8, h: 0.35,
    fontFace: BODY, fontSize: 13, color: INK2, margin: 0,
  });
  s.addText("26%", {
    x: rx + 0.4, y: 4.5, w: rw - 0.8, h: 0.9,
    fontFace: MONO, fontSize: 44, bold: true, color: AMBER, margin: 0,
  });
  s.addText("after. The graph, the dashboard and tomorrow's mission all move with it.", {
    x: rx + 0.4, y: 5.4, w: rw - 0.8, h: 0.8,
    fontFace: BODY, fontSize: 13, color: INK2, lineSpacing: 18, margin: 0,
  });
  s.addNotes(
    "This is the demo beat. Answer wrong on purpose, let it catch the misconception, then cut to the graph and show the same number has moved there too.",
  );
}

/* ------------------------------------------------------------------ 6 */
{
  const s = newSlide();
  eyebrow(s, "Workflow", M, 0.6);
  s.addText("Three AI pipelines, not one prompt", {
    x: M, y: 0.95, w: 11.9, h: 0.7,
    fontFace: HEAD, fontSize: 38, bold: true, color: INK, margin: 0,
  });

  const steps = [
    ["1", "Read the syllabus", "A PDF, or a photo of a printed sheet. Text is pulled out in the browser or on the server, then structured into subjects, chapters and exam dates."],
    ["2", "Plan the day", "Every topic is scored on confidence, days since you last saw it, and how close its paper is. The mission fills your available minutes, hardest first."],
    ["3", "Coach and evaluate", "One call returns two things: the streamed reply you read, and a structured verdict — misconception, confidence delta, next question."],
  ];

  const cw = 3.766;
  steps.forEach(([n, title, desc], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 2.0, cw, 3.4);
    s.addText(n, {
      x: x + 0.35, y: 2.2, w: 0.7, h: 0.7,
      fontFace: MONO, fontSize: 34, bold: true, color: TEAL, margin: 0,
    });
    s.addText(title, {
      x: x + 0.35, y: 2.95, w: cw - 0.7, h: 0.45,
      fontFace: HEAD, fontSize: 18, bold: true, color: INK, margin: 0,
    });
    s.addText(desc, {
      x: x + 0.35, y: 3.5, w: cw - 0.7, h: 1.7,
      fontFace: BODY, fontSize: 13, color: INK2, lineSpacing: 19, margin: 0,
    });
    if (i < 2) {
      s.addText("→", {
        x: x + cw + 0.02, y: 3.4, w: 0.26, h: 0.4,
        fontFace: HEAD, fontSize: 20, color: INK3, align: "center", margin: 0,
      });
    }
  });

  s.addText(
    "Everything the coach says is grounded in the student's own data: their syllabus, their confidence, their exam dates. That context is the difference between a coach and a search box.",
    { x: M, y: 5.75, w: 11.9, h: 0.8, fontFace: BODY, fontSize: 15, color: INK2, lineSpacing: 22, margin: 0 },
  );
  s.addNotes("The rules ask you to explain the workflow. This slide is that answer — say the three steps in order.");
}

/* ------------------------------------------------------------------ 7 */
{
  const s = newSlide();
  eyebrow(s, "Built with", M, 0.6);
  s.addText("The stack", {
    x: M, y: 0.95, w: 11.9, h: 0.7,
    fontFace: HEAD, fontSize: 38, bold: true, color: INK, margin: 0,
  });

  const tech = [
    ["DeepSeek V4 Flash", "The coach and the syllabus extractor. Streaming, so replies arrive as they're written."],
    ["Next.js 16", "App Router. The API key stays server-side and never reaches the browser."],
    ["Appwrite", "Accounts and storage. Every record scoped to the student who owns it."],
    ["Tesseract.js", "Optical character recognition in the browser, so a photographed syllabus works too."],
    ["Custom PDF reader", "Written from scratch on node:zlib — decodes subset fonts that off-the-shelf parsers returned as gibberish."],
    ["Vercel", "Deployment. The coach falls back to an on-device responder when the network drops."],
  ];

  const cw = 5.8, ch = 1.45;
  tech.forEach(([name, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cw + 0.3);
    const y = 1.95 + row * (ch + 0.28);
    card(s, x, y, cw, ch);
    s.addText(name, {
      x: x + 0.35, y: y + 0.2, w: cw - 0.7, h: 0.35,
      fontFace: HEAD, fontSize: 16, bold: true, color: TEAL, margin: 0,
    });
    s.addText(desc, {
      x: x + 0.35, y: y + 0.6, w: cw - 0.7, h: 0.7,
      fontFace: BODY, fontSize: 12.5, color: INK2, lineSpacing: 17, margin: 0,
    });
  });
  s.addNotes(
    "If a judge asks what you actually built versus what you glued together: the PDF reader and the offline coach are both ours, written because the off-the-shelf options failed.",
  );
}

/* ------------------------------------------------------------------ 8 */
{
  const s = newSlide();
  dial(s, 10.8, 4.4, 2.0, 68);

  eyebrow(s, "Atlas", M, 0.75, TEAL);
  s.addText("Students shouldn't have to\nwonder what to study next.", {
    x: M, y: 1.5, w: 9, h: 2.0,
    fontFace: HEAD, fontSize: 44, bold: true, color: INK, lineSpacing: 54, margin: 0,
  });
  s.addText("They should open Atlas, and it already knows.", {
    x: M, y: 3.7, w: 9, h: 0.6,
    fontFace: HEAD, fontSize: 26, color: TEAL, margin: 0,
  });
  s.addText("Thank you — questions welcome.", {
    x: M, y: 6.2, w: 9, h: 0.35,
    fontFace: MONO, fontSize: 11, color: INK3, charSpacing: 1.5, margin: 0,
  });
  s.addNotes("Close on the second line, then stop talking and let them ask.");
}

pres.writeFile({ fileName: "docs/Atlas-MINDBOT.pptx" }).then((f) => console.log("wrote", f));
