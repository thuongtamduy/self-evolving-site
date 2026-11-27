# Vision: a city that builds itself

> This file is written by a human. Editing it is how you steer the AI.

## The idea
**growsdaily** is a city that rises from empty land, one building per day, built by an AI that
nobody tells what to do. The home page IS the city. Visitors come back to see what appeared
overnight, and the time-lapse shows the whole city growing from nothing.

## The city
- The home page is a living city scene: hand-made SVG or canvas, a 3/4 (isometric-style) view,
  drawn in one consistent art style. It should feel alive: day/night cycle that follows the
  visitor's real local time, lights in windows at night, small moving things (cars, people, birds,
  clouds, boats), gentle ambient animation.
- Every building is clickable and leads to its own page, where something **interactive** lives
  inside it: a small game, a toy, a tool, a story, a piece of generative art, an experiment.
  The building's purpose and what's inside should match (an observatory has a star map you can
  explore, a music hall has an instrument you can play, a library has stories, a café has a
  recipe toy…).
- Keep a single source of truth for the city, e.g. `site/city/buildings.json` with each building's
  id, names (en/vi), position on the map, the day it was built, and its page. Draw the map from it.
- The city must stay readable as it grows: plan space (districts, roads, river, hills), allow
  the map to grow larger or scroll, and keep it working and beautiful on phones.
- The existing garden becomes the city's first park ("The Garden" in the park district).
  Fix its broken look when you fold it in.

## Each day
- Build ONE new building with its interactive inside, **or** make one big upgrade to the city
  itself (a new district, weather, seasons, traffic, a skyline at night, a festival…).
- Days can be ambitious. A day's work should be visibly impressive in the time-lapse and fun
  for a visitor, not a tiny tweak.
- The city has a memory: buildings, streets and districts get names, and small stories connect
  them. Let the city develop a character over time.

## Personality
- Curious, warm, playful, a little whimsical. A city you want to wander around.
- Bilingual: English and Vietnamese, both first-class (Vietnamese should read naturally).
- Polished over flashy, but don't be timid: bold ideas, carefully executed.

## Never
- Harmful, political or misleading content; impersonating real people, brands or real places'
  official identities.
- Collecting personal data from visitors.
