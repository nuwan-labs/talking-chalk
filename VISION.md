# Talking Chalk — Product Vision

> **A chalkboard that draws back.**

## The scene we're building toward

A five-year-old draws a lumpy circle and stops. Two seconds pass. A warm
voice says *"Ooh, what is that? Let me think…"* — and a piece of chalk,
wobbly and unhurried, sketches a little hat on top of the circle. The child
laughs, grabs the board, and adds legs. The chalk waits its turn.

Twenty minutes later there's a whole world on the board, and the child made
most of it. That's the product. Not the picture — the volley.

## Why this, why now

Generative AI hands children finished pictures at zero cost. Type a wish,
receive a masterpiece. That teaches *asking*, not *making* — the magic
arrives without them, and their own wobbly lines look worse by comparison.

Meanwhile, the best drawing experience a child can have is old and analog:
a grownup who doodles alongside them, asks "what's that?", and adds a star
to their sky. It's magical and it's scarce, because adult attention is the
bottleneck.

Talking Chalk bottles that companion. Always patient, always delighted,
never takes over. It exists to make children **braver and more prolific
artists** — the opposite goal of every image generator on the market.

## Who it's for

- **Children roughly 3–8**, drawing with a finger or stylus on a shared
  canvas. They are the artist. Always.
- **Their grownups**, who get twenty minutes of a child creating instead of
  consuming — and who can trust what the companion says and draws.
- Later: educators, siblings, grandparents on the other side of the world.

## Principles

These aren't aspirations — each one is already enforced in the engine, and
every future feature must keep them true.

### 1. The child always holds the chalk
Touching the board interrupts the AI *instantly*, mid-stroke. The AI only
takes a turn after the child pauses. Authorship never transfers — the log
entry for an interrupt is literally `"Child took the chalk"`, and that's
the correct power dynamic forever.

### 2. Never finish the picture
Hard cap of 1–3 strokes per AI turn. The companion's job is to open doors
(*"a hat! does he need a friend?"*), never to close them. If the AI ever
completes a drawing, we've built the wrong product.

### 3. Draw like a hand, not a printer
Every AI stroke is wobbly, chalky, and animated at human speed — spline
smoothing, tremor, dust, a natural velocity curve. This isn't decoration;
it's pedagogy. A stroke a child can *watch happen* is a stroke they can
copy. **If a child couldn't imitate it, we shouldn't draw it.**

### 4. A companion, not a feature
It speaks, wonders, and reacts. Even the wait is in character — filler
phrases fill the thinking silence, because a friend doesn't go blank-faced
for eight seconds. Personality is the product; the model behind it is an
implementation detail.

### 5. Wobble is beautiful
The chalk aesthetic celebrates imperfection so a child never measures
their lines against machine-perfect output. Seeded wobble isn't a style
choice we might A/B test away — it's a moral position.

### 6. Teach inside the play
The engine already knows about Ghost, Construction, Defining, and Detail
phases — how real artists actually build a drawing — and the schema asks
for Socratic `thought`s. The teaching stays hidden inside play: no lessons,
no scores, no red marks. (Corrections render in a warm tint, never an
angry one.)

### 7. Safe by construction
Input is drawings; output is strokes and short spoken lines. No free-text
chat, no feed, no gallery, no comparison, no streaks. The surface area for
harm stays as small as the product's heart is big.

## What it is not

- **Not a prompt-to-image toy.** It never produces a finished artwork.
- **Not a critic or tutor.** It never grades, corrects uninvited, or says
  "actually, horses have four legs."
- **Not autonomous entertainment.** It does nothing until the child draws.
  A blank board stays blank. The child is the ignition.

## Horizons

**H1 — Perfect the volley (now).**
One flawless loop: draw → pause → voice → strokes streaming onto the board
before the response even finishes. Tablet-first, latency hidden behind
personality, TTS that never leaves dead air. The current codebase is this
horizon in rough form.

**H2 — A friend with a memory.**
The companion remembers Tuesday's dragon. Drawing games emerge from the
turn structure we already have: the squiggle game, "can you add a door?",
guess-what-I'm-drawing. The phase system graduates from internal plumbing
to an optional learn-to-draw mode — ghost strokes as gentle scaffolding a
child can trace.

**H3 — The board gets bigger.**
Shared boards: a grandparent doodles from another city and the AI becomes
the third player. Classrooms with one companion and many hands. The board
escapes the browser — a projected wall, an e-ink easel, a museum kiosk.
Anywhere there's a surface and a child, the chalk can live there.

## How we'll know it's working

We measure **turns, not time**.

- Long child↔AI volleys per session — the rally is the product.
- Child strokes far outnumber AI strokes. If that ratio ever inverts,
  we've drifted into being a generator and must steer back.
- Children return to draw *with* it, not to watch it perform.
- The qualitative bar: a parent hears laughing from the other room.

## A note on the name

The repo says **Talking Chalk**; the UI says **Magic Slate**. Pick the
chalk. "Magic Slate" names an object; "Talking Chalk" names a *character*
— and the character is the product. A talking piece of chalk can have a
voice, a memory, a face on a lunchbox. Slates can't.
