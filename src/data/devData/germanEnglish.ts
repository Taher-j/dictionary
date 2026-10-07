// Development-only: a small German – English dictionary for trying practice modes by hand.
// Format per line: term; meaning; tag. Meanings with "/" list alternatives; many terms have
// umlauts or ß (accent tolerance in typing).

export const GERMAN_ENGLISH_NAME = 'German – English';

const NOUNS = `
das Haus; house; word
der Baum; tree; word
die Katze; cat; word
der Hund; dog; word
das Buch; book; word
der Tisch; table; word
der Stuhl; chair; word
die Tür; door; word
das Fenster; window; word
die Straße; street / road; word
die Stadt; city / town; word
das Dorf; village; word
der Fluss; river; word
der Berg; mountain; word
das Meer; sea; word
der See; lake; word
die Sonne; sun; word
der Mond; moon; word
der Stern; star; word
der Himmel; sky; word
das Wasser; water; word
das Brot; bread; word
die Milch; milk; word
der Käse; cheese; word
der Apfel; apple; word
die Birne; pear; word
das Ei; egg; word
der Zucker; sugar; word
das Fleisch; meat; word
der Fisch; fish; word
die Schule; school; word
der Lehrer; teacher; word
der Schüler; pupil / student; word
die Arbeit; work; word
das Geld; money; word
die Zeit; time; word
der Tag; day; word
die Woche; week; word
das Jahr; year; word
die Stunde; hour; word
der Freund; friend; word
die Familie; family; word
die Mutter; mother; word
der Vater; father; word
der Bruder; brother; word
die Schwester; sister; word
das Kind; child; word
der Schlüssel; key; word
die Tasche; bag; word
der Schuh; shoe; word
das Kleid; dress; word
die Brücke; bridge; word
der Bahnhof; train station; word
das Flugzeug; plane / airplane; word
der Zug; train; word
das Fahrrad; bicycle; word
das Gemüse; vegetables; word
die Küche; kitchen; word
der Garten; garden; word
das Wörterbuch; dictionary; word
`;

const VERBS = `
gehen; to go / to walk; verb
kommen; to come; verb
laufen; to run; verb
fahren; to drive / to travel; verb
fliegen; to fly; verb
schwimmen; to swim; verb
essen; to eat; verb
trinken; to drink; verb
schlafen; to sleep; verb
arbeiten; to work; verb
spielen; to play; verb
lesen; to read; verb
schreiben; to write; verb
sprechen; to speak; verb
hören; to hear / to listen; verb
sehen; to see; verb
machen; to make / to do; verb
geben; to give; verb
nehmen; to take; verb
finden; to find; verb
suchen; to look for / to search; verb
kaufen; to buy; verb
verkaufen; to sell; verb
bezahlen; to pay; verb
öffnen; to open; verb
schließen; to close / to shut; verb
beginnen; to begin / to start; verb
enden; to end; verb
lernen; to learn; verb
lehren; to teach; verb
wissen; to know (a fact); verb
kennen; to know (be familiar with); verb
denken; to think; verb
glauben; to believe; verb
fragen; to ask; verb
antworten; to answer; verb
helfen; to help; verb
warten; to wait; verb
bleiben; to stay; verb
wohnen; to live (reside); verb
lieben; to love; verb
vergessen; to forget; verb
erinnern; to remind; verb
tragen; to carry / to wear; verb
ziehen; to pull; verb
drücken; to press / to push; verb
kochen; to cook; verb
waschen; to wash; verb
tanzen; to dance; verb
singen; to sing; verb
`;

const ADJECTIVES = `
groß; big / tall; adjective
klein; small / little; adjective
alt; old; adjective
neu; new; adjective
jung; young; adjective
schön; beautiful / nice; adjective
hässlich; ugly; adjective
gut; good; adjective
schlecht; bad; adjective
schnell; fast / quick; adjective
langsam; slow; adjective
heiß; hot; adjective
kalt; cold; adjective
warm; warm; adjective
kühl; cool; adjective
hell; bright / light; adjective
dunkel; dark; adjective
laut; loud; adjective
leise; quiet; adjective
schwer; heavy / difficult; adjective
leicht; light / easy; adjective
teuer; expensive; adjective
billig; cheap; adjective
müde; tired; adjective
glücklich; happy; adjective
traurig; sad; adjective
freundlich; friendly; adjective
böse; angry / evil; adjective
klug; clever / smart; adjective
dumm; stupid; adjective
stark; strong; adjective
schwach; weak; adjective
voll; full; adjective
leer; empty; adjective
früh; early; adjective
spät; late; adjective
nah; near / close; adjective
weit; far / wide; adjective
süß; sweet; adjective
sauer; sour; adjective
`;

export interface DevWord {
  term: string;
  meaning: string;
  tag: string;
  partOfSpeech: string;
}

function parse(block: string, partOfSpeech: string): DevWord[] {
  return block
    .trim()
    .split('\n')
    .map((line) => {
      const [term = '', meaning = '', tag = ''] = line.split(';').map((part) => part.trim());
      return { term, meaning, tag, partOfSpeech };
    });
}

export const GERMAN_ENGLISH_WORDS: readonly DevWord[] = [
  ...parse(NOUNS, 'noun'),
  ...parse(VERBS, 'verb'),
  ...parse(ADJECTIVES, 'adjective'),
];
