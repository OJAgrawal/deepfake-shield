export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "truthlens-analyze",
      title: "Analyze image with TruthLens",
      contexts: ["image"]
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "truthlens-analyze" && info.srcUrl) {
      try {
        // Fetch image bytes via background script, convert to base64, and send to backend
        const response = await fetch(info.srcUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result;
          const apiRes = await fetch('http://localhost:8000/analyze/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64data })
          });
          const result = await apiRes.json();

          browser.notifications.create({
            type: 'basic',
            iconUrl: 'icon/48.png',
            title: `TruthLens: ${result.label} (${(result.confidence * 100).toFixed(1)}%)`,
            message: result.explanation || "Analysis complete."
          });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("TruthLens context menu error:", err);
      }
    }
  });
});
