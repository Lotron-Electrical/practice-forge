"""Core music analysis service using music21.

Provides 12 analysis functions plus auto-demand detection.
Each function is wrapped in try/except so partial results always return.
"""

import logging
from collections import Counter

import music21
from music21 import (
    converter,
    interval,
    pitch,
    tempo,
    dynamics,
    articulations,
    bar,
    expressions,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Key detection
# ---------------------------------------------------------------------------

def detect_key(score: music21.stream.Score) -> str | None:
    """Use music21's key analysis to detect the overall key."""
    try:
        key_result = score.analyze("key")
        return str(key_result)
    except Exception as e:
        logger.warning(f"detect_key failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 2. Scale detection
# ---------------------------------------------------------------------------

def find_scales(score: music21.stream.Score) -> list[dict]:
    """Find stepwise passages of 5+ consecutive notes that form scales."""
    scales_found: list[dict] = []
    try:
        for part in score.parts:
            notes = list(part.recurse().notes)
            if len(notes) < 5:
                continue

            i = 0
            while i < len(notes) - 4:
                # Check for stepwise motion (intervals of 1 or 2 semitones)
                run_start = i
                run_notes = [notes[i]]
                direction = None  # ascending or descending

                for j in range(i + 1, len(notes)):
                    if not hasattr(notes[j], "pitch") or not hasattr(notes[j - 1], "pitch"):
                        break
                    semis = notes[j].pitch.midi - notes[j - 1].pitch.midi
                    abs_semis = abs(semis)

                    if abs_semis not in (1, 2):
                        break

                    current_dir = "ascending" if semis > 0 else "descending"
                    if direction is None:
                        direction = current_dir
                    elif current_dir != direction:
                        break

                    run_notes.append(notes[j])

                if len(run_notes) >= 5:
                    # Determine scale type
                    intervals_list = []
                    for k in range(1, len(run_notes)):
                        if hasattr(run_notes[k], "pitch") and hasattr(run_notes[k - 1], "pitch"):
                            intervals_list.append(
                                abs(run_notes[k].pitch.midi - run_notes[k - 1].pitch.midi)
                            )

                    all_half = all(iv == 1 for iv in intervals_list)
                    has_halves = any(iv == 1 for iv in intervals_list)

                    if all_half:
                        scale_type = "chromatic"
                    elif has_halves:
                        scale_type = "minor"
                    else:
                        scale_type = "major"

                    start_measure = run_notes[0].measureNumber or 1
                    end_measure = run_notes[-1].measureNumber or start_measure

                    root_note = run_notes[0] if direction == "ascending" else run_notes[-1]
                    key_name = root_note.pitch.name if hasattr(root_note, "pitch") else "?"

                    scales_found.append({
                        "scale_type": scale_type,
                        "key": key_name,
                        "bar_range": f"{start_measure}-{end_measure}",
                        "confidence": min(0.5 + len(run_notes) * 0.05, 0.95),
                    })
                    i = run_start + len(run_notes)
                else:
                    i += 1

    except Exception as e:
        logger.warning(f"find_scales failed: {e}")

    return scales_found


# ---------------------------------------------------------------------------
# 3. Arpeggio detection
# ---------------------------------------------------------------------------

def find_arpeggios(score: music21.stream.Score) -> list[dict]:
    """Find passages with chord-tone motion (3rds and 5ths)."""
    arpeggios_found: list[dict] = []
    try:
        for part in score.parts:
            notes = [n for n in part.recurse().notes if hasattr(n, "pitch")]
            if len(notes) < 3:
                continue

            i = 0
            while i < len(notes) - 2:
                run_notes = [notes[i]]

                for j in range(i + 1, len(notes)):
                    semis = abs(notes[j].pitch.midi - notes[j - 1].pitch.midi)
                    # Chord tones: minor 3rd (3), major 3rd (4), perfect 4th (5),
                    # perfect 5th (7), octave (12)
                    if semis in (3, 4, 5, 7, 8, 12):
                        run_notes.append(notes[j])
                    else:
                        break

                if len(run_notes) >= 3:
                    # Determine chord type from intervals
                    first_interval = abs(run_notes[1].pitch.midi - run_notes[0].pitch.midi)
                    second_interval = (
                        abs(run_notes[2].pitch.midi - run_notes[1].pitch.midi)
                        if len(run_notes) > 2
                        else 0
                    )

                    if first_interval == 4 and second_interval == 3:
                        chord_type = "major"
                    elif first_interval == 3 and second_interval == 4:
                        chord_type = "minor"
                    elif first_interval == 3 and second_interval == 3:
                        chord_type = "diminished"
                    elif first_interval == 4 and second_interval == 4:
                        chord_type = "augmented"
                    else:
                        chord_type = "mixed"

                    root = run_notes[0]
                    start_m = root.measureNumber or 1
                    end_m = run_notes[-1].measureNumber or start_m

                    arpeggios_found.append({
                        "chord_type": chord_type,
                        "key": root.pitch.name,
                        "bar_range": f"{start_m}-{end_m}",
                        "confidence": min(0.5 + len(run_notes) * 0.1, 0.95),
                    })
                    i += len(run_notes)
                else:
                    i += 1

    except Exception as e:
        logger.warning(f"find_arpeggios failed: {e}")

    return arpeggios_found


# ---------------------------------------------------------------------------
# 4. Interval analysis
# ---------------------------------------------------------------------------

def analyze_intervals(score: music21.stream.Score) -> dict | None:
    """Analyze melodic intervals between consecutive notes."""
    try:
        all_intervals: list[str] = []
        max_semitones = 0
        largest_name = "P1"

        for part in score.parts:
            notes = [n for n in part.recurse().notes if hasattr(n, "pitch")]
            for i in range(1, len(notes)):
                intv = interval.Interval(noteStart=notes[i - 1], noteEnd=notes[i])
                name = intv.simpleName or str(intv)
                all_intervals.append(name)
                semis = abs(intv.semitones)
                if semis > max_semitones:
                    max_semitones = semis
                    largest_name = intv.directedSimpleName or name

        if not all_intervals:
            return None

        counter = Counter(all_intervals)
        most_common = counter.most_common(1)[0][0]
        distribution = dict(counter.most_common(20))

        return {
            "largest": largest_name,
            "most_common": most_common,
            "distribution": distribution,
        }

    except Exception as e:
        logger.warning(f"analyze_intervals failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 5. Rhythm analysis
# ---------------------------------------------------------------------------

def analyze_rhythm(score: music21.stream.Score) -> dict | None:
    """Analyze rhythmic complexity, time signatures, syncopation."""
    try:
        time_sigs = []
        seen_ts = set()
        for ts in score.recurse().getElementsByClass("TimeSignature"):
            key = (ts.ratioString, ts.measureNumber)
            if key not in seen_ts:
                seen_ts.add(key)
                time_sigs.append({
                    "time_signature": ts.ratioString,
                    "measure": ts.measureNumber or 1,
                })

        # Collect all durations
        durations: list[float] = []
        has_syncopation = False
        for part in score.parts:
            for n in part.recurse().notes:
                durations.append(n.duration.quarterLength)
                # Simple syncopation check: note starting on weak beat with
                # duration extending past the next strong beat
                if hasattr(n, "beat") and n.beat is not None:
                    try:
                        beat = float(n.beat)
                        if beat != 1.0 and n.duration.quarterLength > 1.0:
                            has_syncopation = True
                    except (TypeError, ValueError):
                        pass

        if not durations:
            return None

        unique_durations = len(set(durations))
        shortest = min(durations)
        longest = max(durations)

        # Complexity score: based on unique durations, time changes, syncopation
        complexity = 1.0
        complexity += min(unique_durations * 0.5, 3.0)
        complexity += min(len(time_sigs) * 1.0, 2.0)
        if has_syncopation:
            complexity += 1.5
        if shortest < 0.25:  # 16th notes or shorter
            complexity += 1.0
        if shortest < 0.125:  # 32nd notes
            complexity += 1.0
        complexity = max(1.0, min(10.0, complexity))

        # Duration name helper
        def dur_name(ql: float) -> str:
            names = {
                4.0: "whole",
                3.0: "dotted half",
                2.0: "half",
                1.5: "dotted quarter",
                1.0: "quarter",
                0.75: "dotted eighth",
                0.5: "eighth",
                0.25: "sixteenth",
                0.125: "thirty-second",
                0.0625: "sixty-fourth",
            }
            return names.get(ql, f"{ql} quarter-lengths")

        return {
            "complexity_score": round(complexity, 1),
            "time_changes": time_sigs,
            "has_syncopation": has_syncopation,
            "shortest_duration": dur_name(shortest),
            "longest_duration": dur_name(longest),
        }

    except Exception as e:
        logger.warning(f"analyze_rhythm failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 6. Dynamics extraction
# ---------------------------------------------------------------------------

def extract_dynamics(score: music21.stream.Score) -> list[dict]:
    """Find all dynamic markings with measure numbers."""
    results: list[dict] = []
    try:
        for dyn in score.recurse().getElementsByClass("Dynamic"):
            results.append({
                "marking": dyn.value or str(dyn),
                "measure": dyn.measureNumber or 1,
            })
    except Exception as e:
        logger.warning(f"extract_dynamics failed: {e}")
    return results


# ---------------------------------------------------------------------------
# 7. Tempo extraction
# ---------------------------------------------------------------------------

def extract_tempo(score: music21.stream.Score) -> list[dict]:
    """Find MetronomeMark and tempo text objects."""
    results: list[dict] = []
    try:
        for mm in score.recurse().getElementsByClass("MetronomeMark"):
            bpm = None
            try:
                bpm = int(mm.number) if mm.number else None
            except (TypeError, ValueError):
                pass
            results.append({
                "text": mm.text or str(mm),
                "bpm": bpm,
                "measure": mm.measureNumber or 1,
            })

        for tt in score.recurse().getElementsByClass("TempoText"):
            results.append({
                "text": str(tt),
                "bpm": None,
                "measure": tt.measureNumber or 1,
            })
    except Exception as e:
        logger.warning(f"extract_tempo failed: {e}")
    return results


# ---------------------------------------------------------------------------
# 8. Articulation extraction
# ---------------------------------------------------------------------------

def extract_articulations(score: music21.stream.Score) -> list[dict]:
    """Count articulation types across the score."""
    counts: Counter = Counter()
    try:
        for n in score.recurse().notes:
            for art in n.articulations:
                counts[type(art).__name__] += 1

        # Also count slurs/ties as "legato"
        for spanner in score.recurse().getElementsByClass("Slur"):
            counts["Slur"] += 1

        # Count trills
        for expr in score.recurse().getElementsByClass("Trill"):
            counts["Trill"] += 1

    except Exception as e:
        logger.warning(f"extract_articulations failed: {e}")

    return [{"type": k, "count": v} for k, v in counts.most_common()]


# ---------------------------------------------------------------------------
# 9. Structure analysis
# ---------------------------------------------------------------------------

def analyze_structure(score: music21.stream.Score) -> dict | None:
    """Detect form, repeats, and sections."""
    try:
        total_measures = 0
        has_repeats = False
        sections: list[dict] = []
        repeat_bars: list[int] = []

        for part in score.parts:
            measures = list(part.getElementsByClass("Measure"))
            total_measures = max(total_measures, len(measures))

            for m in measures:
                # Check for repeat barlines
                for bl in m.getElementsByClass("Barline"):
                    if hasattr(bl, "type") and bl.type in ("final", "double"):
                        sections.append({
                            "type": bl.type,
                            "measure": m.number or 0,
                        })
                for rb in m.getElementsByClass("Repeat"):
                    has_repeats = True
                    repeat_bars.append(m.number or 0)

                # Also check left/right barlines
                if hasattr(m, "leftBarline") and m.leftBarline:
                    bl = m.leftBarline
                    if isinstance(bl, bar.Repeat):
                        has_repeats = True
                        repeat_bars.append(m.number or 0)
                if hasattr(m, "rightBarline") and m.rightBarline:
                    bl = m.rightBarline
                    if isinstance(bl, bar.Repeat):
                        has_repeats = True
                        repeat_bars.append(m.number or 0)

            break  # Only need first part for structure

        # Estimate form from section markers
        form = None
        num_sections = len(sections)
        if has_repeats and num_sections <= 2:
            form = "binary"
        elif has_repeats and num_sections == 3:
            form = "ternary"
        elif num_sections >= 4:
            form = "rondo"
        elif total_measures > 0:
            form = "through-composed"

        return {
            "form": form,
            "sections": sections,
            "has_repeats": has_repeats,
            "total_measures": total_measures,
        }

    except Exception as e:
        logger.warning(f"analyze_structure failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 10. Difficulty estimation
# ---------------------------------------------------------------------------

def estimate_difficulty(
    score: music21.stream.Score,
    key_str: str | None,
    rhythm_data: dict | None,
    interval_data: dict | None,
    articulation_data: list[dict],
    register_data: dict | None,
) -> int | None:
    """Composite difficulty score 1-10."""
    try:
        score_val = 3.0  # baseline

        # Key complexity: more sharps/flats = harder
        if key_str:
            complex_keys = {"F# major", "C# major", "G# minor", "D# minor",
                            "Gb major", "Cb major", "Eb minor", "Ab minor"}
            medium_keys = {"B major", "Db major", "F# minor", "Bb minor",
                           "Eb major", "Ab major", "C minor", "F minor"}
            if key_str in complex_keys:
                score_val += 2.0
            elif key_str in medium_keys:
                score_val += 1.0

        # Rhythm complexity
        if rhythm_data:
            score_val += (rhythm_data.get("complexity_score", 5) - 5) * 0.3

        # Register extremes
        if register_data:
            semitones = register_data.get("range_semitones", 24)
            if semitones > 36:
                score_val += 1.5
            elif semitones > 30:
                score_val += 1.0

        # Interval difficulty
        if interval_data:
            dist = interval_data.get("distribution", {})
            large_intervals = sum(v for k, v in dist.items() if k and len(k) > 1 and k[1:].isdigit() and int(k[1:]) >= 6)
            total = sum(dist.values()) or 1
            if large_intervals / total > 0.15:
                score_val += 1.0

        # Articulation density
        total_articulations = sum(a.get("count", 0) for a in articulation_data)
        if total_articulations > 50:
            score_val += 1.0
        elif total_articulations > 20:
            score_val += 0.5

        return max(1, min(10, round(score_val)))

    except Exception as e:
        logger.warning(f"estimate_difficulty failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 11. Register analysis
# ---------------------------------------------------------------------------

def analyze_register(score: music21.stream.Score) -> dict | None:
    """Find lowest/highest notes, range, and register transitions."""
    try:
        all_pitches: list[pitch.Pitch] = []
        for n in score.recurse().notes:
            if hasattr(n, "pitch"):
                all_pitches.append(n.pitch)
            elif hasattr(n, "pitches"):
                all_pitches.extend(n.pitches)

        if not all_pitches:
            return None

        lowest = min(all_pitches, key=lambda p: p.midi)
        highest = max(all_pitches, key=lambda p: p.midi)
        range_semitones = highest.midi - lowest.midi

        # Count large register changes (> octave jump between consecutive notes)
        register_changes = 0
        prev_midi = None
        for n in score.recurse().notes:
            if hasattr(n, "pitch"):
                curr = n.pitch.midi
                if prev_midi is not None and abs(curr - prev_midi) >= 12:
                    register_changes += 1
                prev_midi = curr

        return {
            "lowest_note": lowest.nameWithOctave,
            "highest_note": highest.nameWithOctave,
            "range_semitones": range_semitones,
            "register_changes": register_changes,
        }

    except Exception as e:
        logger.warning(f"analyze_register failed: {e}")
        return None


# ---------------------------------------------------------------------------
# 12. Pattern detection
# ---------------------------------------------------------------------------

def find_patterns(score: music21.stream.Score) -> list[dict]:
    """Find recurring melodic motifs (3-6 note sequences appearing 2+ times)."""
    patterns_found: list[dict] = []
    try:
        for part in score.parts:
            notes = [n for n in part.recurse().notes if hasattr(n, "pitch")]
            if len(notes) < 6:
                continue

            # Build interval sequences and look for repeats
            for motif_len in range(3, 7):
                motif_map: dict[tuple, list[int]] = {}

                for i in range(len(notes) - motif_len + 1):
                    segment = notes[i : i + motif_len]
                    # Represent motif as interval tuple (transposition-invariant)
                    intervals_tuple = tuple(
                        segment[j].pitch.midi - segment[j - 1].pitch.midi
                        for j in range(1, len(segment))
                    )
                    measure_num = segment[0].measureNumber or 1

                    if intervals_tuple not in motif_map:
                        motif_map[intervals_tuple] = []
                    motif_map[intervals_tuple].append(measure_num)

                for intervals_tuple, measures in motif_map.items():
                    if len(measures) < 2:
                        continue
                    # Skip trivial patterns (all same interval)
                    if len(set(intervals_tuple)) <= 1:
                        continue

                    # Describe the interval pattern
                    desc_parts = []
                    for iv in intervals_tuple:
                        if iv > 0:
                            desc_parts.append(f"+{iv}")
                        else:
                            desc_parts.append(str(iv))

                    first_bar = min(measures)
                    last_bar = max(measures)

                    patterns_found.append({
                        "pattern_type": "motif",
                        "description": f"{motif_len}-note motif (intervals: {', '.join(desc_parts)})",
                        "bar_range": f"{first_bar}-{last_bar}",
                        "occurrences": len(measures),
                    })

            break  # First part only

        # Deduplicate: keep most-occurring patterns, limit to top 10
        patterns_found.sort(key=lambda p: p["occurrences"], reverse=True)
        return patterns_found[:10]

    except Exception as e:
        logger.warning(f"find_patterns failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Auto-detect demands
# ---------------------------------------------------------------------------

def auto_detect_demands(
    score: music21.stream.Score, analysis_data: dict
) -> list[dict]:
    """Generate technical demand suggestions from the analysis results."""
    demands: list[dict] = []
    try:
        # Scales
        for s in analysis_data.get("scales", []):
            demands.append({
                "description": f"{s['scale_type'].title()} scale in {s['key']}",
                "category_hint": "scales",
                "difficulty": 4,
                "bar_range": s["bar_range"],
                "confidence": s["confidence"],
            })

        # Arpeggios
        for a in analysis_data.get("arpeggios", []):
            demands.append({
                "description": f"{a['chord_type'].title()} arpeggio in {a['key']}",
                "category_hint": "arpeggios",
                "difficulty": 5,
                "bar_range": a["bar_range"],
                "confidence": a["confidence"],
            })

        # Large intervals
        if analysis_data.get("intervals"):
            dist = analysis_data["intervals"].get("distribution", {})
            for name, count in dist.items():
                # Check for intervals of 6th or larger
                if name and len(name) > 1 and name[1:].isdigit() and int(name[1:]) >= 6 and count >= 3:
                    demands.append({
                        "description": f"Large interval practice ({name}, appears {count} times)",
                        "category_hint": "intervals",
                        "difficulty": 6,
                        "bar_range": "throughout",
                        "confidence": 0.7,
                    })

        # High register
        reg = analysis_data.get("register")
        if reg and reg.get("range_semitones", 0) > 30:
            demands.append({
                "description": f"Extended register: {reg['lowest_note']} to {reg['highest_note']}",
                "category_hint": "register",
                "difficulty": 6,
                "bar_range": "throughout",
                "confidence": 0.8,
            })

        # Register changes
        if reg and reg.get("register_changes", 0) > 5:
            demands.append({
                "description": f"Frequent register changes ({reg['register_changes']} large leaps)",
                "category_hint": "flexibility",
                "difficulty": 5,
                "bar_range": "throughout",
                "confidence": 0.75,
            })

        # Complex rhythm
        rhythm = analysis_data.get("rhythm")
        if rhythm and rhythm.get("complexity_score", 0) >= 6:
            demands.append({
                "description": f"Rhythmic complexity (score: {rhythm['complexity_score']})",
                "category_hint": "rhythm",
                "difficulty": int(rhythm["complexity_score"]),
                "bar_range": "throughout",
                "confidence": 0.8,
            })

        # Syncopation
        if rhythm and rhythm.get("has_syncopation"):
            demands.append({
                "description": "Syncopated rhythms",
                "category_hint": "rhythm",
                "difficulty": 5,
                "bar_range": "throughout",
                "confidence": 0.7,
            })

        # Articulations
        for art in analysis_data.get("articulations", []):
            if art.get("count", 0) >= 5:
                demands.append({
                    "description": f"{art['type']} technique ({art['count']} occurrences)",
                    "category_hint": "articulation",
                    "difficulty": 4,
                    "bar_range": "throughout",
                    "confidence": 0.6,
                })

    except Exception as e:
        logger.warning(f"auto_detect_demands failed: {e}")

    return demands


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def analyze_score(musicxml_content: str) -> dict:
    """Parse MusicXML and run all 12 analysis functions.

    Returns a dict matching the AnalysisResponse schema.
    """
    try:
        score = converter.parse(musicxml_content)
    except Exception as e:
        return {"success": False, "error": f"Failed to parse MusicXML: {e}"}

    # Run each analysis, catching errors individually
    key_str = detect_key(score)
    scales = find_scales(score)
    arps = find_arpeggios(score)
    interval_data = analyze_intervals(score)
    rhythm_data = analyze_rhythm(score)
    dyn_list = extract_dynamics(score)
    tempo_list = extract_tempo(score)
    art_list = extract_articulations(score)
    struct = analyze_structure(score)
    reg = analyze_register(score)
    patterns = find_patterns(score)

    # Get time signature from the first one found
    time_sig = None
    try:
        ts = score.recurse().getElementsByClass("TimeSignature")
        if ts:
            time_sig = ts[0].ratioString
    except Exception:
        pass

    # Get tempo marking string
    tempo_str = None
    if tempo_list:
        first = tempo_list[0]
        tempo_str = first.get("text", "")
        if first.get("bpm"):
            tempo_str += f" ({first['bpm']} bpm)"

    total_measures = struct["total_measures"] if struct else None

    # Build partial result dict for demand detection
    partial = {
        "scales": scales,
        "arpeggios": arps,
        "intervals": interval_data,
        "rhythm": rhythm_data,
        "articulations": art_list,
        "register": reg,
    }

    difficulty = estimate_difficulty(score, key_str, rhythm_data, interval_data, art_list, reg)
    demands = auto_detect_demands(score, partial)

    return {
        "key_signature": key_str,
        "time_signature": time_sig,
        "tempo_marking": tempo_str,
        "difficulty_estimate": difficulty,
        "register_low": reg["lowest_note"] if reg else None,
        "register_high": reg["highest_note"] if reg else None,
        "total_measures": total_measures,
        "scales": scales,
        "arpeggios": arps,
        "intervals": interval_data,
        "rhythm": rhythm_data,
        "dynamics": dyn_list,
        "tempo_markings": tempo_list,
        "articulations": art_list,
        "structure": struct,
        "register": reg,
        "patterns": patterns,
        "demands": demands,
        "success": True,
        "error": None,
    }
