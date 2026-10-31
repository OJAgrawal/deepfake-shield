from pydantic import BaseModel

class TextRequest(BaseModel):
    text: str

async def analyze_text(request: TextRequest):
    """
    Cross-checks pasted or highlighted text claims against known misinformation patterns / OpenFactVerification stub.
    """
    query = request.text.strip()
    if not query:
        return {"error": "Empty text provided."}

    # Hackathon robust stub using keyword / heuristic cross-checking or OpenFactVerification pattern
    suspicious_keywords = ["miracle", "secret cure", "shocking", "they don't want you to know", "guaranteed", "100% true"]
    is_suspicious = any(kw in query.lower() for kw in suspicious_keywords)

    if is_suspicious:
        verdict = "Potentially Misleading / Unverified Claim"
        confidence = 0.85
        explanation = "This claim contains sensationalist phrasing or patterns frequently associated with unverified forwarded messages. No authoritative fact-checking source confirms this."
    else:
        verdict = "Likely Neutral / Standard Text"
        confidence = 0.70
        explanation = "No major misinformation markers detected in this text snippet. However, always cross-reference with credible news sources."

    return {
        "text": query,
        "verdict": verdict,
        "confidence": confidence,
        "explanation": explanation,
        "model_name": "TruthLens-OpenFact-Stub",
        "disclaimer": "Automated text verification is probabilistic. Verify with journalists and fact-checkers."
    }
