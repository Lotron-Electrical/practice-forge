import logging

from fastapi import APIRouter

from app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    ClaudeEnhanceRequest,
    ClaudeEnhanceResponse,
    CostEstimateResponse,
)
from app.services.music21_analyzer import analyze_score
from app.services.claude_analyzer import analyze_flute_specific, estimate_cost

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """Run all music21 analysis functions on MusicXML content."""
    try:
        result = analyze_score(request.musicxml_content)
        return AnalysisResponse(**result)
    except Exception as e:
        logger.exception("Analysis failed")
        return AnalysisResponse(success=False, error=str(e))


@router.post("/claude-enhance", response_model=ClaudeEnhanceResponse)
async def claude_enhance(request: ClaudeEnhanceRequest):
    """Call Claude API for flute-specific analysis enhancement."""
    try:
        result = analyze_flute_specific(
            request.musicxml_content, request.basic_analysis
        )
        return ClaudeEnhanceResponse(**result)
    except Exception as e:
        logger.exception("Claude enhancement failed")
        return ClaudeEnhanceResponse(success=False, error=str(e))


@router.post("/estimate-cost", response_model=CostEstimateResponse)
async def cost_estimate(request: ClaudeEnhanceRequest):
    """Estimate Claude API cost without making a call."""
    try:
        result = estimate_cost(request.musicxml_content, request.basic_analysis)
        return CostEstimateResponse(**result)
    except Exception as e:
        logger.exception("Cost estimation failed")
        return CostEstimateResponse(
            estimated_input_tokens=0,
            estimated_output_tokens=0,
            estimated_cost_usd=0.0,
            description=f"Error: {e}",
        )
