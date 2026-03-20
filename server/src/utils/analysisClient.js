const ANALYSIS_URL =
  process.env.ANALYSIS_SERVICE_URL || "http://localhost:8001";

export async function callOmr(fileBuffer, filename) {
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), filename);

  const res = await fetch(`${ANALYSIS_URL}/omr/process`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`OMR service error: ${res.status}`);
  return res.json();
}

export async function callAnalysis(musicxmlContent) {
  const res = await fetch(`${ANALYSIS_URL}/analysis/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicxml_content: musicxmlContent }),
  });
  if (!res.ok) throw new Error(`Analysis service error: ${res.status}`);
  return res.json();
}

export async function callClaudeEnhance(musicxmlContent, basicAnalysis) {
  const res = await fetch(`${ANALYSIS_URL}/analysis/claude-enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      musicxml_content: musicxmlContent,
      basic_analysis: basicAnalysis,
    }),
  });
  if (!res.ok) throw new Error(`Claude enhance service error: ${res.status}`);
  return res.json();
}

export async function callEstimateCost(musicxmlContent, basicAnalysis) {
  const res = await fetch(`${ANALYSIS_URL}/analysis/estimate-cost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      musicxml_content: musicxmlContent,
      basic_analysis: basicAnalysis,
    }),
  });
  if (!res.ok) throw new Error(`Cost estimate service error: ${res.status}`);
  return res.json();
}
