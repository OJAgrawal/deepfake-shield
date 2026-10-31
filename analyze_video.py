"""Video analysis adapter for the bundled inference pipeline."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_MEDIA_PACKAGE_ROOT = Path(__file__).resolve().parent / "truthlens_media"
if str(_MEDIA_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(_MEDIA_PACKAGE_ROOT))

os.environ.setdefault("VERIFRAME_PUBLIC_BASE_URL", "http://127.0.0.1:8001")

from app.pipeline.analyze_video import VideoTooLongError, analyze_video
from app.pipeline.video_io import VideoDecodeError

__all__ = ["VideoDecodeError", "VideoTooLongError", "analyze_video"]
