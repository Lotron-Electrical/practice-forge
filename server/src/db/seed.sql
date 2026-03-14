-- Default Skill/Technique Taxonomy (from spec section 7)

-- Top-level categories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('scales', 'Scales', NULL, 1, 'Scale patterns and exercises'),
  ('arpeggios', 'Arpeggios', NULL, 2, 'Arpeggio patterns and exercises'),
  ('articulation', 'Articulation', NULL, 3, 'Tonguing and articulation techniques'),
  ('intervals', 'Intervals', NULL, 4, 'Interval exercises and leaps'),
  ('rhythm', 'Rhythm', NULL, 5, 'Rhythmic skills and patterns'),
  ('tone', 'Tone', NULL, 6, 'Tone production and dynamics'),
  ('finger-technique', 'Finger Technique', NULL, 7, 'Finger dexterity and evenness'),
  ('vibrato', 'Vibrato', NULL, 8, 'Vibrato control and expression'),
  ('breathing', 'Breathing', NULL, 9, 'Breath control and phrasing'),
  ('sight-reading', 'Sight-reading', NULL, 10, 'Sight-reading skills'),
  ('ensemble', 'Ensemble Skills', NULL, 11, 'Ensemble and orchestral skills')
ON CONFLICT (id) DO NOTHING;

-- Scales subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('scales-major', 'Major', 'scales', 1, 'Major scales'),
  ('scales-minor-harmonic', 'Minor (Harmonic)', 'scales', 2, 'Harmonic minor scales'),
  ('scales-minor-melodic', 'Minor (Melodic)', 'scales', 3, 'Melodic minor scales'),
  ('scales-minor-natural', 'Minor (Natural)', 'scales', 4, 'Natural minor scales'),
  ('scales-thirds', 'Thirds', 'scales', 5, 'Scales in thirds'),
  ('scales-sixths', 'Sixths', 'scales', 6, 'Scales in sixths'),
  ('scales-chromatic', 'Chromatic', 'scales', 7, 'Chromatic scales'),
  ('scales-whole-tone', 'Whole-tone', 'scales', 8, 'Whole-tone scales'),
  ('scales-diminished', 'Diminished', 'scales', 9, 'Diminished scales'),
  ('scales-modes', 'Modes', 'scales', 10, 'Modal scales')
ON CONFLICT (id) DO NOTHING;

-- Arpeggios subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('arp-major', 'Major', 'arpeggios', 1, 'Major arpeggios'),
  ('arp-minor', 'Minor', 'arpeggios', 2, 'Minor arpeggios'),
  ('arp-dom7', 'Dominant 7th', 'arpeggios', 3, 'Dominant 7th arpeggios'),
  ('arp-dim', 'Diminished', 'arpeggios', 4, 'Diminished arpeggios'),
  ('arp-aug', 'Augmented', 'arpeggios', 5, 'Augmented arpeggios'),
  ('arp-extended', 'Extended (9ths etc.)', 'arpeggios', 6, 'Extended arpeggios')
ON CONFLICT (id) DO NOTHING;

-- Articulation subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('art-staccato', 'Staccato', 'articulation', 1, 'Staccato technique'),
  ('art-legato', 'Legato', 'articulation', 2, 'Legato playing'),
  ('art-tonguing-speed', 'Tonguing Speed', 'articulation', 3, 'Fast single tonguing'),
  ('art-double-tonguing', 'Double Tonguing', 'articulation', 4, 'Double tonguing technique'),
  ('art-triple-tonguing', 'Triple Tonguing', 'articulation', 5, 'Triple tonguing technique'),
  ('art-flutter', 'Flutter Tonguing', 'articulation', 6, 'Flutter tonguing technique'),
  ('art-accents', 'Accents/Sforzando', 'articulation', 7, 'Accent and sforzando techniques')
ON CONFLICT (id) DO NOTHING;

-- Intervals subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('int-wide-leaps', 'Wide Leaps', 'intervals', 1, 'Large interval jumps'),
  ('int-thirds', 'Thirds', 'intervals', 2, 'Third intervals'),
  ('int-sixths', 'Sixths', 'intervals', 3, 'Sixth intervals'),
  ('int-octaves', 'Octaves', 'intervals', 4, 'Octave intervals')
ON CONFLICT (id) DO NOTHING;

-- Rhythm subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('rhy-complex', 'Complex Rhythms', 'rhythm', 1, 'Complex rhythmic patterns'),
  ('rhy-syncopation', 'Syncopation', 'rhythm', 2, 'Syncopated rhythms'),
  ('rhy-mixed-meter', 'Mixed Meter', 'rhythm', 3, 'Mixed and changing meters'),
  ('rhy-rubato', 'Rubato/Tempo Flexibility', 'rhythm', 4, 'Rubato and tempo changes')
ON CONFLICT (id) DO NOTHING;

-- Tone subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('tone-long', 'Long Tones', 'tone', 1, 'Long tone exercises'),
  ('tone-dynamics', 'Dynamics (pp-ff)', 'tone', 2, 'Dynamic range exercises'),
  ('tone-colour', 'Tone Colour/Timbre', 'tone', 3, 'Tone colour and timbre variation'),
  ('tone-register', 'Register Transitions', 'tone', 4, 'Low/middle/high register transitions'),
  ('tone-harmonics', 'Harmonics', 'tone', 5, 'Harmonic exercises')
ON CONFLICT (id) DO NOTHING;

-- Finger technique subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('finger-fast', 'Fast Passages', 'finger-technique', 1, 'Fast passage work'),
  ('finger-trills', 'Trill Exercises', 'finger-technique', 2, 'Trill technique'),
  ('finger-evenness', 'Evenness', 'finger-technique', 3, 'Finger evenness and equality'),
  ('finger-awkward', 'Awkward Fingerings', 'finger-technique', 4, 'Difficult fingering combinations')
ON CONFLICT (id) DO NOTHING;

-- Vibrato subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('vib-speed', 'Speed Control', 'vibrato', 1, 'Vibrato speed control'),
  ('vib-width', 'Width Control', 'vibrato', 2, 'Vibrato width/amplitude control'),
  ('vib-consistency', 'Consistency', 'vibrato', 3, 'Vibrato consistency and evenness')
ON CONFLICT (id) DO NOTHING;

-- Breathing subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('breath-control', 'Breath Control', 'breathing', 1, 'Breath support and control'),
  ('breath-circular', 'Circular Breathing', 'breathing', 2, 'Circular breathing technique'),
  ('breath-phrasing', 'Phrasing/Breath Planning', 'breathing', 3, 'Breath planning for phrases')
ON CONFLICT (id) DO NOTHING;

-- Ensemble subcategories
INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES
  ('ens-intonation', 'Intonation', 'ensemble', 1, 'Ensemble intonation'),
  ('ens-blend', 'Blend', 'ensemble', 2, 'Tonal blend in ensemble'),
  ('ens-conducting', 'Following a Conductor', 'ensemble', 3, 'Responding to conducting')
ON CONFLICT (id) DO NOTHING;

-- Pre-populated exercise library (foundational flute exercises)
INSERT INTO exercises (id, title, source, source_type, category_id, key, difficulty, description, tags) VALUES
  ('ex-long-tones', 'Long Tones', '', 'manual', 'tone-long', NULL, 2,
   'Sustained whole notes across all registers. Start pp, crescendo to ff, diminuendo back to pp. Focus on centred tone, steady air stream, and even dynamics throughout.', '["warmup","tone","fundamentals"]'),
  ('ex-tg-no1', 'Taffanel & Gaubert No. 1', 'Taffanel & Gaubert: 17 Grands Exercices Journaliers', 'book', 'scales-chromatic', NULL, 5,
   'Chromatic scale patterns in all keys. Essential daily exercise for finger evenness and facility. Start slowly with metronome and gradually increase tempo.', '["chromatic","finger-technique","daily"]'),
  ('ex-tg-no4', 'Taffanel & Gaubert No. 4', 'Taffanel & Gaubert: 17 Grands Exercices Journaliers', 'book', 'scales-thirds', NULL, 6,
   'Scales in intervals of thirds. Develops finger independence and interval accuracy. Practice in all major and minor keys.', '["intervals","scales","daily"]'),
  ('ex-moyse-sonorite', 'Moyse De La Sonorite', 'Marcel Moyse: De La Sonorite', 'book', 'tone', NULL, 4,
   'Comprehensive tone development exercises. Focus on producing a beautiful, resonant sound across all registers with smooth register transitions.', '["tone","sonorite","fundamentals"]'),
  ('ex-major-scales', 'Major Scales (All Keys, 2 Octaves)', '', 'manual', 'scales-major', 'All keys', 3,
   'All 12 major scales played over 2 octaves. Practice with varied articulations (all slurred, all tongued, 2 slurred 2 tongued). Use full range of dynamics.', '["scales","fundamentals","daily"]'),
  ('ex-minor-scales-harmonic', 'Minor Scales — Harmonic (All Keys)', '', 'manual', 'scales-minor-harmonic', 'All keys', 4,
   'All harmonic minor scales over 2 octaves. Pay attention to the augmented second interval between the 6th and 7th degrees.', '["scales","minor","fundamentals"]'),
  ('ex-minor-scales-melodic', 'Minor Scales — Melodic (All Keys)', '', 'manual', 'scales-minor-melodic', 'All keys', 4,
   'All melodic minor scales over 2 octaves. Raised 6th and 7th ascending, natural form descending. Essential for orchestral playing.', '["scales","minor","fundamentals"]'),
  ('ex-chromatic-scale', 'Chromatic Scale (Full Range)', '', 'manual', 'scales-chromatic', NULL, 3,
   'Chromatic scale from low C/B to top of range. Practice with even fingers, consistent tone, and various articulation patterns.', '["chromatic","range","fundamentals"]'),
  ('ex-major-arpeggios', 'Major Arpeggios (All Keys)', '', 'manual', 'arp-major', 'All keys', 4,
   'Major arpeggios in all 12 keys over 2 octaves. Focus on clean interval connections, especially across register breaks.', '["arpeggios","fundamentals"]'),
  ('ex-minor-arpeggios', 'Minor Arpeggios (All Keys)', '', 'manual', 'arp-minor', 'All keys', 4,
   'Minor arpeggios in all 12 keys over 2 octaves. Practice both natural minor and harmonic minor arpeggio forms.', '["arpeggios","minor","fundamentals"]'),
  ('ex-dom7-arpeggios', 'Dominant 7th Arpeggios (All Keys)', '', 'manual', 'arp-dom7', 'All keys', 5,
   'Dominant 7th arpeggios in all keys. Critical for orchestral repertoire. Focus on intonation of the minor 7th interval.', '["arpeggios","seventh","fundamentals"]'),
  ('ex-articulation-patterns', 'Articulation Patterns (Single/Double/Triple Tongue)', '', 'manual', 'articulation', NULL, 5,
   'Systematic articulation study: single tonguing (tu), double tonguing (tu-ku), and triple tonguing (tu-tu-ku / tu-ku-tu). Practice on repeated notes, scales, and arpeggios.', '["articulation","tonguing","technique"]'),
  ('ex-vibrato', 'Vibrato Exercises', '', 'manual', 'vibrato', NULL, 4,
   'Controlled vibrato practice. Start with measured oscillations (quarter note, eighth note, triplet, sixteenth) then transition to free vibrato. Vary speed and width.', '["vibrato","expression","tone"]'),
  ('ex-breathing', 'Breathing Exercises', '', 'manual', 'breathing', NULL, 2,
   'Breath control fundamentals: timed inhale/exhale ratios, breath attacks, sustained air support exercises. Practice away from the flute first, then apply.', '["breathing","warmup","fundamentals"]'),
  ('ex-lip-flexibility', 'Lip Flexibility / Harmonics', '', 'manual', 'tone-harmonics', NULL, 6,
   'Harmonic series exercises: finger low C/C#/D and overblow through the harmonic series. Develops embouchure flexibility, pitch control, and upper register ease.', '["harmonics","embouchure","flexibility"]')
ON CONFLICT (id) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('theme', '"light"'),
  ('fontSize', '1'),
  ('highContrast', 'false'),
  ('colourVisionMode', '"none"'),
  ('reducedMotion', 'false'),
  ('defaultSessionLength', '60'),
  ('excerptRotationCount', '3'),
  ('timeAllocation', '{"warmup":10,"fundamentals":10,"technique":25,"repertoire":35,"excerpts":15,"buffer":5}')
ON CONFLICT (key) DO NOTHING;
