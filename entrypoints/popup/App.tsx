import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File too large (Max 10MB)");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = async () => {
        setLoading(true);
        try {
          const res = await fetch('http://localhost:8000/analyze/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: reader.result })
          });
          const data = await res.json();
          setResult(data);
        } catch (err) {
          alert("Error connecting to backend");
        }
        setLoading(false);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="container" style={{ padding: 16, width: 350, fontFamily: 'system-ui' }}>
      <h2 style={{ margin: '0 0 16px' }}>🛡️ TruthLens</h2>

      <div className="upload-section">
        <label className="button">
          {loading ? 'Analyzing...' : 'Upload Image'}
          <input type="file" hidden onChange={handleUpload} accept="image/*" disabled={loading} />
        </label>
      </div>

      {result && (
        <div className="result-card" style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontWeight: 'bold',
              color: result.label === 'AI-Generated' ? '#d32f2f' : '#2e7d32',
              fontSize: '1.1em'
            }}>
              {result.label}
            </span>
            <span style={{ fontSize: '0.9em', color: '#666' }}>
              {(result.confidence * 100).toFixed(1)}%
            </span>
          </div>

          <div style={{
            height: 8,
            background: '#eee',
            borderRadius: 4,
            marginTop: 8,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${result.confidence * 100}%`,
              background: result.label === 'AI-Generated' ? '#f44336' : '#4caf50'
            }} />
          </div>

          {result.heatmap && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.8em', color: '#666' }}>Suspicious Regions (Grad-CAM):</p>
              <img src={result.heatmap} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc' }} />
            </div>
          )}

          <p style={{ fontSize: '0.9em', marginTop: 12, lineHeight: 1.4 }}>{result.explanation}</p>

          <div style={{
            fontSize: '0.7em',
            color: '#888',
            marginTop: 12,
            borderTop: '1px solid #eee',
            paddingTop: 8
          }}>
            Model: {result.model_name}<br/>
            {result.disclaimer}
          </div>

          <div style={{ marginTop: 12 }}>
            <a href="https://lens.google.com/upload" target="_blank" style={{ fontSize: '0.8em', color: '#1a73e8', textDecoration: 'none' }}>
              Verify with Google Lens →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
