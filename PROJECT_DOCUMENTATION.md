# Proofy! — Project Documentation

## Project at a glance

**Proofy!** is a Chrome extension backed by a local Python API. It brings image, audio, video, and text inspection into one place, presents analysis signals with supporting evidence, and optionally saves summary metadata to Supabase.

| | |
|---|---|
| **Project type** | Browser extension and API-backed prototype |
| **Extension** | Chrome/Chromium, React, TypeScript, WXT |
| **Backend** | Python, FastAPI |
| **Optional persistence** | Supabase |
| **Current extension version** | 1.2.6 |
| **Primary purpose** | Help people decide what to investigate further when they encounter questionable media or claims |

> **Important:** Proofy! is an assistive prototype, not a forensic system or an authoritative fact-checker. Scores are uncertain signals and should not be treated as proof.

## The problem

People encounter manipulated media and unverified claims across websites and messaging platforms. Verification often requires switching between different tools, and automated detector scores can be difficult to interpret without context.

Proofy! provides a single extension interface for submitting different kinds of content and viewing a summary of the analysis. It aims to make the workflow more accessible while communicating that automated results have limitations.

## Project goals

- Provide a convenient browser-based entry point for inspecting images, audio, video, and text.
- Return understandable results and supporting evidence where available.
- Keep uploaded media and submitted text out of Supabase history storage.
- Make Supabase history optional, so analysis can still run without it.
- Encourage users to validate important claims with trustworthy sources and independent evidence.

## Proposed solution

Proofy! combines a browser extension with a local FastAPI backend:

1. A user selects or submits content through the extension.
2. The extension sends the content to the local backend.
3. The backend invokes the corresponding analysis implementation.
4. The backend returns a result and, where generated, links to evidence artifacts.
5. The extension displays the result and supporting context.
6. If configured, the backend writes analysis metadata to Supabase.

The extension’s API base URL is `http://127.0.0.1:8001`. The backend is intended for local development and demonstration.

## System architecture

```text
┌──────────────────────────────────────────┐
│            Chrome / Chromium             │
│                                          │
│  Proofy! extension                       │
│  - Image, audio, video, text tabs        │
│  - Upload progress and result display    │
│  - Context menu for web images           │
└────────────────────┬─────────────────────┘
                     │ HTTP / multipart upload
                     │ http://127.0.0.1:8001
                     ▼
┌──────────────────────────────────────────┐
│             FastAPI backend              │
│                                          │
│  - Request validation and upload limits  │
│  - Analysis orchestration                │
│  - Evidence artifact delivery             │
│  - Optional history writes               │
└──────────┬─────────────────────┬─────────┘
           │                     │
           ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Local inference and  │   │ Supabase             │
│ analysis pipelines   │   │ Optional metadata    │
│                      │   │ history              │
└─────────────────────┘   └─────────────────────┘
```

### Main code areas

- `extension/entrypoints/popup/App.tsx` — extension tabs, uploads, progress, errors, and result presentation.
- `extension/entrypoints/background.ts` — browser context-menu image analysis and notifications.
- `extension/wxt.config.ts` — extension name, permissions, and backend host permission.
- `backend.py` — FastAPI application and HTTP routes.
- `image_detector.py` and `gradcam.py` — image analysis and heatmap generation.
- `analyze_audio.py` and `analyze_video.py` — adapters to the bundled media pipelines.
- `text_checker.py` — text heuristic analysis.
- `supabase_store.py` — optional history persistence.
- `supabase_migrations/` — database schema migrations.
- `truthlens_media/` — bundled audio/video pipeline and licensing information.

## User-facing features

### Image inspection

Users can upload an image from the extension or right-click an image on a webpage and select **Analyze image with Proofy!** The API returns a label, score, explanation, and Grad-CAM visualization.

**Current implementation caveat:** the image pipeline uses a generic pretrained ResNet18 with a newly initialized classification head. It is a demonstration implementation, not a trained or validated deepfake detector. Image labels and scores should not be used to judge authenticity.

### Audio inspection

Users can upload supported audio files. The bundled audio pipeline combines an AASIST anti-spoofing model with signal-based frequency analysis and can produce a spectrogram artifact.

### Video inspection

Users can submit a supported video file. The pipeline samples frames and reports spatial, frequency, provenance, and temporal signals. It can provide face-map, timeline, and heatmap evidence where applicable.

The current video analysis tracks the largest detected face in sampled frames; it does not follow multiple people independently throughout the clip.

### Text assessment

Users can paste a claim or forwarded message. The backend applies keyword-based heuristics and returns a simple assessment and explanation.

**Current implementation caveat:** text assessment does not query fact-checking organizations or verify claims against authoritative sources. It is not a fact-checking model.

### Reverse-image search

The backend returns links for Google Lens and TinEye. The application opens manual search destinations and does not call their paid APIs.

### Optional Supabase history

When configured, the backend records the analysis type, label, score, explanation, model name, and timestamp. It does not store uploaded media or original submitted text. The extension currently has no history viewer.

## Analysis flow by content type

| Content | User action | Processing | Example returned information |
|---|---|---|---|
| Image | Upload an image or use the image context menu | Image classification prototype and visualization | Label, score, explanation, heatmap |
| Audio | Choose an audio file | AASIST and signal-based analysis | Score, signal streams, spectrogram |
| Video | Choose a video file | Frame sampling and multiple analysis streams | Score, uncertainty range, sampled-face findings, timeline/artifacts |
| Text | Paste text and submit | Keyword-based heuristic | Heuristic verdict and explanation |

For audio/video reports, scores are probabilities or signals produced by the pipeline; they are not guaranteed to be calibrated probabilities of authenticity.

## API overview

The local API listens on port `8001`. FastAPI's interactive documentation is available at `http://127.0.0.1:8001/docs` while the backend is running.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Check backend status and whether Supabase is configured |
| `POST` | `/analyze/image` | Analyze a base64-encoded image |
| `POST` | `/analyze/audio` | Analyze an audio file sent as multipart field `file` |
| `POST` | `/analyze/video` | Analyze a video file sent as multipart field `file` |
| `POST` | `/analyze/text` | Run text heuristics on a JSON text value |
| `POST` | `/reverse-search` | Return manual Google Lens and TinEye links |
| `GET` | `/artifacts/{filename}` | Retrieve a generated evidence artifact |

## Technology stack

| Layer | Technologies |
|---|---|
| Browser extension | Chrome Manifest V3, React, TypeScript, WXT |
| API server | Python, FastAPI, Uvicorn |
| Image and media processing | PyTorch, TorchVision, OpenCV, Pillow, SciPy, SoundFile, Transformers, MediaPipe |
| Persistence | Supabase Python client and PostgreSQL |
| Database access | SQL migrations, backend-only Supabase secret |

## Data handling and security

- The extension communicates with a local backend at `127.0.0.1:8001`.
- Audio/video uploads are processed by the backend and are not uploaded to Supabase as stored media.
- Analysis artifacts such as spectrograms and visualizations are generated locally.
- Supabase history stores summary metadata only; original media and submitted text are not stored there.
- Supabase credentials must remain server-side in the root `.env` file and must never be embedded in the extension.
- The backend is configured for local development. It should not be exposed publicly without authentication, request limits, restricted CORS, and deployment hardening.

## Upload constraints

| Type | Maximum file size | Maximum duration | Notes |
|---|---:|---:|---|
| Image | 10 MB in the extension | — | API accepts base64 input |
| Audio | 25 MB | 5 minutes | Codec availability depends on libsndfile support |
| Video | 100 MB | 60 seconds | Codec/container availability depends on OpenCV |

Model files may be downloaded the first time audio or video is analyzed. This requires internet access and may make the first request noticeably slower. Video analysis can also take a few minutes on CPU; keep the extension popup open while processing.

## Setup and demo flow

### Start the backend

From the project root in PowerShell:

```powershell
python -m pip install -r requirements.txt
python backend.py
```

Confirm the backend is ready at `http://127.0.0.1:8001/health`.

### Build and load the extension

```powershell
Set-Location .\extension
npm install
npm run compile
npm run build
```

In Chrome:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose `extension/.output/chrome-mv3`.
4. Open Proofy! and choose a content tab.
5. Select a small, supported sample file or paste a short text.
6. Show the returned report and explain that the result is an investigative signal—not a verdict.

For an image context-menu demo, open a webpage with a publicly accessible image, right-click it, and select **Analyze image with Proofy!**.

## Supabase setup summary

1. Create a Supabase project.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the root `.env`.
3. Run the migrations in order in the Supabase SQL Editor:
   - `supabase_migrations/20261031000000_create_analysis_history.sql`
   - `supabase_migrations/20261031000001_allow_media_analysis_history.sql`
4. Keep the Supabase secret exclusively on the backend.

Supabase is optional for analysis operation. If history storage is not configured or a write fails, analysis should still return a result.

## Known limitations and future improvements

### Known limitations

- The image classifier is not a trained/validated deepfake detection model.
- Text analysis relies on keywords rather than source verification.
- No user accounts or per-user history access are implemented.
- History is visible through Supabase, not in the extension.
- Supported codecs vary across Windows installations and OpenCV/libsndfile builds.
- First-run model downloads need internet and can delay responses.
- Local-development API configuration is not suitable for public production deployment.

### Possible next steps

- Replace the image demo classifier with a model validated on appropriate datasets and publish evaluation metrics.
- Integrate reputable fact-checking sources or retrieval for text claims, with source citations and freshness information.
- Add user authentication and a privacy-reviewed history interface.
- Add configurable analysis status, cancellation, and better handling of long-running uploads.
- Test broader codecs and provide specific unsupported-format guidance.
- Add abuse protection, authentication, deployment configuration, and monitoring before any public release.
- Conduct accessibility and usability testing with representative users.

## Presentation outline

1. **Problem:** verifying suspicious media and claims is fragmented and confusing.
2. **Solution:** one browser extension provides a convenient starting point for multiple content types.
3. **Demo:** show image, audio, video, and text flows; highlight evidence and uncertainty.
4. **Architecture:** extension → FastAPI → analysis pipeline → optional Supabase metadata.
5. **Privacy:** uploads and original text are not written to Supabase history.
6. **Honest limitations:** the image and text components are prototypes; outputs are not proof.
7. **Next steps:** validation, stronger fact-checking, user history/authentication, and production hardening.

## License and attribution

Bundled audio/video inference code and component notices are in [`truthlens_media/`](./truthlens_media/) and [`truthlens_media/LICENSES.md`](./truthlens_media/LICENSES.md). Model weights and third-party dependencies may have separate terms; review their upstream license and model-card information before redistribution or commercial use.

## Related documentation

- [Developer setup and troubleshooting](./README.md)
- [Bundled media inference licenses](./truthlens_media/LICENSES.md)
