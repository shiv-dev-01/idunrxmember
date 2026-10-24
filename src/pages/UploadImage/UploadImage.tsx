import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Camera, Upload, X, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  uploadFullBodyImage,
  uploadIdImage,
  uploadPrescriptionImage,
} from "../../services/api/orders";

type UploadMode = "choose" | "camera" | "preview" | "uploading";
type UploadType = "FULLBODY" | "ID" | "PRESCRIPTION";

export function UploadImage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const uploadType: UploadType =
    (searchParams.get("type") as UploadType) || "FULLBODY";
  const [mode, setMode] = useState<UploadMode>("choose");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Lock body scroll when camera/preview is open
  useEffect(() => {
    if (mode === "camera" || mode === "preview") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mode]);

  const initializeCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Failed to access camera. Please check permissions.");
      setMode("choose");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleChooseCamera = () => {
    setMode("camera");
    setTimeout(() => {
      initializeCamera();
    }, 100);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size must be less than 10MB.");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewFile(file);
      setMode("preview");
      setError(null);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFile(file);
          stopCamera();
          setMode("preview");
          setError(null);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
    setMode("choose");
    setError(null);
  };

  const handleConfirmUpload = async () => {
    if (!previewFile || !orderId) return;

    setMode("uploading");
    setError(null);

    try {
      if (uploadType === "ID") {
        await uploadIdImage(orderId, previewFile);
      } else if (uploadType === "PRESCRIPTION") {
        await uploadPrescriptionImage(orderId, previewFile);
        // Upload prescription webhook removed - not in new action list
      } else {
        await uploadFullBodyImage(orderId, previewFile);
        // Upload fullbody webhook removed - not in new action list
      }
      setUploadSuccess(true);

      // Cleanup preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "Failed to upload image. Please try again.");
      setMode("preview");
    }
  };

  const handleBack = () => {
    if (mode === "camera") {
      stopCamera();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    navigate(-1);
  };

  // Choose mode screen
  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">
                {uploadType === "ID"
                  ? "Upload ID Image"
                  : uploadType === "PRESCRIPTION"
                  ? "Upload Prescription Image"
                  : "Upload Full Body Image"}
              </h1>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                {uploadType === "ID"
                  ? "Please upload an ID image to verify your identity."
                  : uploadType === "PRESCRIPTION"
                  ? "Please upload a prescription image to complete your order."
                  : "Please upload a full body image to complete your order."}
              </p>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleChooseCamera}
                  className="p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors">
                      <Camera className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Take Photo
                      </h3>
                      <p className="text-sm text-gray-500">
                        Capture using camera
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleChooseFile}
                  className="p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors">
                      <ImageIcon className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Upload File
                      </h3>
                      <p className="text-sm text-gray-500">
                        Choose from device
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Camera mode screen
  if (mode === "camera") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black bg-opacity-80 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white">
              {uploadType === "ID"
                ? "Take ID Photo"
                : uploadType === "PRESCRIPTION"
                ? "Take Prescription Photo"
                : "Take Full Body Photo"}
            </h3>
            <button
              onClick={() => {
                stopCamera();
                setMode("choose");
              }}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Camera View */}
          <div className="flex-1 relative bg-black overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                backgroundColor: "#000",
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Tip Message */}
          <div className="px-4 py-2 bg-blue-900 bg-opacity-50 backdrop-blur-sm">
            <p className="text-xs sm:text-sm text-blue-100 text-center">
              <strong>Tip:</strong>{" "}
              {uploadType === "ID"
                ? "Make sure your ID is clearly visible and in focus before capturing."
                : uploadType === "PRESCRIPTION"
                ? "Make sure your prescription is clearly visible and in focus before capturing."
                : "Make sure your full body is visible in the frame before capturing."}
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 bg-black bg-opacity-80 backdrop-blur-sm">
            <div className="flex gap-3 max-w-md mx-auto">
              <Button
                variant="secondary"
                onClick={() => {
                  stopCamera();
                  setMode("choose");
                }}
                className="flex-1 py-3"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCapturePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3"
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview mode screen
  if (mode === "preview") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black bg-opacity-80 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white">Preview Image</h3>
            <button
              onClick={handleCancelPreview}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Image Preview */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-black bg-opacity-80 backdrop-blur-sm">
            <div className="flex gap-3 max-w-md mx-auto">
              <Button
                variant="secondary"
                onClick={handleCancelPreview}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Confirm & Upload
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Uploading mode screen
  if (mode === "uploading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="card text-center">
            {uploadSuccess ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Successful!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your image has been uploaded successfully.
                </p>
                <p className="text-sm text-gray-500">Redirecting back...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Uploading Image...
                </h2>
                <p className="text-gray-600">
                  Please wait while we upload your image.
                </p>
              </>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}