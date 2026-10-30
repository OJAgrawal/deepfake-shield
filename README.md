# TruthLens: Deepfake and Misinformation Shield

TruthLens is a Chrome extension paired with a FastAPI/PyTorch backend to detect AI-generated images, provide visual explainability via Grad-CAM heatmaps, reverse-image search, and cross-check claims. Built for journalists, fact-checkers, and everyday users.

---

## Prerequisites
- Python 3.10+
- Node.js 18+ & npm

---

## Setup & Running

### 1. Start the Backend
```bash
pip install -r requirements.txt
python backend.py
```
*(The backend runs on `http://localhost:8000`)*

### 2. Build & Load the Chrome Extension
```cd extension
npm install
npm run build
```
To load the extension in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/.output/chrome-mv3` directory.

---

## Features
- **AI Image Detection**: Leverages PyTorch to detect generative image artifacts with a color-coded confidence score.
- **Grad-CAM Explainability**: Generates and overlays heatmaps highlighting suspicious image regions.
- **Context Menu Integration**: Right-click any image on the web to instantly analyze it via the backend.
- **Reverse-Image Search**: Quick access to Google Lens and TinEye search.
