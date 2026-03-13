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
