import React, { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formUrl: string;
  orderId: string;
  productId: number;
  productName: string;
  productCategoryName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  stateName?: string;
  stateCode?: string;
  intakeFormId?: string;
  uniqueId?: string;
  onFormCompleted?: () => void;
}

export function FormModal({
  isOpen,
  onClose,
  formUrl,
  orderId,
  productId,
  productName,
  productCategoryName,
  email,
  firstName,
  lastName,
  phoneNumber,
  stateName,
  stateCode,
  intakeFormId,
  uniqueId,
  onFormCompleted,
}: FormModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Listen for form submission messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is from our form iframe
      if (event.origin && formUrl.includes(new URL(event.origin).hostname)) {
        // Look for form completion indicators
        if (
          event.data &&
          (event.data.type === "form_submitted" ||
            event.data.type === "form_completed" ||
            event.data.includes("submit") ||
            event.data.includes("complete"))
        ) {
          console.log("Form submission detected:", event.data);
          if (onFormCompleted) {
            onFormCompleted();
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener("message", handleMessage);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isOpen, formUrl, onFormCompleted]);

  if (!isOpen) return null;

  // Check if formUrl is already a prefill URL (contains query parameters)
  const isPrefillUrl =
    formUrl.includes("?") &&
    (formUrl.includes("jotform.com") ||
      formUrl.includes("forms.whitelabelmd.com"));

  console.log("🔍 URL DETECTION:");
  console.log("   - formUrl:", formUrl);
  console.log("   - Contains '?':", formUrl.includes("?"));
  console.log("   - Contains jotform:", formUrl.includes("jotform.com"));
  console.log(
    "   - Contains whitelabelmd:",
    formUrl.includes("forms.whitelabelmd.com")
  );
  console.log("   - isPrefillUrl:", isPrefillUrl);

  let constructedUrl;

  if (isPrefillUrl) {
    // If it's already a prefill URL, only add unique_id parameter
    console.log("🎯 USING PREFILL URL - only adding unique_id");
    constructedUrl = `${formUrl}${
      uniqueId ? `&unique_id=${encodeURIComponent(uniqueId)}` : ""
    }`;
  } else {
    // If it's a basic form URL, add the query parameters
    console.log("🔧 CONSTRUCTING URL WITH PARAMS");
    constructedUrl = `${formUrl}?order_id=${orderId}${
      uniqueId ? `&unique_id=${encodeURIComponent(uniqueId)}` : ""
    }${email ? `&email=${encodeURIComponent(email)}` : ""}${
      firstName ? `&fullName[0]=${encodeURIComponent(firstName)}` : ""
    }${lastName ? `&fullName[1]=${encodeURIComponent(lastName)}` : ""}${
      phoneNumber ? `&phoneNumber=${encodeURIComponent(phoneNumber)}` : ""
    }${
      stateName && stateCode
        ? `&usState=${encodeURIComponent(stateName)}%20(${stateCode})`
        : ""
    }`;
  }

  console.log("FormModal props:", {
    orderId,
    uniqueId,
    intakeFormId,
    email,
    firstName,
    lastName,
    phoneNumber,
    stateName,
    stateCode,
  });
  console.log("🔗 FINAL Constructed URL:", constructedUrl);
  console.log("🎯 URL FINAL CHECK:");
  console.log("   - Has order_id param:", constructedUrl.includes("order_id="));
  console.log("   - Has email param:", constructedUrl.includes("email="));
  console.log("   - Has fullName param:", constructedUrl.includes("fullName"));
  console.log(
    "   - Only has unique_id:",
    constructedUrl.includes("unique_id=") &&
      !constructedUrl.includes("order_id=")
  );

  const handleOpenInNewTab = () => {
    console.log("🚀 OPENING IN NEW TAB");
    console.log("📋 Original formUrl prop:", formUrl);
    console.log("🔗 Constructed URL being opened:", constructedUrl);
    console.log("📊 URL Length:", constructedUrl.length);
    console.log("🔍 URL Analysis:");
    console.log(
      "   - Contains prefill data:",
      constructedUrl.includes("prefill")
    );
    console.log("   - Is JotForm URL:", constructedUrl.includes("jotform"));
    console.log("   - Has query params:", constructedUrl.includes("?"));

    // Log the exact URL that will be opened
    console.log("🎯 EXACT URL TO OPEN:", constructedUrl);

    // Try to decode and show readable version
    try {
      const decodedUrl = decodeURIComponent(constructedUrl);
      console.log("📝 DECODED URL:", decodedUrl);
    } catch (e) {
      console.log("⚠️ Could not decode URL");
    }

    window.open(constructedUrl, "_blank");
  };

  const handleIframeLoad = () => {
    // Set up a periodic check to detect form changes
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        // Try to detect if the form has been submitted by checking the URL
        const checkFormStatus = () => {
          try {
            const iframeDoc =
              iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // Check for success messages or URL changes that indicate form completion
              const successIndicators = [
                "thank you",
                "success",
                "submitted",
                "completed",
                "confirmation",
              ];

              const bodyText = iframeDoc.body?.textContent?.toLowerCase() || "";
              const currentUrl = iframe.contentWindow?.location.href || "";

              if (
                successIndicators.some(
                  (indicator) =>
                    bodyText.includes(indicator) ||
                    currentUrl.includes(indicator)
                )
              ) {
                console.log("Form completion detected via content check");
                if (onFormCompleted) {
                  onFormCompleted();
                }
              }
            }
          } catch (error) {
            // Cross-origin restrictions prevent access, which is normal
            // We'll rely on the message listener instead
          }
        };

        // Check periodically for form completion
        const interval = setInterval(checkFormStatus, 2000);

        // Clean up interval when modal is closed
        return () => clearInterval(interval);
      } catch (error) {
        console.log(
          "Cannot access iframe content due to cross-origin restrictions"
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Simple backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Clean Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h3
                id="modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                {productName}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Order #{orderId} • Health Assessment Form
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button> */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="relative" style={{ height: "calc(90vh - 120px)" }}>
            <iframe
              ref={iframeRef}
              src={constructedUrl}
              className="w-full h-full border-0"
              title={`Health assessment form for ${productName}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              loading="lazy"
              onLoad={handleIframeLoad}
              allow="camera; microphone; geolocation; fullscreen"
            />
          </div>

          {/* Simple Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-sm">
                🔒 Your information is secure and confidential
              </p>
              {/* <button
                onClick={handleOpenInNewTab}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Having trouble? Open in new tab →
              </button> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
