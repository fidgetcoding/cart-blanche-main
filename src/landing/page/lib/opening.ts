// Which sections open the page ahead of the story. C shipped: the story follows the hero.
//   A  hero, Problem, System (the Hand), then the story
//   B  hero, System (the Hand), then the story
//   C  hero, then the story
// The opening glide, the pill nav and the progress bars follow whatever is left on the page.
export type Opening = 'A' | 'B' | 'C';
export const OPENING: Opening = 'C';

export const sectionsFor = (o: Opening) => ({ problem: o === 'A', system: o !== 'C' });
