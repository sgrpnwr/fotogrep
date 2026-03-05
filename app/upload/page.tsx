'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './upload.css';

type UploadStep = 'select' | 'preview' | 'caption' | 'uploading' | 'done' | 'error';
type AspectRatio = '1:1' | '4:5' | '16:9' | 'free';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [manualCaption, setManualCaption] = useState('');
  const [captionMode, setCaptionMode] = useState<'ai' | 'custom'>('ai');
  const [step, setStep] = useState<UploadStep>('select');
  const [errorMsg, setErrorMsg] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingCustomCaption, setIsGeneratingCustomCaption] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [captionOptions, setCaptionOptions] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('free');
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const aspectRatios: { label: string; value: AspectRatio; ratio: number; cssRatio: string }[] = [
    { label: 'Free', value: 'free', ratio: 0, cssRatio: 'auto' },
    { label: 'Fit to Square', value: '1:1', ratio: 1, cssRatio: '1' },
  ];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('preview');
    setCaption('');
    setManualCaption('');
    setCaptionOptions([]);
    setErrorMsg('');
  }

  async function generateCaptions() {
    if (!file || !preview) return;
    setIsGeneratingCaption(true);
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageBase64 = e.target?.result as string;
        const token = localStorage.getItem('token');

        const queries = [
          'Generate a single-line caption (max 2 lines if necessary) for this image. Be concise, engaging, and descriptive. Return ONLY the caption text.',
          'Create a catchy single-line caption for this image. Make it witty and memorable. Return ONLY the caption text.',
          'Write a descriptive single-line caption for this image that captures the mood. Return ONLY the caption text.',
        ];

        const options: string[] = [];
        for (const query of queries) {
          try {
            const res = await fetch('/api/caption', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ imageBase64, customQuery: query }),
            });

            if (res.ok) {
              const { caption: generatedCaption } = await res.json();
              options.push(generatedCaption);
            }
          } catch (err) {
            console.error('Error generating caption option:', err);
          }
        }

        if (options.length > 0) {
          setCaptionOptions(options);
          setCaption(options[0]);
          // Scroll to caption section
          setTimeout(() => {
            const captionSection = document.querySelector('.caption-section');
            if (captionSection) {
              captionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        } else {
          setErrorMsg('Failed to generate captions. Please write one manually.');
        }

        setIsGeneratingCaption(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg('Error processing image');
      console.error('Error:', err);
      setIsGeneratingCaption(false);
    }
  }

  async function generateCustomCaption() {
    if (!file || !preview || !customQuery.trim()) {
      setErrorMsg('Please enter a custom query');
      return;
    }

    // Check if we've hit the caption limit (5 total)
    if (captionOptions.length >= 5) {
      setErrorMsg('🚀 Whoa, slow down! You\'ve maxed out our AI budget for this image. We only had 5 captions in our cosmic quota, and you\'ve used them all! Pick your favorite from above or write your own. Our AI servers are thanking you for the break! 😅');
      setShowQueryInput(false);
      return;
    }

    setIsGeneratingCustomCaption(true);
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageBase64 = e.target?.result as string;
        const token = localStorage.getItem('token');

        const res = await fetch('/api/caption', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageBase64, customQuery }),
        });

        if (res.ok) {
          const { caption: generatedCaption } = await res.json();
          // Add the custom caption to the options array
          setCaptionOptions(prev => [...prev, generatedCaption]);
          setCaption(generatedCaption);
          // Clear the textarea so user can generate another custom caption
          setCustomQuery('');
        } else {
          const err = await res.json();
          setErrorMsg(err.error || 'Failed to generate caption');
        }
        setIsGeneratingCustomCaption(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg('Error processing image');
      console.error('Error:', err);
      setIsGeneratingCustomCaption(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select an image');
      return;
    }
    
    // Determine final caption based on mode
    let finalCaption = '';
    if (captionMode === 'custom') {
      finalCaption = manualCaption.trim();
    } else {
      finalCaption = caption.trim();
    }
    
    if (!finalCaption) {
      setErrorMsg('Please add or generate a caption');
      return;
    }

    setErrorMsg('');
    setIsUploading(true);
    const token = localStorage.getItem('token');

    try {
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { uploadUrl, imageKey } = await presignRes.json();

      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!s3Res.ok) throw new Error('Failed to upload to S3');

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'photo',
          content: finalCaption,
          imageUrl: imageKey,
        }),
      });

      if (!postRes.ok) {
        const err = await postRes.json();
        throw new Error(err.error || 'Failed to save post');
      }

      // Upload successful - redirect to home with success flag
      router.push('/?uploaded=true');
    } catch (err: any) {
      setIsUploading(false);
      setStep('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  }

  return (
    <div className="upload-page-container">
      <div className="upload-page-header">
        <button 
          className="upload-back-btn"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <h1>Upload Photo</h1>
      </div>

      <div className="upload-page-content">
        {step === 'select' && (
          <div className="upload-select-section">
            <div
              className="upload-dropzone-large"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="upload-icon-large">📸</span>
              <p className="dropzone-title">Choose a photo to upload</p>
              <p className="dropzone-subtitle">JPEG, PNG, WebP or GIF · max 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            {errorMsg && <p className="upload-error">{errorMsg}</p>}
          </div>
        )}

        {step === 'preview' && preview && (
          <form onSubmit={handleSubmit} className="upload-preview-section">
            <div 
              className="preview-image-wrapper"
              style={{ aspectRatio: selectedAspectRatio === '1:1' ? '1' : 'auto' }}
              onPointerDown={(e) => {
                if (selectedAspectRatio === '1:1' && imageZoom > 1) {
                  e.preventDefault();
                  setIsDraggingImage(true);
                  setDragStart({ x: e.clientX, y: e.clientY });
                }
              }}
              onPointerMove={(e) => {
                if (!isDraggingImage) return;
                e.preventDefault();
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                
                // Calculate max movement based on zoom level
                const maxOffset = 100 * (imageZoom - 1);
                
                setImageOffset(prev => ({
                  x: Math.max(-maxOffset, Math.min(maxOffset, prev.x + deltaX)),
                  y: Math.max(-maxOffset, Math.min(maxOffset, prev.y + deltaY)),
                }));
                setDragStart({ x: e.clientX, y: e.clientY });
              }}
              onPointerUp={() => setIsDraggingImage(false)}
              onPointerLeave={() => setIsDraggingImage(false)}
            >
              <img 
                src={preview} 
                alt="preview" 
                className="preview-image-large"
                style={{
                  objectFit: 'contain',
                  transform: selectedAspectRatio === '1:1' 
                    ? `scale(${imageZoom}) translate(${imageOffset.x}px, ${imageOffset.y}px)` 
                    : 'none',
                  cursor: selectedAspectRatio === '1:1' && imageZoom > 1 ? (isDraggingImage ? 'grabbing' : 'grab') : 'default',
                  transition: isDraggingImage ? 'none' : 'transform 0.2s ease',
                  userSelect: 'none',
                  maxHeight: selectedAspectRatio === '1:1' ? '100%' : 'auto',
                }}
                draggable={false}
              />
            </div>

            <div className="aspect-ratio-selector-section">
              <h2>Choose aspect ratio</h2>
              <div className="aspect-ratio-grid">
                {aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    className={`aspect-ratio-card ${selectedAspectRatio === ar.value ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAspectRatio(ar.value);
                      setImageZoom(1);
                      setImageOffset({ x: 0, y: 0 });
                    }}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
              {selectedAspectRatio === '1:1' && (
                <>
                  <p className="aspect-ratio-hint">💡 Zoom to fit, then drag to position your image in the square</p>
                  <div className="zoom-slider-container">
                    <span className="zoom-label">−</span>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={imageZoom}
                      onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                      className="zoom-slider"
                    />
                    <span className="zoom-label">+</span>
                  </div>
                </>
              )}
            </div>

            <div className="caption-section">
              <div className="caption-section-header">
                <h2>Add a caption</h2>
                {captionOptions.length > 0 && (
                  <div className="caption-toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${captionMode === 'ai' ? 'active' : ''}`}
                      onClick={() => setCaptionMode('ai')}
                    >
                      AI
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${captionMode === 'custom' ? 'active' : ''}`}
                      onClick={() => setCaptionMode('custom')}
                    >
                      Custom
                    </button>
                  </div>
                )}
              </div>

              {captionMode === 'ai' ? (
                <>
                  {captionOptions.length === 0 ? (
                <div className="caption-input-group">
                  {isGeneratingCaption ? (
                    <div className="loading-state">
                      <div className="loading-spinner">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <p className="loading-title">✨ Crafting Perfect Captions</p>
                      <p className="loading-message">
                        Sit back and relax—I'm analyzing your image and cooking up three amazing caption options just for you. This won't take long!
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="caption-hint">Write your caption or let AI generate options</p>
                      <textarea
                        className="caption-textarea"
                        placeholder="Write your own caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                      <p className="char-count">{caption.length}/500</p>
                      <p className="divider">or</p>
                      <button
                        type="button"
                        className="generate-caption-btn-large"
                        onClick={generateCaptions}
                        disabled={isGeneratingCaption}
                      >
                        ✨ Generate with AI
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="caption-options-section">
                  <p className="options-title">Choose a caption or customize:</p>
                  <div className="caption-options-list">
                    {captionOptions.map((option, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`caption-option-card ${caption === option ? 'selected' : ''}`}
                        onClick={() => setCaption(option)}
                      >
                        <span className="option-num">{idx + 1}</span>
                        <span className="option-text">{option}</span>
                      </button>
                    ))}
                  </div>

                  {!showQueryInput || captionOptions.length >= 5 ? (
                    <>
                      <div className="current-caption-display">
                        <p className="selected-label">Selected:</p>
                        <p className="selected-caption">{caption}</p>
                      </div>
                      {captionOptions.length < 5 && (
                        <button
                          type="button"
                          className="customize-btn"
                          onClick={() => setShowQueryInput(true)}
                        >
                          ✏️ Customize with AI
                        </button>
                      )}
                      {captionOptions.length >= 5 && (
                        <div className="caption-limit-message">
                          <p>🚀 You've reached our AI budget limit! Pick from your {captionOptions.length} captions above or write your own.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="custom-query-section">
                      <p className="custom-label">Describe your preferred caption:</p>
                      <textarea
                        className="custom-query-textarea"
                        placeholder="e.g., 'Make it funny', 'Make it inspirational', 'Focus on the colors'..."
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        rows={3}
                        maxLength={200}
                      />
                      <div className="custom-buttons">
                        <button
                          type="button"
                          className="generate-caption-btn-large"
                          onClick={generateCustomCaption}
                          disabled={isGeneratingCustomCaption || !customQuery.trim()}
                        >
                          {isGeneratingCustomCaption ? '⏳ Generating...' : '✨ Generate Again'}
                        </button>
                        <button
                          type="button"
                          className="cancel-custom-btn"
                          onClick={() => {
                            setShowQueryInput(false);
                            setCustomQuery('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </>
              ) : (
                <div className="custom-mode-section">
                  <p className="custom-mode-label">Write your own caption:</p>
                  <textarea
                    className="custom-mode-textarea"
                    placeholder="Type your caption here..."
                    value={manualCaption}
                    onChange={(e) => setManualCaption(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="char-count">{manualCaption.length}/500</p>
                </div>
              )}

              {errorMsg && <p className="upload-error">{errorMsg}</p>}
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  setStep('select');
                  setCaption('');
                  setManualCaption('');
                  setCaptionOptions([]);
                  setSelectedAspectRatio('free');
                }}
              >
                ← Choose Different Photo
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={(!caption.trim() && !manualCaption.trim()) || isGeneratingCaption || isUploading}
              >
                {isUploading ? '⏳ Uploading...' : 'Share Photo'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="success-state">
            <p className="success-icon">✅</p>
            <p className="success-text">Photo posted successfully!</p>
            <p className="success-subtext">Redirecting to home...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="error-state">
            <p className="error-icon">❌</p>
            <p className="error-text">{errorMsg}</p>
            <button
              type="button"
              className="retry-btn"
              onClick={() => {
                setStep('select');
                setPreview(null);
                setFile(null);
                setCaption('');
                setCaptionOptions([]);
                setErrorMsg('');
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
