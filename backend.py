from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
import io
from pydantic import BaseModel
from image_detector import analyze_image_bytes, detector_model
from gradcam import generate_gradcam

app = FastAPI(title="TruthLens Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    image_base64: str

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze/image")
async def analyze_image(request: ImageRequest):
    try:
        # Strip header if present
        header, encoded = request.image_base64.split(",", 1) if "," in request.image_base64 else (None, request.image_base64)
        image_bytes = base64.b64decode(encoded)

        # 1. Detection
        result = analyze_image_bytes(image_bytes)
        if "error" in result:
            return result

        # 2. Grad-CAM (Visual Explainability)
        heatmap = generate_gradcam(image_bytes, detector_model)
        result["heatmap"] = heatmap

        # 3. Textual Explanation
        conf = result["confidence"]
        label = result["label"]
        if label == "AI-Generated":
            explanation = f"Our model detected patterns typical of AI generation with {conf*100:.1f}% confidence. Suspicious noise and texture artifacts were found in the highlighted regions."
        else:
            explanation = f"The media appears consistent with authentic imagery ({conf*100:.1f}% confidence). No significant generative artifacts were detected."

        result["explanation"] = explanation
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/reverse-search")
async def reverse_search(request: ImageRequest):
    # In a real app, we'd use Google Lens/TinEye APIs. For the hackathon, we return the search URLs.
    # Note: Google Lens requires the image URL, so we simulate the endpoint.
    return {
        "google_lens_url": "https://lens.google.com/upload",
        "tineye_url": "https://tineye.com/search"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
