/**
 * Rule-based exercise generator (Layer 1)
 * Generates scales, arpeggios, interval drills, and articulation exercises
 * as ABC notation — deterministic, no AI needed.
 */

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const CHROMATIC = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];
const FLAT_CHROMATIC = ['C', '_D', 'D', '_E', 'E', 'F', '_G', 'G', '_A', 'A', '_B', 'B'];

// Scale intervals in semitones from root
const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  whole_tone: [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  pentatonic: [0, 2, 4, 7, 9],
};

// Arpeggio intervals
const ARPEGGIO_PATTERNS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
};

const KEY_TO_SEMITONE = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11,
};

// Flute range: C4 (MIDI 60) to C7 (MIDI 96)
const FLUTE_LOW = 60;
const FLUTE_HIGH = 96;

function semitoneToAbc(semitone) {
  const useSharps = true; // default to sharps
  const octave = Math.floor(semitone / 12) - 1;
  const noteIdx = semitone % 12;
  const table = useSharps ? CHROMATIC : FLAT_CHROMATIC;
  const noteName = table[noteIdx];

  // ABC notation octave handling:
  // C4 = C, D4 = D, ... B4 = B
  // C5 = c, D5 = d, ... B5 = b
  // C6 = c', D6 = d', ...
  // C3 = C,, D3 = D,,

  let base = noteName.replace('^', '').replace('_', '');
  const accidental = noteName.startsWith('^') ? '^' : noteName.startsWith('_') ? '_' : '';

  if (octave >= 5) {
    base = base.toLowerCase();
    const ticks = octave - 5;
    return accidental + base + "'".repeat(ticks);
  } else if (octave === 4) {
    return accidental + base;
  } else {
    const commas = 4 - octave;
    return accidental + base + ",".repeat(commas);
  }
}

function buildScale(rootSemitone, pattern, octaves = 2, descendingPattern = null) {
  const notes = [];
  // Ascending
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of pattern) {
      const semitone = rootSemitone + oct * 12 + interval;
      if (semitone >= FLUTE_LOW && semitone <= FLUTE_HIGH) {
        notes.push(semitone);
      }
    }
  }
  // Top note
  const top = rootSemitone + octaves * 12;
  if (top >= FLUTE_LOW && top <= FLUTE_HIGH) notes.push(top);

  // Descending — use separate pattern if provided (e.g. melodic minor descends as natural minor)
  if (descendingPattern) {
    const descNotes = [];
    for (let oct = octaves - 1; oct >= 0; oct--) {
      const octNotes = [];
      for (const interval of descendingPattern) {
        const semitone = rootSemitone + oct * 12 + interval;
        if (semitone >= FLUTE_LOW && semitone <= FLUTE_HIGH) {
          octNotes.push(semitone);
        }
      }
      descNotes.push(...octNotes.reverse());
    }
    // Remove duplicate of top note
    if (descNotes.length > 0 && descNotes[0] === notes[notes.length - 1]) {
      descNotes.shift();
    }
    return [...notes, ...descNotes];
  }

  // Default: reverse the ascending pattern
  const desc = [...notes].reverse().slice(1);
  return [...notes, ...desc];
}

function buildArpeggio(rootSemitone, pattern, octaves = 2) {
  const notes = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of pattern) {
      const semitone = rootSemitone + oct * 12 + interval;
      if (semitone >= FLUTE_LOW && semitone <= FLUTE_HIGH) {
        notes.push(semitone);
      }
    }
  }
  const top = rootSemitone + octaves * 12;
  if (top >= FLUTE_LOW && top <= FLUTE_HIGH) notes.push(top);
  const desc = [...notes].reverse().slice(1);
  return [...notes, ...desc];
}

function buildScaleInThirds(rootSemitone, scalePattern, octaves = 2) {
  // Build full scale
  const fullScale = [];
  for (let oct = 0; oct < octaves + 1; oct++) {
    for (const interval of scalePattern) {
      const s = rootSemitone + oct * 12 + interval;
      if (s >= FLUTE_LOW && s <= FLUTE_HIGH) fullScale.push(s);
    }
  }
  // Thirds: alternate scale[i], scale[i+2]
  const notes = [];
  for (let i = 0; i + 2 < fullScale.length; i++) {
    notes.push(fullScale[i], fullScale[i + 2]);
  }
  return notes;
}

function buildIntervalDrill(rootSemitone, intervalSemitones, scalePattern) {
  const fullScale = [];
  for (let oct = 0; oct < 3; oct++) {
    for (const int of scalePattern) {
      const s = rootSemitone + oct * 12 + int;
      if (s >= FLUTE_LOW && s <= FLUTE_HIGH) fullScale.push(s);
    }
  }
  // Play each note then jump up by the interval
  const notes = [];
  for (const note of fullScale) {
    notes.push(note);
    const target = note + intervalSemitones;
    if (target <= FLUTE_HIGH) notes.push(target);
    notes.push(note); // return
  }
  return notes;
}

function notesToAbc(semitones, options = {}) {
  const {
    title = 'Generated Exercise',
    key = 'C',
    timeSignature = '4/4',
    tempo = 80,
    noteDuration = '', // empty = quarter note in ABC
  } = options;

  const abcNotes = semitones.map(s => semitoneToAbc(s) + noteDuration);

  // Group into bars (4 notes per bar for 4/4)
  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
  const bars = [];
  for (let i = 0; i < abcNotes.length; i += beatsPerBar) {
    bars.push(abcNotes.slice(i, i + beatsPerBar).join(' '));
  }

  const abc = [
    `X:1`,
    `T:${title}`,
    `M:${timeSignature}`,
    `L:1/4`,
    `Q:1/4=${tempo}`,
    `K:${key}`,
    bars.join(' | ') + ' |]',
  ].join('\n');

  return abc;
}

/**
 * Generate a scale exercise
 * @param {object} params
 * @param {string} params.key - e.g. "G", "Bb", "F#"
 * @param {string} params.scaleType - e.g. "major", "minor", "chromatic"
 * @param {number} params.octaves - 1-3
 * @param {number} params.tempo - BPM
 * @param {string} params.pattern - "straight", "thirds", "broken"
 */
export function generateScale(params) {
  const { key = 'C', scaleType = 'major', octaves = 2, tempo = 80, pattern = 'straight' } = params;
  const rootSemitone = FLUTE_LOW + (KEY_TO_SEMITONE[key] ?? 0);
  const scalePattern = SCALE_PATTERNS[scaleType] || SCALE_PATTERNS.major;

  // Melodic minor descends as natural minor (lowered 6th and 7th)
  const descendingPattern = scaleType === 'melodic_minor' ? SCALE_PATTERNS.minor : null;

  let notes;
  if (pattern === 'thirds') {
    notes = buildScaleInThirds(rootSemitone, scalePattern, octaves);
  } else {
    notes = buildScale(rootSemitone, scalePattern, octaves, descendingPattern);
  }

  const title = `${key} ${scaleType} scale${pattern !== 'straight' ? ` in ${pattern}` : ''} (${octaves} oct)`;
  return {
    title,
    abc: notesToAbc(notes, { title, key, tempo }),
    description: `${key} ${scaleType} scale, ${octaves} octave${octaves > 1 ? 's' : ''}, ${pattern} pattern at ${tempo} BPM`,
    key,
    difficulty: Math.min(10, octaves + (scaleType === 'chromatic' ? 3 : scaleType.includes('minor') ? 2 : 1)),
    category_hint: 'Scales',
    tags: ['scales', scaleType, key.toLowerCase(), `${octaves}-octave`],
  };
}

/**
 * Generate an arpeggio exercise
 */
export function generateArpeggio(params) {
  const { key = 'C', chordType = 'major', octaves = 2, tempo = 72 } = params;
  const rootSemitone = FLUTE_LOW + (KEY_TO_SEMITONE[key] ?? 0);
  const arpPattern = ARPEGGIO_PATTERNS[chordType] || ARPEGGIO_PATTERNS.major;

  const notes = buildArpeggio(rootSemitone, arpPattern, octaves);
  const title = `${key} ${chordType} arpeggio (${octaves} oct)`;

  return {
    title,
    abc: notesToAbc(notes, { title, key, tempo }),
    description: `${key} ${chordType} arpeggio, ${octaves} octaves at ${tempo} BPM`,
    key,
    difficulty: Math.min(10, octaves + (chordType.includes('7') ? 3 : 2)),
    category_hint: 'Arpeggios',
    tags: ['arpeggios', chordType, key.toLowerCase()],
  };
}

/**
 * Generate an interval drill
 */
export function generateIntervalDrill(params) {
  const { key = 'C', interval = 'octave', tempo = 60 } = params;
  const intervalMap = {
    'third': 4, 'fourth': 5, 'fifth': 7, 'sixth': 9, 'octave': 12,
    'minor_third': 3, 'tritone': 6, 'minor_sixth': 8, 'minor_seventh': 10,
  };
  const semitones = intervalMap[interval] || 12;
  const rootSemitone = FLUTE_LOW + (KEY_TO_SEMITONE[key] ?? 0);
  const notes = buildIntervalDrill(rootSemitone, semitones, SCALE_PATTERNS.major);

  const title = `${interval} interval drill in ${key}`;
  return {
    title,
    abc: notesToAbc(notes.slice(0, 64), { title, key, tempo }), // limit length
    description: `${interval} intervals ascending through ${key} major at ${tempo} BPM`,
    key,
    difficulty: Math.min(10, Math.ceil(semitones / 3) + 2),
    category_hint: 'Intervals',
    tags: ['intervals', interval, key.toLowerCase()],
  };
}

/**
 * Generate an articulation exercise
 */
export function generateArticulationDrill(params) {
  const { key = 'C', articulation = 'staccato', tempo = 100 } = params;
  const rootSemitone = FLUTE_LOW + (KEY_TO_SEMITONE[key] ?? 0);
  const scaleNotes = buildScale(rootSemitone, SCALE_PATTERNS.major, 1);

  // For articulation, we repeat each note with the articulation pattern
  const abcArticulations = {
    staccato: '.', legato: '(', accent: '!accent!', tenuto: '!tenuto!',
    double_tongue: '', // handled in description
    triple_tongue: '',
  };

  const artMark = abcArticulations[articulation] || '';
  const abcNotes = scaleNotes.map(s => artMark + semitoneToAbc(s));

  const bars = [];
  for (let i = 0; i < abcNotes.length; i += 4) {
    bars.push(abcNotes.slice(i, i + 4).join(' '));
  }

  const abc = [
    `X:1`, `T:${articulation} drill in ${key}`,
    `M:4/4`, `L:1/8`, `Q:1/4=${tempo}`, `K:${key}`,
    bars.join(' | ') + ' |]',
  ].join('\n');

  const title = `${articulation} drill in ${key}`;
  return {
    title,
    abc,
    description: `${articulation} exercise on ${key} major scale at ${tempo} BPM. Focus on evenness and clarity.`,
    key,
    difficulty: Math.min(10, articulation.includes('tongue') ? 6 : 3),
    category_hint: 'Articulation',
    tags: ['articulation', articulation, key.toLowerCase()],
  };
}

/**
 * Auto-generate based on a technical demand description
 * Returns the best matching generator result or null if can't match
 */
export function generateFromDemand(demand) {
  const desc = (demand.description || '').toLowerCase();
  const key = demand.key || extractKey(desc) || 'C';

  // Try to match demand description to generator
  if (desc.includes('scale') && desc.includes('third')) {
    return generateScale({ key, scaleType: extractScaleType(desc), pattern: 'thirds' });
  }
  if (desc.includes('scale')) {
    return generateScale({ key, scaleType: extractScaleType(desc) });
  }
  if (desc.includes('arpeggio')) {
    return generateArpeggio({ key, chordType: extractChordType(desc) });
  }
  if (desc.includes('interval') || desc.includes('leap') || desc.includes('octave jump')) {
    return generateIntervalDrill({ key, interval: extractInterval(desc) });
  }
  if (desc.includes('staccato') || desc.includes('legato') || desc.includes('tongu') || desc.includes('articulation')) {
    return generateArticulationDrill({ key, articulation: extractArticulation(desc) });
  }

  return null;
}

function extractKey(desc) {
  // Match key names as standalone tokens (e.g. "in G major", "Bb minor", "key of C#")
  // Check sharps/flats first, then naturals — use word boundary matching
  const keys = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb', 'C', 'D', 'E', 'F', 'G', 'A', 'B'];
  for (const k of keys) {
    // Match as standalone: preceded by space/start, followed by space/end or "major"/"minor"/etc
    const pattern = new RegExp(`(?:^|\\s|in\\s)${k.replace('#', '\\#')}(?:\\s|$|\\b)`, 'i');
    if (pattern.test(desc)) return k;
  }
  return null;
}

function extractScaleType(desc) {
  if (desc.includes('chromatic')) return 'chromatic';
  if (desc.includes('harmonic minor')) return 'harmonic_minor';
  if (desc.includes('melodic minor')) return 'melodic_minor';
  if (desc.includes('whole tone')) return 'whole_tone';
  if (desc.includes('minor')) return 'minor';
  if (desc.includes('dorian')) return 'dorian';
  if (desc.includes('pentatonic')) return 'pentatonic';
  return 'major';
}

function extractChordType(desc) {
  if (desc.includes('diminish')) return 'diminished';
  if (desc.includes('augment')) return 'augmented';
  if (desc.includes('dominant') || desc.includes('dom7')) return 'dominant7';
  if (desc.includes('minor')) return 'minor';
  return 'major';
}

function extractInterval(desc) {
  if (desc.includes('third')) return 'third';
  if (desc.includes('fourth')) return 'fourth';
  if (desc.includes('fifth')) return 'fifth';
  if (desc.includes('sixth')) return 'sixth';
  if (desc.includes('octave')) return 'octave';
  return 'octave';
}

function extractArticulation(desc) {
  if (desc.includes('double tongu') || desc.includes('double-tongu')) return 'double_tongue';
  if (desc.includes('triple tongu') || desc.includes('triple-tongu')) return 'triple_tongue';
  if (desc.includes('staccato')) return 'staccato';
  if (desc.includes('legato')) return 'legato';
  return 'staccato';
}
