from __future__ import annotations

import asyncio
import logging
import os
from functools import lru_cache
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv

if TYPE_CHECKING:
    from supabase import Client

load_dotenv()

logger = logging.getLogger(__name__)


def supabase_configured() -> bool:
    return bool(
        os.getenv("SUPABASE_URL")
        and (
            os.getenv("SUPABASE_SECRET_KEY")
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
    )


@lru_cache(maxsize=1)
def _get_supabase_client() -> Client:
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY (or "
            "SUPABASE_SERVICE_ROLE_KEY) in the backend environment."
        )
    return create_client(url, key)


async def save_analysis_history(
    analysis_type: str, result: dict[str, Any]
) -> bool:
    if not supabase_configured():
        logger.warning(
            "Supabase history was not saved because server credentials are not configured."
        )
        return False

    label = result.get("label") or result.get("verdict") or result.get("band")
    confidence = result.get("confidence") if result.get("confidence") is not None else result.get("score")
    explanation = result.get("explanation") or (result.get("conclusion", {}).get("detail") if isinstance(result.get("conclusion"), dict) else "Analysis complete")
    model_name = result.get("model_name") or (str(result.get("model_versions")) if result.get("model_versions") else "Proofy-Ensemble")
    if (
        analysis_type not in {"image", "text", "audio", "video"}
        or not isinstance(label, str)
        or not isinstance(confidence, (int, float))
        or not isinstance(explanation, str)
        or not isinstance(model_name, str)
    ):
        raise ValueError("Analysis result is missing required history fields.")

    record = {
        "analysis_type": analysis_type,
        "label": label,
        "confidence": confidence,
        "explanation": explanation,
        "model_name": model_name,
    }

    try:
        await asyncio.to_thread(
            lambda: _get_supabase_client()
            .table("analysis_history")
            .insert(record)
            .execute()
        )
    except Exception:
        logger.exception("Failed to save analysis history to Supabase.")
        return False
    return True
