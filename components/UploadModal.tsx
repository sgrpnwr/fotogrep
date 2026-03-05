'use client';

import { useRef, useState } from 'react';
import { compressImageForApi } from '@/lib/imageUtils';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'select' | 'caption' | 'uploading' | 'done' | 'error';
type AspectRatio = '1:1' | '4:5' | '16:9' | 'free';

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<UploadStep>('select');
  const [errorMsg, setErrorMsg] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [captionOptions, setCaptionOptions] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('free');
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const aspectRatios: { label: string; value: AspectRatio; ratio: number; cssRatio: string }[] = [
    { label: 'Free', value: 'free', ratio: 0, cssRatio: 'auto' },
    { label: '1:1 Square', value: '1:1', ratio: 1, cssRatio: '1' },
    { label: '4:5 Portrait', value: '4:5', ratio: 0.8, cssRatio: '0.8' },
    { label: '16:9 Landscape', value: '16:9', ratio: 16 / 9, cssRatio: '1.78' },
  ];

  function getAspectRatioStyle() {
    if (selectedAspectRatio === 'free') return { aspectRatio: 'auto' as const };
    const ratioMap: Record<AspectRatio, string> = {
      'free': 'auto',
      '1:1': '1',
      '4:5': '0.8',
      '16:9': '1.78',
    };
    return { aspectRatio: ratioMap[selectedAspectRatio] as any };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (selectedAspectRatio === 'free') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imageTransform.x, y: e.clientY - imageTransform.y });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging || selectedAspectRatio === 'free') return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setImageTransform((prev) => ({
      ...prev,
      x: newX,
      y: newY,
    }));
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleZoom(direction: 'in' | 'out') {
    setImageTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + (direction === 'in' ? 0.2 : -0.2))),
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('caption');
    setCaption('');
    setCaptionOptions([]);
    setErrorMsg('');
  }

  async function generateCaptions() {
    if (!file || !preview) return;
    setIsGeneratingCaption(true);
    setErrorMsg('');

    try {
      const imageBase64 = await compressImageForApi(file);
      const token = localStorage.getItem('token');

        // Generate 3 caption options
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
      } else {
        setErrorMsg('Failed to generate captions. Please write one manually.');
      }
    } catch (err: any) {
      setErrorMsg('Error processing image. Try another photo or write a caption manually.');
      console.error('Error:', err);
    } finally {
      setIsGeneratingCaption(false);
    }
  }

  async function generateCustomCaption() {
    if (!file || !preview || !customQuery.trim()) {
      setErrorMsg('Please enter a custom query');
      return;
    }

    setIsGeneratingCaption(true);
    setErrorMsg('');

    try {
      const imageBase64 = await compressImageForApi(file);
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
        setCaption(generatedCaption);
        setShowQueryInput(false);
        setCustomQuery('');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to generate caption');
      }
    } catch (err: any) {
      setErrorMsg('Error processing image. Try another photo or write a caption manually.');
      console.error('Error:', err);
    } finally {
      setIsGeneratingCaption(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select an image');
      return;
    }
    if (!caption.trim()) {
      setErrorMsg('Please add or generate a caption');
      return;
    }

    setStep('uploading');
    setErrorMsg('');

    const token = localStorage.getItem('token');

    try {
      // 1. Get presigned URL from our server
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

      // 2. PUT file directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!s3Res.ok) throw new Error('Failed to upload to S3');

      // 3. Create the post in DB — store the S3 key, not a public URL
      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'photo',
          content: caption.trim(),
          imageUrl: imageKey,
        }),
      });

      if (!postRes.ok) {
        const err = await postRes.json();
        throw new Error(err.error || 'Failed to save post');
      }

      setStep('done');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Photo</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Step 1: Select Photo */}
          {step === 'select' && (
            <>
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="upload-icon">📸</span>
                <p>Click to choose a photo</p>
                <p className="upload-hint">JPEG, PNG, WebP or GIF · max 10 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
              {errorMsg && <p className="upload-error">{errorMsg}</p>}
            </>
          )}

          {/* Step 2: Generate & Select Caption */}
          {step === 'caption' && preview && (
            <>
              {/* Full Photo Preview */}
              <div className="photo-preview-section">
                <img 
                  ref={imageRef}
                  src={preview} 
                  alt="preview" 
                  className="full-preview-image"
                />
              </div>

              {/* Aspect Ratio Selector - Compact */}
              <div className="aspect-ratio-selector-compact">
                <p className="aspect-ratio-label-compact">Aspect ratio:</p>
                <div className="aspect-ratio-options-compact">
                  {aspectRatios.map((ar) => (
                    <button
                      key={ar.value}
                      type="button"
                      className={`aspect-ratio-btn-compact ${selectedAspectRatio === ar.value ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedAspectRatio(ar.value);
                        setImageTransform({ x: 0, y: 0, scale: 1 });
                      }}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="change-photo-btn-compact"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  setStep('select');
                  setCaption('');
                  setCaptionOptions([]);
                  setSelectedAspectRatio('free');
                  setImageTransform({ x: 0, y: 0, scale: 1 });
                }}
              >
                Change photo
              </button>

              {/* Caption Generation Section */}
              {captionOptions.length === 0 ? (
                <div className="caption-generation-section">
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
                      <p className="caption-prompt">
                        Let AI generate captions for your image, or write your own!
                      </p>
                      <button
                        type="button"
                        className="generate-caption-btn"
                        onClick={generateCaptions}
                        disabled={isGeneratingCaption}
                      >
                        {isGeneratingCaption ? '✨ Generating...' : '✨ Generate Captions'}
                      </button>
                      <p className="caption-divider">or</p>
                      <textarea
                        className="upload-caption"
                        placeholder="Write your own caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                        maxLength={500}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="caption-selection-section">
                  <p className="caption-section-title">Choose a caption:</p>
                  <div className="caption-options">
                    {captionOptions.map((option, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`caption-option ${
                          caption === option ? 'selected' : ''
                        }`}
                        onClick={() => setCaption(option)}
                      >
                        <span className="option-number">{idx + 1}</span>
                        <span className="option-text">{option}</span>
                      </button>
                    ))}
                  </div>

                  <div className="caption-edit-section">
                    {!showQueryInput ? (
                      <>
                        <p className="current-caption-label">Current caption:</p>
                        <p className="current-caption">{caption}</p>
                        <button
                          type="button"
                          className="edit-query-btn"
                          onClick={() => setShowQueryInput(true)}
                        >
                          ✏️ Custom Query
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="caption-section-title">
                          Describe what caption you want:
                        </p>
                        <textarea
                          className="custom-query-input"
                          placeholder="e.g., 'Make it funny', 'Make it inspirational', 'Focus on the colors'..."
                          value={customQuery}
                          onChange={(e) => setCustomQuery(e.target.value)}
                          rows={2}
                          maxLength={200}
                        />
                        <div className="query-button-group">
                          <button
                            type="button"
                            className="generate-caption-btn"
                            onClick={generateCustomCaption}
                            disabled={isGeneratingCaption || !customQuery.trim()}
                          >
                            {isGeneratingCaption
                              ? '✨ Generating...'
                              : '✨ Generate'}
                          </button>
                          <button
                            type="button"
                            className="cancel-query-btn"
                            onClick={() => {
                              setShowQueryInput(false);
                              setCustomQuery('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {errorMsg && <p className="upload-error">{errorMsg}</p>}

              <button
                type="submit"
                className="upload-submit-btn"
                disabled={
                  !caption.trim() ||
                  isGeneratingCaption
                }
              >
                {isGeneratingCaption ? '✨ Generating...' : 'Share'}
              </button>
            </>
          )}

          {/* Upload/Error States */}
          {step === 'error' && (
            <div className="upload-state-message error-state">
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
        </form>
      </div>
    </div>
  );
}
