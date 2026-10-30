import io
import cv2
import numpy as np
import torch
import torchvision.transforms as transforms
from PIL import Image
import base64

def generate_gradcam(image_bytes, model):
    try:
        # Load image
        raw_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        raw_img = raw_img.resize((224, 224))
        img_np = np.array(raw_img)

        # Standard PyTorch normalization
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        input_tensor = transform(raw_img).unsqueeze(0)

        # Hook to capture activations and gradients from layer4 (last conv layer of ResNet)
        target_layer = model.layer4
        activations = []
        gradients = []

        def forward_hook(module, input, output):
            activations.append(output)

        def backward_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        handle_fwd = target_layer.register_forward_hook(forward_hook)
        handle_bwd = target_layer.register_full_backward_hook(backward_hook)

        # Forward pass
        output = model(input_tensor)
        target_class = output.argmax(dim=1).item()

        # Backward pass
        model.zero_grad()
        output[0, target_class].backward()

        # Remove hooks
        handle_fwd.remove()
        handle_bwd.remove()

        # Compute Grad-CAM
        grads = gradients[0].cpu().data.numpy()[0]
        acts = activations[0].cpu().data.numpy()[0]

        weights = np.mean(grads, axis=(1, 2))
        cam = np.zeros(acts.shape[1:], dtype=np.float32)

        for i, w in enumerate(weights):
            cam += w * acts[i]

        cam = np.maximum(cam, 0)
        if cam.max() != 0:
            cam = cam / cam.max()
        cam = cv2.resize(cam, (224, 224))

        # Create heatmap overlay
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        overlay = np.uint8(0.6 * img_np + 0.4 * heatmap)

        # Convert back to PNG base64
        pil_overlay = Image.fromarray(overlay)
        buffered = io.BytesIO()
        pil_overlay.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        return None
