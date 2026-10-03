import { useEffect, useRef, useState } from 'react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function OcrUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn]);

  const startCamera = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraOn(true);
      setError('');
    } catch {
      setError('Camera access was denied or is unavailable. Allow camera access and use HTTPS or localhost.');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const image = new File([blob], `plate-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(image);
      setResult(null);
      setPreview(URL.createObjectURL(image));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setCameraOn(false);
    }, 'image/jpeg', 0.92);
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setResult(null);
    setError('');
    if (f) setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await client.post('/vehicle/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-2">Number Plate Recognition</h1>
      <p className="text-paper/60 text-sm mb-6">
        Upload a vehicle photo. The system detects the plate and looks up the matching demo record.
      </p>

      <form onSubmit={submit} className="border-2 border-dashed border-navy-700 rounded-lg p-8 text-center mb-6">
        <input type="file" accept="image/*" onChange={onFileChange} className="mb-4" />
        <div className="flex justify-center gap-2 mb-4">
          {!cameraOn ? <button type="button" onClick={startCamera} className="border border-navy-700 rounded px-3 py-2 text-sm hover:border-amber-500">Open camera</button> : <button type="button" onClick={captureFrame} className="bg-signal-green text-navy-950 rounded px-3 py-2 text-sm font-medium">Capture frame</button>}
          {cameraOn && <button type="button" onClick={() => { streamRef.current?.getTracks().forEach((track) => track.stop()); setCameraOn(false); }} className="border border-navy-700 rounded px-3 py-2 text-sm">Close camera</button>}
        </div>
        {cameraOn && <video ref={videoRef} autoPlay playsInline className="max-h-64 mx-auto rounded mb-4" />}
        {preview && <img src={preview} alt="preview" className="max-h-56 mx-auto rounded mb-4" />}
        <button
          type="submit"
          disabled={!file || loading}
          className="bg-amber-500 text-navy-950 font-medium px-6 py-2.5 rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Detect plate & search'}
        </button>
      </form>

      {error && <p className="text-signal-red text-sm mb-4">{error}</p>}

      {result && (
        <div className="border border-navy-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="plate-badge">{result.detected_plate}</span>
            <span className="text-paper/50 text-xs">
              confidence {Math.round(result.confidence * 100)}% · mode: {result.ocr_mode}
            </span>
          </div>
          {result.vehicle ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{result.vehicle.owner_name}</h3>
                <StatusBadge status={result.vehicle.compliance_status} />
              </div>
              <p className="text-sm text-paper/60">
                {result.vehicle.vehicle_type} · registered {result.vehicle.registration_date}
              </p>
            </>
          ) : (
            <p className="text-paper/60 text-sm">No matching demo record for this plate.</p>
          )}
        </div>
      )}
    </div>
  );
}
