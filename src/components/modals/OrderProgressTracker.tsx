import { useEffect, useState } from "react";
import { CheckCircle, Stethoscope, Loader2, Sparkles, Clock, X } from "lucide-react";
import { getUserCartProductsV5 } from "../../services/api";
import { storage } from "../../utils/storage";

interface OrderProgressTrackerProps {
  isOpen: boolean;
  newOrderId?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "in-progress" | "completed";
}

export function OrderProgressTracker({
  isOpen,
  newOrderId,
  onComplete,
  onClose,
}: OrderProgressTrackerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkInFound, setCheckInFound] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const steps: ProgressStep[] = [
    { id: "1", label: "Submitting case to doctor", status: "pending" },
    { id: "2", label: "Analysing your answers", status: "pending" },
    { id: "3", label: "Case created successfully", status: "pending" },
    { id: "4", label: "Assigning case to doctor", status: "pending" },
    { id: "5", label: "Doctor reviewing your case...", status: "pending" },
  ];

  // Animate through steps and progress
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setCheckInFound(false);
      setProgressPercent(0);
      setElapsedTime(0);
      return;
    }

    const stepIntervals: NodeJS.Timeout[] = [];
    let progressInterval: NodeJS.Timeout | null = null;
    let timeInterval: NodeJS.Timeout | null = null;

    // Start progress animation (smoothly increase to 90% over 90 seconds)
    let currentProgress = 0;
    const progressIncrement = 0.5; // 0.5% per interval
    const progressSpeed = 450; // Update every 450ms for smooth animation

    progressInterval = setInterval(() => {
      if (currentProgress < 90 && !checkInFound) {
        currentProgress += progressIncrement;
        setProgressPercent(Math.min(currentProgress, 90));
      }
    }, progressSpeed);

    // Time counter
    timeInterval = setInterval(() => {
      if (!checkInFound) {
        setElapsedTime((prev) => prev + 1);
      }
    }, 1000);

    // Step 1: Start immediately
    setCurrentStep(0);
    const step1Timeout = setTimeout(() => {
      setCurrentStep(1);
    }, 2000);

    // Step 2: After 4s
    const step2Timeout = setTimeout(() => {
      setCurrentStep(2);
    }, 4000);

    // Step 3: After 8s
    const step3Timeout = setTimeout(() => {
      setCurrentStep(3);
    }, 8000);

    // Step 4: After 15s
    const step4Timeout = setTimeout(() => {
      setCurrentStep(4);
    }, 15000);

    stepIntervals.push(step1Timeout, step2Timeout, step3Timeout, step4Timeout);

    return () => {
      stepIntervals.forEach(clearTimeout);
      if (progressInterval) clearInterval(progressInterval);
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [isOpen, checkInFound]);

  // When check-in is found, complete progress
  useEffect(() => {
    if (checkInFound) {
      setProgressPercent(100);
      setCurrentStep(5); // Show all steps complete
    }
  }, [checkInFound]);

  // Auto-close after 2 minutes if check-in not found
  useEffect(() => {
    if (!isOpen) return;

    const autoCloseTimeout = setTimeout(() => {
      if (!checkInFound) {
        // Auto-close after 2 minutes (120 seconds)
        onClose?.();
      }
    }, 120000); // 2 minutes = 120,000ms

    return () => {
      clearTimeout(autoCloseTimeout);
    };
  }, [isOpen, checkInFound, onClose]);

  // Poll for check-in order
  useEffect(() => {
    if (!isOpen || !newOrderId) return;

    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes (60 * 2s = 120s)
    const pollInterval = 2000; // Poll every 2 seconds
    let timeoutId: NodeJS.Timeout | null = null;
    let isPolling = true;

    const checkForCheckIn = async () => {
      if (!isPolling) return;

      try {
        const userData = storage.getUserData();
        if (!userData?.email) {
          if (pollCount >= maxPolls) {
            setCheckInFound(true);
          } else {
            pollCount++;
            if (pollCount < maxPolls) {
              timeoutId = setTimeout(checkForCheckIn, pollInterval);
            } else {
              setCheckInFound(true);
            }
          }
          return;
        }

        const response = await getUserCartProductsV5(userData.email);
        if (response.status === 1 && Array.isArray(response.product)) {
          const checkInOrder = response.product.find(
            (p) =>
              p.therapy_group === "CHECKIN" &&
              !!p.form_url_new &&
              p.order_id !== newOrderId
          );

          if (checkInOrder) {
            setCheckInFound(true);
            isPolling = false;
            return;
          }
        }

        pollCount++;
        if (pollCount < maxPolls && isPolling) {
          timeoutId = setTimeout(checkForCheckIn, pollInterval);
        } else {
          setCheckInFound(true);
          isPolling = false;
        }
      } catch (error) {
        console.error("Error checking for check-in:", error);
        pollCount++;
        if (pollCount < maxPolls && isPolling) {
          timeoutId = setTimeout(checkForCheckIn, pollInterval);
        } else {
          setCheckInFound(true);
          isPolling = false;
        }
      }
    };

    // Start checking after 5 seconds
    const initialDelay = setTimeout(() => {
      checkForCheckIn();
    }, 5000);

    return () => {
      isPolling = false;
      clearTimeout(initialDelay);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen, newOrderId]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-2xl sm:rounded-3xl shadow-xl border-2 border-sky-200 overflow-hidden">
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 text-white">
          {/* Close Button */}
          <button
            onClick={() => {
              onClose?.();
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pr-10">
            {/* Icon */}
            <div className="flex-shrink-0">
              {checkInFound ? (
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
                </div>
              )}
            </div>

            {/* Title and Time */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
                {checkInFound
                  ? "All Steps Complete!"
                  : "Setting Up Your Case"}
              </h3>
              {!checkInFound && (
                <div className="flex items-center gap-2 text-sm sm:text-base text-sky-100">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6">
          {/* Info Message - Above Progress Bar */}
          {!checkInFound && (
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-blue-900">
                    Check-in generation usually takes 1-2 minutes. We'll notify you when it's ready!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-semibold text-gray-700">
                Progress
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary-600">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="relative h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Compact Steps */}
          <div className="space-y-2 sm:space-y-3">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isInProgress = index === currentStep && !checkInFound;
              const isLastStep = index === steps.length - 1;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 ${
                    isInProgress
                      ? "bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-300"
                      : isCompleted
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  {/* Step Icon */}
                  <div
                    className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isInProgress
                        ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white"
                        : "bg-gray-300 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : isInProgress && isLastStep ? (
                      <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                    ) : isInProgress ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-400" />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-medium transition-colors ${
                        isCompleted
                          ? "text-green-900"
                          : isInProgress
                          ? "text-sky-900"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>

                  {/* Sparkle for in-progress */}
                  {isInProgress && (
                    <Sparkles className="w-4 h-4 text-sky-500 animate-pulse flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          {(checkInFound || currentStep >= 4) && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <button
                onClick={() => {
                  onClose?.();
                  onComplete?.();
                }}
                className="px-6 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>
                  {checkInFound
                    ? "Go to Dashboard"
                    : "Continue to Dashboard"}
                </span>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
