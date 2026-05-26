/** Writing prompts surfaced in the scratchpad and prompt cards. */

export const PROMPTS: string[] = [
  'A messenger arrives with news from a kingdom that has not existed for three hundred years.',
  'Two dragons share a single name across the millennia. Why?',
  'Describe a holiday that mourns something everyone else celebrates.',
  'Your world has one weather pattern that everyone fears more than war.',
  'Write the obituary of a god.',
  'A child finds an artifact older than the language used to describe it.',
  'A border shifts every spring. Who decides where?',
  'Describe a tavern as remembered by its longest-serving cook.',
  'A prophecy is fulfilled by someone who never heard it.',
  'Two religions worship the same place from opposite sides of a mountain. Neither knows.',
  'A capital city is moved overnight. The reasons are not the ones given.',
  'Magic returns. The first to notice is a tax collector.',
  'Write a letter from a soldier who deserted to a war they were winning.',
  'Describe the smell of your largest forest in three different seasons.',
  'A species evolves in response to a single human action.',
  'A treaty is signed in a language no living person speaks.',
  'A character has been alive for a thousand years and is bored of stories.',
  'The map your protagonists carry is wrong, but in a way that helps them.',
  'A spell that has never been cast finally is. The caster is forgotten the moment they finish.',
  'Two countries share a national hero. They tell completely different stories about her.',
  'A natural law of your world breaks for the first time in recorded history.',
  'Describe a marketplace through the eyes of someone who has been blind since birth.',
  'A coronation goes wrong in a small, irreversible way.',
  'A dragon takes a student. The student is not impressed.',
  'Write the founding myth of a city that has been razed and rebuilt seven times.',
];

export function randomPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}
