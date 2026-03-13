"""Claude API integration for flute-specific music analysis."""

import json
import logging

from app.config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

# Sonnet pricing per million tokens
SONNET_INPUT_PRICE = 3.0  # $/1M tokens
SONNET_OUTPUT_PRICE = 15.0  # $/1M tokens


def _build_prompt(musicxml_snippet: str, basic_analysis: dict) -> str:
    """Build the Claude prompt for flute-specific analysis."""
    analysis_summary = json.dumps(basic_analysis, indent=2, default=str)

    return f"""You are an expert flute teacher and performer analyzing a piece of sheet music.
Given the MusicXML excerpt and basic music analysis below, provide flute-specific insights.

Return your response as valid JSON with exactly this structure:
{{
  "breathing_points": [
    {{"measure": 4, "beat": 1, "suggestion": "Natural breath after phrase end"}}
  ],
  "alternate_fingerings": [
    {{"note": "C#5", "measure": 8, "fingering": "Use trill fingering for smoother transition"}}
  ],
  "tone_color_notes": [
    "Bar 12: Use warm, dark tone for the low register melody",
    "Bar 20: Brighten tone for the ascending passage"
  ],
  "technique_warnings": [
    {{"description": "Wide interval leap", "measure": 15, "suggestion": "Practice slow, focus on air support"}}
  ],
  "practice_suggestions": [
    "Start at 60% tempo, focus on even tone across register changes",
    "Isolate bars 12-16 for interval practice"
  ]
}}

Basic analysis:
{analysis_summary}

MusicXML excerpt (first section):
{musicxml_snippet}

Return ONLY the JSON object, no other text."""


def analyze_flute_specific(musicxml_content: str, basic_analysis: dict) -> dict:
    """Call Claude API for flute-specific analysis.

    Returns dict matching ClaudeEnhanceResponse schema fields.
    """
    if not ANTHROPIC_API_KEY:
        return {
            "flute_analysis": None,
            "estimated_tokens": 0,
            "estimated_cost_usd": 0.0,
            "success": False,
            "error": "ANTHROPIC_API_KEY not configured. Claude enhancement unavailable.",
        }

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Use first ~2000 chars of MusicXML
        snippet = musicxml_content[:2000]
        prompt = _build_prompt(snippet, basic_analysis)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract token usage
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        total_tokens = input_tokens + output_tokens
        cost = (
            input_tokens * SONNET_INPUT_PRICE / 1_000_000
            + output_tokens * SONNET_OUTPUT_PRICE / 1_000_000
        )

        # Parse response text as JSON
        response_text = response.content[0].text.strip()

        # Handle potential markdown code fences
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (code fences)
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        flute_data = json.loads(response_text)

        return {
            "flute_analysis": {
                "breathing_points": flute_data.get("breathing_points", []),
                "alternate_fingerings": flute_data.get("alternate_fingerings", []),
                "tone_color_notes": flute_data.get("tone_color_notes", []),
                "technique_warnings": flute_data.get("technique_warnings", []),
                "practice_suggestions": flute_data.get("practice_suggestions", []),
            },
            "estimated_tokens": total_tokens,
            "estimated_cost_usd": round(cost, 6),
            "success": True,
            "error": None,
        }

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Claude response as JSON: {e}")
        return {
            "flute_analysis": None,
            "estimated_tokens": 0,
            "estimated_cost_usd": 0.0,
            "success": False,
            "error": f"Failed to parse Claude response: {e}",
        }
    except Exception as e:
        logger.exception("Claude analysis failed")
        return {
            "flute_analysis": None,
            "estimated_tokens": 0,
            "estimated_cost_usd": 0.0,
            "success": False,
            "error": str(e),
        }


def estimate_cost(musicxml_content: str, basic_analysis: dict) -> dict:
    """Estimate Claude API cost without making a call.

    Returns dict matching CostEstimateResponse schema fields.
    """
    try:
        snippet = musicxml_content[:2000]
        prompt = _build_prompt(snippet, basic_analysis)

        # Rough token estimate: ~4 chars per token
        estimated_input = len(prompt) // 4
        estimated_output = 500  # typical response size

        input_cost = estimated_input * SONNET_INPUT_PRICE / 1_000_000
        output_cost = estimated_output * SONNET_OUTPUT_PRICE / 1_000_000
        total_cost = input_cost + output_cost

        return {
            "estimated_input_tokens": estimated_input,
            "estimated_output_tokens": estimated_output,
            "estimated_cost_usd": round(total_cost, 6),
            "description": (
                f"Estimated ~{estimated_input} input tokens + ~{estimated_output} output tokens "
                f"using Claude Sonnet. Approximate cost: ${total_cost:.4f} USD."
            ),
        }

    except Exception as e:
        logger.exception("Cost estimation failed")
        return {
            "estimated_input_tokens": 0,
            "estimated_output_tokens": 0,
            "estimated_cost_usd": 0.0,
            "description": f"Error estimating cost: {e}",
        }
