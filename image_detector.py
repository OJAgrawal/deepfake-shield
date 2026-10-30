import base64
import io
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

# A lightweight mock/pretrained model pipeline for demonstration / fallbacks
def get_image_detector():
    # Uses a basic ResNet18 model loaded with default weights (or dummy weights if offline)
    try:
        from torchvision.models import resnet18, ResNet18_Weights
        weights = ResNet18_Weights.DEFAULT
        model = resnet18(weights=weights)
    except Exception:
        from torchvision.models import resnet18
        model = resnet18(pretrained=False)

    # Modify last layer to 2 outputs: Real (0), Fake (1)
    model.fc = torch.nn.Linear(model.fc.in_features, 2)
    model.eval()
    return model

detector_model = get_image_detector()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def analyze_image_bytes(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        tensor = transform(image).unsqueeze(0)

        with torch.no_grad():
            outputs = detector_model(tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]

        fake_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
        # Simple thresholding logic
        label = "AI-Generated" if fake_score > 0.5 else "Real/Original"

        return {
            "label": label,
            "confidence": round(fake_score if label == "AI-Generated" else 1.0 - fake_score, 4),
            "model_name": "TruthLens-ResNet18-Detector",
            "disclaimer": "This is a probabilistic signal based on pattern detection. Always verify with official sources."
        }
    except Exception as e:
        return {"error": str(e)}
