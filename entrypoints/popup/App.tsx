import { useState } from 'react';
import './App.css';

type Tab = 'image' | 'audio' | 'video' | 'text';

type Artifact = {
  type: string;
  label: string;
  url?: string;
  detail?: string;
  points?: { t: number; score: number }[];
};

type MediaReport = {
  job_id: string;
  score: number;
  band: string;
  uncertainty: [number, number];
  streams: {
    name: string;
    score: number;
    models: string[];
    artifacts: Artifact[];
  }[];
  faces: {
    index: number;
    score: number;
    timestamp?: number;
  }[];
  disclaimer: string;
};

const API_BASE_URL = 'http://127.0.0.1:8001';
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const AUDIO_ACCEPT = 'audio/*,.wav,.flac,.ogg,.mp3,.m4a,.aac,.wma';
const VIDEO_ACCEPT = 'video/*,.mp4,.m4v,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.wmv,.flv';

function Icon({
  name,
  size = 20,
}: {
  name: 'image' | 'audio' | 'video' | 'text' | 'upload' | 'spark' | 'shield' | 'arrow' | 'check' | 'scan';
  size?: number;
}) {
  const paths = {
    image: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    audio: <><path d="M2 10v4m4-8v12m4-16v20m4-14v8m4-12v16m4-11v6" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="3" /><path d="m16 10 5-3v10l-5-3" /></>,
    text: <><path d="M4 6h16M4 12h16M4 18h10" /><path d="M7 3v3m10-3v3" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3" /><path d="M4 12h16" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function MediaResult({ report }: { report: MediaReport }) {
  return (
    <section className="media-result result-enter" aria-live="polite">
      <div className="result-heading">
        <span className="result-icon"><Icon name="scan" size={18} /></span>
        <div>
          <span className="eyebrow">ANALYSIS COMPLETE</span>
          <h3>{report.band.replaceAll('_', ' ')}</h3>
        </div>
      </div>
      <div className="score-panel">
        <div className="score-value">{(report.score * 100).toFixed(1)}<span>%</span></div>
        <div className="score-caption">Manipulation signal</div>
        <div className="score-track"><span style={{ width: `${report.score * 100}%` }} /></div>
        <div className="uncertainty">
          <span>Uncertainty range</span>
          <strong>{(report.uncertainty[0] * 100).toFixed(1)}% – {(report.uncertainty[1] * 100).toFixed(1)}%</strong>
        </div>
      </div>
      <div className="signal-note">
        <Icon name="shield" size={17} />
        <span>Automated signals can be wrong. This score is not proof of authenticity or manipulation.</span>
      </div>
      {report.streams.map((stream) => (
        <section className="stream-card" key={stream.name}>
          <div className="stream-topline">
            <strong>{stream.name.replaceAll('_', ' ')}</strong>
            <span>{(stream.score * 100).toFixed(1)}%</span>
          </div>
          <div className="score-track stream-track"><span style={{ width: `${stream.score * 100}%` }} /></div>
          {stream.models.map((model) => <p className="model-name" key={model}>{model}</p>)}
          {stream.artifacts.map((artifact, index) => (
            <div className="artifact" key={`${artifact.label}-${index}`}>
              {artifact.type === 'note' ? (
                <p><strong>{artifact.label}</strong> {artifact.detail}</p>
              ) : artifact.url ? (
                <a className="artifact-link" href={artifact.url} target="_blank" rel="noreferrer">
                  {artifact.label}<Icon name="arrow" size={14} />
                </a>
              ) : <span>{artifact.label}</span>}
              {artifact.url && <img className="artifact-image" src={artifact.url} alt={artifact.label} />}
              {artifact.points && <p className="model-name">{artifact.points.length} timeline samples</p>}
            </div>
          ))}
        </section>
      ))}
      {report.faces.length > 0 && <p className="faces-note">{report.faces.length} sampled face{report.faces.length === 1 ? '' : 's'} analyzed</p>}
      <p className="disclaimer">{report.disclaimer}</p>
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('image');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mediaResult, setMediaResult] = useState<MediaReport | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<number | null>(null);
  const [mediaFileName, setMediaFileName] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textResult, setTextResult] = useState<any>(null);
  const [textLoading, setTextLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File too large (Max 10MB)');
      e.target.value = '';
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Could not read the selected image.'));
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.readAsDataURL(selectedFile);
      });
      const response = await fetch(`${API_BASE_URL}/analyze/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Image analysis failed.');
      setResult(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error connecting to backend.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'audio' | 'video',
  ) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setMediaFileName(selectedFile.name);
    const maxBytes = kind === 'audio' ? AUDIO_MAX_BYTES : VIDEO_MAX_BYTES;
    if (selectedFile.size > maxBytes) {
      setMediaError(`File too large. Maximum ${maxBytes / (1024 * 1024)} MB.`);
      e.target.value = '';
      return;
    }

    setMediaLoading(true);
    setMediaError('');
    setMediaResult(null);
    setMediaProgress(0);
    try {
      const body = new FormData();
      body.append('file', selectedFile);
      const report = await new Promise<MediaReport>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${API_BASE_URL}/analyze/${kind}`);
        request.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setMediaProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        request.addEventListener('load', () => {
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(request.responseText) as Record<string, unknown>;
          } catch {
            reject(new Error(
              request.status >= 200 && request.status < 300
                ? 'The backend returned an invalid response.'
                : `Backend returned HTTP ${request.status}. Check that it is running on port 8001.`,
            ));
            return;
          }
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(
              typeof data.detail === 'string'
                ? data.detail
                : `${kind} analysis failed (HTTP ${request.status}).`,
            ));
            return;
          }
          resolve(data as MediaReport);
        });
        request.addEventListener('error', () => reject(new Error(
          'Could not connect to the backend. Check that it is running on port 8001 and reload the extension.',
        )));
        request.addEventListener('abort', () => reject(new Error('The upload was cancelled.')));
        request.send(body);
      });
      setMediaResult(report);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Error connecting to backend.');
    } finally {
      setMediaLoading(false);
      setMediaProgress(null);
      e.target.value = '';
    }
  };

  const handleTextCheck = async () => {
    if (!textInput.trim()) return;
    setTextLoading(true);
    setTextResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/analyze/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Text analysis failed.');
      setTextResult(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error connecting to backend.');
    } finally {
      setTextLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'image', label: 'Image' },
    { id: 'audio', label: 'Audio' },
    { id: 'video', label: 'Video' },
    { id: 'text', label: 'Text' },
  ];

  const activeTabDetails = {
    image: { icon: 'image' as const, title: 'Image check', detail: 'Inspect an image for visual signals.' },
    audio: { icon: 'audio' as const, title: 'Audio check', detail: 'Listen for synthetic speech signals.' },
    video: { icon: 'video' as const, title: 'Video check', detail: 'Scan frames for signs of manipulation.' },
    text: { icon: 'text' as const, title: 'Claim check', detail: 'Review a claim for suspicious language.' },
  }[activeTab];

  return (
    <main className="proofy-app">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/icon/48.png" alt="" />
          <div className="brand-copy">
            <span className="brand-name">Proofy<span>!</span></span>
            <span className="brand-tagline">A little more sure.</span>
          </div>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-copy">
          <span className="hero-kicker"><Icon name="spark" size={14} /> YOUR MEDIA, A CLOSER LOOK</span>
          <h1>Pause. Check.<br /><span>Feel more certain.</span></h1>
          <p>Explore helpful signals before you share.</p>
        </div>
        <img className="hero-logo" src="/icon/128.png" alt="" />
        <span className="hero-star hero-star-one">✦</span>
        <span className="hero-star hero-star-two">✧</span>
      </section>

      <nav className="mode-tabs" aria-label="Choose what to check">
        {tabs.map((tab) => (
          <button
            className={`mode-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            <Icon name={tab.id} size={17} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <section className="workspace-card" key={activeTab}>
        <div className="workspace-heading">
          <div className="workspace-icon"><Icon name={activeTabDetails.icon} size={20} /></div>
          <div>
            <h2>{activeTabDetails.title}</h2>
            <p>{activeTabDetails.detail}</p>
          </div>
        </div>

        {activeTab === 'image' && (
          <div className="tab-content">
            <label className="dropzone">
              <span className="dropzone-icon"><Icon name="upload" size={22} /></span>
              <strong>{loading ? 'Analyzing your image…' : 'Choose an image to inspect'}</strong>
              <span>JPG, PNG, WEBP · Up to 10 MB</span>
              <input type="file" hidden onChange={handleImageUpload} accept="image/*" disabled={loading} />
            </label>
            {result && !result.error && (
              <div className="basic-result result-enter">
                <div className="result-heading">
                  <span className="result-icon"><Icon name="scan" size={18} /></span>
                  <div><span className="eyebrow">ANALYSIS COMPLETE</span><h3>{result.label}</h3></div>
                  <span className="result-score">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                {result.heatmap && <img className="artifact-image" src={result.heatmap} alt="Image analysis heatmap" />}
                <p className="result-explanation">{result.explanation}</p>
                <p className="model-name">{result.model_name}</p>
                <a className="artifact-link" href="https://lens.google.com/upload" target="_blank" rel="noreferrer">
                  Verify with Google Lens <Icon name="arrow" size={14} />
                </a>
                <p className="disclaimer">{result.disclaimer}</p>
              </div>
            )}
            {result?.error && <p className="error-message" role="alert">{result.error}</p>}
          </div>
        )}

        {(activeTab === 'audio' || activeTab === 'video') && (
          <div className="tab-content">
            <label className="dropzone media-dropzone">
              <span className="dropzone-icon"><Icon name={activeTab} size={22} /></span>
              <strong>
                {mediaLoading
                  ? mediaProgress === null || mediaProgress >= 100
                    ? 'Upload complete. Analyzing…'
                    : `Uploading your ${activeTab}… ${mediaProgress}%`
                  : `Choose a ${activeTab} file`}
              </strong>
              <span>
                {activeTab === 'audio'
                  ? 'WAV, FLAC, OGG, MP3 · Up to 25 MB'
                  : 'MP4, MOV, WEBM, AVI · Up to 100 MB · 60 sec'}
              </span>
              <input
                type="file"
                accept={activeTab === 'audio' ? AUDIO_ACCEPT : VIDEO_ACCEPT}
                onChange={(event) => handleMediaUpload(event, activeTab as 'audio' | 'video')}
                disabled={mediaLoading}
                aria-label={`Choose ${activeTab} file`}
              />
            </label>
            {mediaFileName && (
              <div className="selected-file"><span className="file-check"><Icon name="check" size={14} /></span><span>{mediaFileName}</span></div>
            )}
            {mediaLoading && mediaProgress !== null && mediaProgress < 100 && (
              <progress className="upload-progress" value={mediaProgress} max={100} aria-label="Upload progress" />
            )}
            {mediaLoading && (
              <p className="processing-note" role="status">
                {mediaProgress !== null && mediaProgress < 100
                  ? 'Sending your file securely to the local analyzer…'
                  : 'Analysis can take a little while. Keep this window open.'}
              </p>
            )}
            {mediaError && <p className="error-message" role="alert">{mediaError}</p>}
            {mediaResult && <MediaResult report={mediaResult} />}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="tab-content">
            <label className="text-label" htmlFor="claim-input">What would you like to check?</label>
            <textarea
              id="claim-input"
              className="claim-input"
              rows={4}
              placeholder="Paste a message or claim here…"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
            />
            <button
              className="primary-button"
              onClick={handleTextCheck}
              disabled={textLoading || !textInput.trim()}
            >
              <Icon name="spark" size={17} />
              {textLoading ? 'Checking claim…' : 'Check this claim'}
              {!textLoading && <Icon name="arrow" size={16} />}
            </button>
            {textResult && (
              <div className="basic-result result-enter">
                <div className="result-heading">
                  <span className="result-icon"><Icon name="scan" size={18} /></span>
                  <div><span className="eyebrow">QUICK REVIEW</span><h3>{textResult.verdict}</h3></div>
                </div>
                <p className="result-explanation">{textResult.explanation}</p>
                <p className="model-name">{textResult.model_name}</p>
                <p className="disclaimer">{textResult.disclaimer}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="app-footer">
        <Icon name="shield" size={15} />
        <span>Signals, not certainty. Always verify important information.</span>
      </footer>
    </main>
  );
}

export default App;
