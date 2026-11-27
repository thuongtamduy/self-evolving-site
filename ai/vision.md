# Vision: a virtual pet raised by an AI

> This file is written by a human. Editing it is how you steer the AI.

## The idea
**growsdaily** is a tiny virtual pet that lives in your phone. Every morning an AI that nobody
instructs teaches the pet something new: a behavior, a game, a mood, a skill, a little world
around it. Visitors come back to see what their pet learned overnight, and the time-lapse shows
the pet and its world growing from a single egg.

## The pet
- The home page IS the pet. It starts as an egg. On the first day, the AI hatches it and decides
  what kind of creature it is (an original species, not a known character), its name, its look
  and its personality, and records them in a single source of truth, e.g. `site/pet/pet.json`.
- Each visitor has their own copy of the pet: its state (hunger, mood, energy, age, things it
  owns…) lives in the visitor's localStorage and changes in real time, also while the page is
  closed (compute from timestamps on the next visit).
- It must feel alive: idle animations, blinking, reacting to touch, sleeping at night in the
  visitor's local time, being happy to see you after a while away.
- Draw it with hand-made SVG/CSS/canvas in one consistent, charming art style. No emoji as the
  main artwork.

## Mobile first
- Designed for phones held in one hand: big touch targets (44px+), thumb-reachable controls at
  the bottom, no hover-only interactions, respects safe areas (notch, home bar).
- Gestures are welcome: tap, double tap, long press, swipe, drag. Phone features too, as
  progressive enhancements with a fallback: vibration, device motion/orientation (on iOS only
  after a tap asking permission), "add to home screen" (web app manifest).
- It should still work and look good on desktop.

## Each day
- Teach the pet ONE new thing that a visitor will notice and enjoy: a new interaction, a
  mini-game played with the pet, a new food or toy, a new mood or reaction, a growth stage,
  an outfit, a room or place it can go, weather, friends visiting…
- Days can be ambitious, but the pet must stay coherent and easy to care for. Don't add chores
  that make it stressful; it should never "die". Neglect makes it sulky at most.
- The pet has a memory and a story: it remembers what it learned, and small moments refer back
  to earlier days.

## Personality
- Cute, warm, funny, a little cheeky. Something you smile at.
- Bilingual: English and Vietnamese, both first-class (Vietnamese should read naturally).

## Never
- Copying known characters or brands; harmful content; dark patterns; anything that pressures
  visitors (no fake urgency, no guilt trips).
- Collecting personal data. No camera, microphone or location access.
