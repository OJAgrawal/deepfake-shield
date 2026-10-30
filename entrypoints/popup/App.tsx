import { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [textInput, setTextInput] = useState('');
  const [textResult, setTextResult] = useState<any>(null);
  const [textLoading, setTextLoading] = useState(false);

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

  const handleTextCheck = async () => {
    if (!textInput.trim()) return;
    setTextLoading(true);
    try {
      const res = await fetch('http://localhost:8000/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });
      const data = await res.json();
      setTextResult(data);
    } catch (err) {
      alert("Error connecting to backend");
    }
    setTextLoading(false);
  };

  return (
    <div className="container" style={{ padding: 16, width: 350, fontFamily: 'system-ui' }}>
      <h2 style={{ margin: '0 0 12px' }}>🛡️ TruthLens</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('image')}
          style={{
            flex: 1,
            padding: '6px',
            background: activeTab === 'image' ? '#1a73e8' : '#f0f0f0',
            color: activeTab === 'image' ? '#fff' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Image & Deepfake
        </button>
        <button
          onClick={() => setActiveTab('text')}
          style={{
            flex: 1,
            padding: '6px',
            background: activeTab === 'text' ? '#1a73e8' : '#f0f0f0',
            color: activeTab === 'text' ? '#fff' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Text Claim Check
        </button>
      </div>

      {activeTab === 'image' ? (
        <div>
          <div className="upload-section">
            <label className="button" style={{ display: 'block', textAlign: 'center', background: '#f1f3f4', padding: '10px', borderRadius: 4, cursor: 'pointer', border: '1px dashed #ccc' }}>
              {loading ? 'Analyzing...' : '📤 Upload Image (Max 10MB)'}
              <input type="file" hidden onChange={handleUpload} accept="image/*" disabled={loading} />
            </label>
          </div>

          {result && (
            <div className="result-card" style={{ marginTop: 12, border: '1px solid #ddd', padding: 10, borderRadius: 6, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: result.label === 'AI-Generated' ? '#d32f2f' : '#2e7d32',
                  fontSize: '1em'
                }}>
                  {result.label}
                </span>
                <span style={{ fontSize: '0.85em', color: '#666' }}>
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>

              <div style={{ height: 6, background: '#eee', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${result.confidence * 100}%`, background: result.label === 'AI-Generated' ? '#f44336' : '#4caf50' }} />
              </div>

              {result.heatmap && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.75em', color: '#666' }}>Grad-CAM Suspicious Regions:</p>
                  <img src={result.heatmap} style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc' }} />
                </div>
              )}

              <p style={{ fontSize: '0.85em', marginTop: 8, lineHeight: 1.3 }}>{result.explanation}</p>

              <div style={{ fontSize: '0.65em', color: '#888', marginTop: 8, borderTop: '1px solid #eee', paddingTop: 6 }}>
                Model: {result.model_name}<br/>
                {result.disclaimer}
              </div>

              <div style={{ marginTop: 8 }}>
                <a href="https://lens.google.com/upload" target="_blank" style={{ fontSize: '0.75em', color: '#1a73e8', textDecoration: 'none' }}>
                  Verify with Google Lens →
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <textarea
            rows={4}
            placeholder="Paste forwarded message or claim here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.85em' }}
          />
          <button
            onClick={handleTextCheck}
            disabled={textLoading}
            style={{ width: '100%', marginTop: 8, padding: '8px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {textLoading ? 'Checking Claim...' : 'Cross-Check Claim'}
          </button>

          {textResult && (
            <div style={{ marginTop: 12, border: '1px solid #ddd', padding: 10, borderRadius: 6, background: '#fafafa' }}>
              <div style={{ fontWeight: 'bold', color: textResult.verdict.includes('Misleading') ? '#d32f2f' : '#2e7d32', fontSize: '0.95em' }}>
                {textResult.verdict}
              </div>
              <p style={{ fontSize: '0.85em', marginTop: 6, lineHeight: 1.3 }}>{textResult.explanation}</p>
              <div style={{ fontSize: '0.65em', color: '#888', marginTop: 6, borderTop: '1px solid #eee', paddingTop: 4 }}>
                {textResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
