# Proofy!

Proofy! is a Chrome extension with a local FastAPI backend for inspecting images, audio, video, and text. It provides probabilistic signals and supporting artifacts to help users decide what to investigate further. It is a prototype, not a forensic tool or a source of definitive authenticity or fact-checking decisions.

## What it does

- **Images:** Upload an image in the extension or right-click a web image and choose **Analyze image with Proofy!** The backend returns a label, score, explanation, and Grad-CAM visualization.
- **Audio:** Upload an audio file to receive an AASIST anti-spoofing score, signal-analysis evidence, and a spectrogram.
- **Video:** Upload a video to analyze sampled frames, detected faces, spatial/frequency/provenance signals, and temporal measurements.
- **Text:** Paste a claim to receive a basic keyword-heuristic assessment. This does not query an authoritative fact-checking service.
- **Reverse-image search:** Open Google Lens or TinEye links to search manually. The project does not call their paid APIs.
- **Optional history:** Save analysis metadata in Supabase. Uploaded media and submitted text are not stored in the history table.

### Important accuracy limitations

The audio/video pipeline uses pretrained inference models. Image analysis is currently a **demo implementation**: it loads a generic pretrained ResNet18 and replaces its classification head with a newly initialized head, so its label and score are not a validated deepfake detector. The text analyzer is a keyword heuristic, not a fact-checking model. Do not treat any result as proof that content is genuine, fake, or false.

## Project layout

```text
.
├── backend.py                 # FastAPI app and API routes
├── image_detector.py          # Prototype image classifier
├── gradcam.py                 # Image evidence visualization
├── analyze_audio.py            # Adapter to bundled audio pipeline
├── analyze_video.py            # Adapter to bundled video pipeline
├── text_checker.py             # Heuristic text assessment
├── supabase_store.py           # Optional history persistence
├── supabase_migrations/        # SQL migrations for analysis history
├── truthlens_media/            # Bundled audio/video inference code and notices
└── extension/                  # WXT + React Chrome extension (Proofy! 1.2.6)
```

The media inference implementation and its licensing information are included in [truthlens_media](./truthlens_media/) and [LICENSES.md](./truthlens_media/LICENSES.md). Model weights are downloaded separately on first use and are not included in the repository.

## Landing page download

The standalone [Proofy landing page](./Proofy_%20See%20through%20the%20fakes.html) links to `proofy-extension.zip` in the same directory. Host both files together for the download buttons to work. The ZIP is a developer-mode extension package, not a Chrome Web Store one-click install. After extracting it, load the folder containing `manifest.json` from `chrome://extensions` with Developer mode enabled.

To rebuild the ZIP after changing the extension, run `npm run zip` from `extension`, then copy `extension/.output/wxt-react-starter-1.2.6-chrome.zip` to the project root as `proofy-extension.zip`. The current extension also requires the Proofy backend running locally at `127.0.0.1:8001`; it is not a public hosted service.

## Requirements

- Windows 10/11 (commands below use PowerShell)
- Python 3.11 or newer
- Node.js 18 or newer and npm
- Chrome or another Chromium browser for loading the extension
- Internet access for installing packages and downloading model files on first use
- A Supabase project only if you want analysis history saved

## Setup

Open PowerShell in the repository root.

### 1. Create a Python environment and install backend dependencies

Using a virtual environment is recommended:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If `py` is not available, use the full path to your Python executable. For example:

```powershell
& "C:\Users\YOUR_NAME\AppData\Local\Programs\Python\Python313\python.exe" -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks environment activation, either allow it for the current terminal with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, or call the environment's Python directly:

```powershell
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Use `python -m pip` rather than `pip` if PowerShell reports that `pip` is not recognized. If Python 3.13 is installed at a custom path, run that interpreter explicitly.

### 2. Configure optional Supabase history

1. Create a project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. In the repository root, create a `.env` file.
3. Add the project URL and a **server-only** Supabase secret key:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
   ```

   The backend also accepts `SUPABASE_SERVICE_ROLE_KEY` for older projects. Never put either secret in the extension, expose it in browser code, or commit it to source control. The root `.env` is Git-ignored.
4. In the Supabase Dashboard SQL Editor, run these files in order:
   - [`supabase_migrations/20261031000000_create_analysis_history.sql`](./supabase_migrations/20261031000000_create_analysis_history.sql)
   - [`supabase_migrations/20261031000001_allow_media_analysis_history.sql`](./supabase_migrations/20261031000001_allow_media_analysis_history.sql)

Supabase is optional. Analysis endpoints still return results if it is not configured or a history write fails. The extension does not currently have a history viewer. Only analysis type, label, score, explanation, model name, and timestamp are written; original uploads and submitted text are not.

### 3. Start the backend

From the repository root, with the virtual environment active:

```powershell
python backend.py
```

The API listens on `http://127.0.0.1:8001`. Keep this terminal open while using the extension. Check `http://127.0.0.1:8001/health` for service status and `http://127.0.0.1:8001/docs` for interactive API documentation.

If port 8001 is already in use, stop the other service or change the port consistently in `backend.py`, `extension/entrypoints/popup/App.tsx`, `extension/wxt.config.ts`, and the media adapter defaults. Do not change only one of these locations.

### 4. Build and load Proofy!

In a second PowerShell terminal:

```powershell
Set-Location .\extension
npm install
npm run compile
npm run build
```

Then:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `extension/.output/chrome-mv3`.
4. After changing code or rebuilding, click **Reload** on the Proofy! extension card.

The extension popup provides image, audio, video, and text tabs. The generated icon assets are in [`extension/public/icon/`](./extension/public/icon/).

## API reference

All routes are served by the local backend on port `8001`.

| Method | Route | Input | Description |
|---|---|---|---|
| `GET` | `/health` | None | Backend and optional Supabase configuration status |
| `POST` | `/analyze/image` | JSON: `{"image_base64":"..."}` | Analyze a base64-encoded image |
| `POST` | `/analyze/audio` | Multipart form field `file` | Analyze an audio upload |
| `POST` | `/analyze/video` | Multipart form field `file` | Analyze a video upload |
| `POST` | `/analyze/text` | JSON: `{"text":"..."}` | Apply text heuristics to a claim |
| `POST` | `/reverse-search` | JSON image request | Return Google Lens and TinEye search URLs |
| `GET` | `/artifacts/{filename}` | None | Serve generated plots and visual evidence |

Example media uploads from PowerShell:

```powershell
curl.exe -F "file=@C:\path\to\clip.wav" http://127.0.0.1:8001/analyze/audio
curl.exe -F "file=@C:\path\to\clip.mp4" http://127.0.0.1:8001/analyze/video
```

Typical reports include a score, band, uncertainty range, model versions, input metadata, and evidence streams. Audio/video scores are between `0` and `1`; they are signals, not calibrated proof. Errors such as unsupported media, unreadable files, oversized files, or overlong clips are returned with an HTTP error and detail message.

## Upload limits and formats

- **Images:** Extension picker limit 10 MB.
- **Audio:** Backend limit 25 MB and 5 minutes. Decoding depends on installed libsndfile support (WAV and FLAC are expected; OGG/MP3 support varies).
- **Video:** Backend limit 100 MB and 60 seconds. Supported containers/codecs depend on the OpenCV build; MP4/MOV/WebM/AVI and other common formats may work when their codec is available.

The audio/video file picker lists common extensions, but selecting a file does not guarantee its codec can be decoded. Keep the extension popup open during upload and analysis; video analysis can take several minutes, especially on first use.

## Models, downloads, and generated files

On the first audio/video analysis, the backend may download pretrained weights and model assets. Internet access is required, and startup or analysis can take longer while downloads complete. Downloaded model caches are stored under `truthlens_media/.model_cache/`; generated plots and face-map artifacts are stored under `truthlens_media/.artifacts/`. These runtime files are Git-ignored.

Audio analysis uses the bundled AASIST checkpoint and signal-based frequency analysis. Video analysis samples a limited number of frames for expensive spatial analysis and uses a separate dense frame window for temporal measurements. The video pipeline currently tracks the largest detected face per sampled frame; multi-person tracking is not implemented.

## Troubleshooting

- **`pip` is not recognized:** Use `python -m pip install -r requirements.txt` or the full Python path followed by `-m pip`.
- **`No module named ...`:** Activate the project virtual environment and reinstall with `python -m pip install -r requirements.txt`.
- **Backend health check fails:** Confirm `python backend.py` is still running, then open `http://127.0.0.1:8001/health`. Check for a port conflict or dependency/import error in the backend terminal.
- **Extension cannot contact the backend:** Confirm the backend is listening on port 8001, reload Proofy! in `chrome://extensions/`, and check the popup's error message.
- **Video/audio reports an unsupported or unreadable file:** Try a standard MP4 (H.264/AAC) or WAV file. Some codecs are not available in every OpenCV/libsndfile build.
- **Video takes a long time:** Leave the popup open. Initial model and landmark asset downloads require internet; subsequent runs can reuse the local cache.
- **History is missing:** Check the backend's Supabase configuration and logs, confirm both SQL migrations ran successfully, and verify that the backend secret key is valid.

## Validation commands

```powershell
# Backend syntax
python -m py_compile backend.py analyze_audio.py analyze_video.py

# Extension type-check and production build
Set-Location .\extension
npm run compile
npm run build
```

## Privacy and security

- Media is processed by the local backend and is not stored as an upload in Supabase. Generated artifacts are written locally.
- Supabase stores analysis metadata only; this project does not implement user authentication or per-user history access.
- The backend is configured for local development. Do not expose it directly to the public internet without adding authentication, request limits, restricted CORS, and deployment hardening.
- Do not commit `.env` or paste secret keys into source files, screenshots, issue trackers, or chat.

## License and attribution

The bundled audio/video inference implementation and its notices are under [`truthlens_media/`](./truthlens_media/). Model weights, model cards, datasets, and Python dependencies may have separate license terms; consult [`truthlens_media/LICENSES.md`](./truthlens_media/LICENSES.md) and each upstream model's license before redistribution or commercial use.
