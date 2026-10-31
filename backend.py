import base64
import logging
import mimetypes

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from analyze_audio import AudioDecodeError, AudioTooLongError, analyze_audio
from analyze_video import VideoDecodeError, VideoTooLongError, analyze_video
from gradcam import generate_gradcam
from image_detector import analyze_image_bytes, detector_model
from supabase_store import save_analysis_history, supabase_configured
from text_checker import TextRequest, analyze_text
from app.config import get_settings

logger = logging.getLogger(__name__)
app = FastAPI(title="TruthLens Backend")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount(
    "/artifacts",
    StaticFiles(directory=settings.artifact_dir),
    name="artifacts",
)


class ImageRequest(BaseModel):
    image_base64: str


def _media_history_record(report: dict) -> dict:
    model_names = report.get("model_versions", {})
    return {
        "label": f"Manipulation signal: {report['band']}",
        "confidence": report["score"],
        "explanation": report["disclaimer"],
        "model_name": ", ".join(model_names.values()) or "TruthLens media analysis",
    }


async def _analyze_uploaded_media(
    upload: UploadFile,
    media_kind: str,
    max_bytes: int,
):
    content_type = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if content_type in {"", "application/octet-stream"}:
        guessed_type, _ = mimetypes.guess_type(upload.filename or "")
        content_type = (
            guessed_type
            if guessed_type and guessed_type.startswith(f"{media_kind}/")
            else f"{media_kind}/octet-stream"
        )
    if not content_type.startswith(f"{media_kind}/"):
        raise HTTPException(
            status_code=415,
            detail=f"Upload a {media_kind} file with a valid content type.",
        )

    raw = await upload.read(max_bytes + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"The upload exceeds the {max_bytes // (1024 * 1024)} MB limit.",
        )

    analyze = analyze_audio if media_kind == "audio" else analyze_video
    expected_decode_error = AudioDecodeError if media_kind == "audio" else VideoDecodeError
    expected_length_error = AudioTooLongError if media_kind == "audio" else VideoTooLongError
    try:
        report = await run_in_threadpool(
            analyze,
            raw,
            filename=upload.filename,
            mime_type=content_type,
        )
    except expected_decode_error as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except expected_length_error as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("%s analysis failed", media_kind)
        raise HTTPException(
            status_code=500,
            detail=f"{media_kind.capitalize()} analysis failed. Check the backend logs.",
        ) from exc

    result = report.model_dump(mode="json")
    result["history_saved"] = await save_analysis_history(
        media_kind, _media_history_record(result)
    )
    return result


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "supabase_configured": supabase_configured(),
        "audio_video_analysis": "available",
    }


@app.post("/analyze/image")
async def analyze_image(request: ImageRequest):
    try:
        _, encoded = (
            request.image_base64.split(",", 1)
            if "," in request.image_base64
            else (None, request.image_base64)
        )
        image_bytes = base64.b64decode(encoded, validate=True)
        result = analyze_image_bytes(image_bytes)
        if "error" in result:
            return result

        result["heatmap"] = generate_gradcam(image_bytes, detector_model)
        confidence = result["confidence"]
        if result["label"] == "AI-Generated":
            result["explanation"] = (
                f"Our model detected patterns typical of AI generation with "
                f"{confidence * 100:.1f}% confidence. Suspicious noise and texture "
                "artifacts were found in the highlighted regions."
            )
        else:
            result["explanation"] = (
                f"The media appears consistent with authentic imagery "
                f"({confidence * 100:.1f}% confidence). No significant generative "
                "artifacts were detected."
            )
        result["history_saved"] = await save_analysis_history("image", result)
        return result
    except Exception as exc:
        logger.exception("Image analysis failed")
        raise HTTPException(status_code=500, detail="Image analysis failed.") from exc


@app.post("/analyze/audio")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    return await _analyze_uploaded_media(
        file, "audio", get_settings().max_audio_bytes
    )


@app.post("/analyze/video")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    return await _analyze_uploaded_media(
        file, "video", get_settings().max_video_bytes
    )


@app.post("/analyze/text")
async def analyze_text_endpoint(request: TextRequest):
    result = await analyze_text(request)
    if "error" not in result:
        result["history_saved"] = await save_analysis_history("text", result)
    return result


@app.post("/reverse-search")
async def reverse_search(request: ImageRequest):
    return {
        "google_lens_url": "https://lens.google.com/upload",
        "tineye_url": "https://tineye.com/search",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
