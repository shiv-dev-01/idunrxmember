import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Shield,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  XCircle,
  CreditCard,
  Stethoscope,
  Calendar,
  Clock,
  Settings,
  Sparkles,
  Bell,
  Lock,
  ExternalLink,
  Pill,
  Link2,
  FileText,
  Package,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { CartProductSkeleton } from "../../components/dashboard/CartProductSkeleton";
import { FormModal } from "../../components/dashboard/FormModal";
import {
  getUserCartProductsV5,
  getWeightLossProducts,
  processOrder,
} from "../../services/api";
import { api, buildOrderOpTestUrl, panelApi, apiFetch } from "../../services/api/config";
import { storage } from "../../utils/storage";
import { logRefillPurchase } from "../../utils/refillPurchaseLogger";
import { trackRefillClick } from "../../utils/refillWebhookTracker";
import { getStateCode } from "../../utils/stateMapping";
import { REFILL_PENDING_ORDER_KEY } from "../../constants/refill";
import type { CartProduct } from "../../types/products";
import type { WeightLossProduct } from "../../services/api/cart";
import { Modal } from "../../components/ui/Modal";
import { RefillProductSelectionModal } from "../../components/modals/RefillProductSelectionModal";
import { PaymentMethodSelectionModal } from "../../components/modals/PaymentMethodSelectionModal";
import { RefillStripePayment } from "../../components/modals/RefillStripePayment";
import { RefillCouponBox } from "../../components/refills/RefillCouponBox";
import type { PaymentFormData } from "../../types/payment";
import { OrderProgressTracker } from "../../components/modals/OrderProgressTracker";
import { createOrderStripe } from "../../services/api/stripe";
import {
  getCouponPayableAmount,
  type AppliedRefillCoupon,
} from "../../services/api/coupons";
import { useNavigate, useSearchParams } from "react-router-dom";
import googlePayIcon from "../../assets/img/google-pay-icon.png";
import applePayIcon from "../../assets/img/apple-pay-icon.png";
import amazonPayIcon from "../../assets/img/amazon-pay-icon.png";
import refillGuideStepByStepVideo from "../../assets/videos/refill-guide-step-by-step.mp4";

/** BM (billing months) from product_description maps to savings % in Choose Your Plan */
const BM_SAVINGS_PERCENT: Record<number, number> = {
  3: 44,
  4: 20,
  5: 29,
  12: 41,
};

function getBmFromProduct(p: { bm?: number; product_description?: string }): number | null {
  if (p.bm != null && p.bm > 0) return p.bm;
  const desc = p.product_description || "";
  const match = desc.match(/BM:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function getSavingsPercentForBm(bm: number | null): number | null {
  if (bm == null) return null;
  return BM_SAVINGS_PERCENT[bm] ?? null;
}

/** Latest date from product for sorting and "Completed" display: prefer latest of intakes_dates, else time. */
function getProductLatestDate(p: CartProduct): string | undefined {
  const dates = p.intakes_dates?.length ? p.intakes_dates : (p.time ? [p.time] : []);
  if (!dates.length) return undefined;
  return dates.reduce((a, b) => (new Date(b).getTime() > new Date(a).getTime() ? b : a));
}

function isTirzepatideProductName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("tirzepatide") || lower.includes("advanced");
}

/** Semaglutide only — exclude tirzepatide (e.g. "Compounded Tirzepatide" must not match via "compounded"). */
function isSemaglutideProductName(name: string): boolean {
  const lower = name.toLowerCase();
  if (isTirzepatideProductName(name)) return false;
  return lower.includes("semaglutide") || lower.includes("compounded");
}

function isWeightLossProductName(name: string): boolean {
  return isSemaglutideProductName(name) || isTirzepatideProductName(name);
}

/** Pay button label with USD amount when `product_price` is numeric. */
function formatRefillPayButtonLabel(
  productPrice: string | number | undefined | null,
): string {
  const n = parseFloat(String(productPrice ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return "Pay";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
  return `Pay ${formatted}`;
}

/** Open external URL in a way that works on mobile Safari (pop-up blockers) and desktop. */
function openExternalUrl(url: string | null | undefined) {
  if (!url) return;
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    // On iOS Safari, opening in the same tab is much more reliable than a new-tab pop-up.
    window.location.href = url;
  } else {
    // When called after async work, some browsers treat window.open as a pop-up and block it.
    // Fall back to same-tab navigation if the pop-up is blocked.
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  }
}

/** Call Lead Connector webhook when user clicks Pay & Check-in (after Payment Required). */
// async function callPayCheckInWebhook(email: string) {
//   if (!email) return;
//   try {
//     await fetch(
//       "https://services.leadconnectorhq.com/hooks/PzFP7g66Iv7nw8oMDLfE/webhook-trigger/92d8f29f-6d4a-44e1-8aba-d4306fcefe5e?number=13109514419",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ site_id: "314", email }),
//       }
//     );
//   } catch (e) {
//     console.warn("Pay & Check-in webhook failed", e);
//   }
// }

/** Pay & Check-in refill-webhook payload (panel.whitelabelmd.com refill-webhook). */
const PAY_CHECKIN_WEBHOOK = {
  event_type: "Pay & Check-in",
  button_name: "Pay & Check-In",
  page: "Refills" as const,
};

/** Order/earliest date for day calculations (e.g. 20/80 day checks): prefer earliest of intakes_dates, else time. */
function getProductOrderDate(p: CartProduct): string | undefined {
  const dates = p.intakes_dates?.length ? p.intakes_dates : (p.time ? [p.time] : []);
  if (!dates.length) return undefined;
  return dates.reduce((a, b) => (new Date(a).getTime() < new Date(b).getTime() ? a : b));
}

/** Array of completion date strings to show in UI (intakes_dates when present, else [time]). */
function getProductCompletedDates(p: CartProduct): string[] {
  if (p.intakes_dates?.length) return p.intakes_dates;
  return p.time ? [p.time] : [];
}

/** Date at given box index (0 = first step, 1 = second, etc.). Returns undefined if no date at that index. */
function getProductCompletedDateAt(p: CartProduct, index: number): string | undefined {
  const dates = getProductCompletedDates(p);
  return dates[index];
}

/** Green thank-you box with completed date. First box (initial intake) shows "Thank you for submitting medical form"; later visits show "Thank you for your check-in!". Optional refill message for 2nd+ visit. */
function CheckInThankYouBox({
  completedDate,
  showRefillMessage = false,
  isFirstVisit = false,
}: {
  completedDate: string;
  showRefillMessage?: boolean;
  /** When true (initial intake / 1st visit), show "Thank you for submitting medical form" instead of "Thank you for your check-in!" */
  isFirstVisit?: boolean;
}) {
  const formatted = new Date(completedDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const title = isFirstVisit
    ? "Thank you for submitting medical form."
    : "Thank you for your check-in!";
  return (
    <div className="mt-3 rounded-xl bg-green-600 p-3 text-white">
      <div className="flex items-start gap-2">
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
        <div className="min-w-0">
          <p className="font-semibold text-sm sm:text-base">{title}</p>
          <p className="text-xs sm:text-sm opacity-90 mt-0.5">Completed on {formatted}</p>
          {showRefillMessage && (
            <p className="text-xs sm:text-sm opacity-90 mt-2 flex items-start gap-1.5">
              <Package className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>A $0 refill order is being processed and will appear in your Orders — you already paid in full.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Schedule step for "Help with Check-in Schedule" modal. dateLabel: optional "Est. ..." or use signupDate for step 1 when dateLabel is "signup". dateRange: optional days from signup for computed "Est. X – Y" when orderDate is available. */
interface ScheduleStep {
  title: string;
  dateLabel?: string | "signup";
  /** When set and orderDate is available, show "Est. startDate – endDate" using these days from signup. */
  dateRange?: { startDays: number; endDays: number };
  description: string;
}

/** Format a date for schedule display. */
function formatScheduleDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format signup date with weekday (e.g. "Sat, Mar 7, 2026"). */
function formatSignupDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Add days to a date (returns new Date). */
function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

/** Form base URL for resolving relative form_url_new / form_url from API. */
const FORM_BASE_URL =
  (import.meta.env.VITE_FORM_BASE_URL as string) || panelApi.baseUrl;

/** Ensure form URL is absolute for modal iframe. Relative paths are resolved against FORM_BASE_URL. */
function ensureFullFormUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed === "") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? `${FORM_BASE_URL}${trimmed}` : `${FORM_BASE_URL}/${trimmed}`;
}

/** Get the date string to show for a step (signup date, or "Est. X – Y" from dateRange). Returns null if no date. */
function getStepDateDisplay(orderDate: string | undefined, step: ScheduleStep): string | null {
  if (!orderDate) {
    if (step.dateLabel === "signup") return null; // will show "—" or skip
    return step.dateLabel === "signup" ? null : (step.dateLabel ?? null);
  }
  try {
    const signup = new Date(orderDate);
    if (isNaN(signup.getTime())) return null;
    if (step.dateLabel === "signup") return formatSignupDate(signup);
    if (step.dateRange) {
      const start = addDays(signup, step.dateRange.startDays);
      const end = addDays(signup, step.dateRange.endDays);
      return `Est. ${formatScheduleDate(start)} – ${formatScheduleDate(end)}`;
    }
    return step.dateLabel ?? null;
  } catch {
    return step.dateLabel === "signup" ? null : (step.dateLabel ?? null);
  }
}

const SCHEDULE_BY_PLAN: Record<"1" | "3" | "6" | "12", { title: string; steps: ScheduleStep[] }> = {
  "1": {
    title: "Your 1 Month Schedule",
    steps: [
      { title: "You signed up", dateLabel: "signup", description: "Your plan is active. We're getting your medication ready." },
      { title: "Medical intake", description: "Fill out a short health form so your doctor can prescribe your medication." },
      { title: "Your first medication ships", dateRange: { startDays: 2, endDays: 3 }, description: "Your medication is mailed to you. Usually arrives 2–3 days after we ship it." },
      { title: "Check-in with your doctor", dateRange: { startDays: 21, endDays: 27 }, description: "A quick 5-minute online visit. Your doctor checks how you're doing and adjusts your dose if needed." },
      { title: "Refill shipped to you", description: "After your check-in is approved, we ship your next supply right away." },
      { title: "Your plan ends", dateRange: { startDays: 28, endDays: 35 }, description: "After this date you'll need to renew your plan to keep receiving medication." },
    ],
  },
  "3": {
    title: "Your 3 Months Schedule",
    steps: [
      { title: "You signed up", dateLabel: "signup", description: "Your plan is active. We're getting your medication ready." },
      { title: "Medical intake", description: "Fill out a short health form so your doctor can prescribe your medication." },
      { title: "Your first medication ships", dateRange: { startDays: 2, endDays: 3 }, description: "Your medication is mailed to you. Usually arrives 2–3 days after we ship it." },
      { title: "Your plan ends", dateRange: { startDays: 88, endDays: 95 }, description: "After this date you'll need to renew your plan to keep receiving medication." },
    ],
  },
  "6": {
    title: "Your 6 Months Schedule",
    steps: [
      { title: "You signed up", dateLabel: "signup", description: "Your plan is active. We're getting your medication ready." },
      { title: "Medical intake", description: "Fill out a short health form so your doctor can prescribe your medication." },
      { title: "Your first medication ships", dateRange: { startDays: 2, endDays: 3 }, description: "Your medication is mailed to you. Usually arrives 2–3 days after we ship it." },
      { title: "Check-in with your doctor", dateRange: { startDays: 70, endDays: 85 }, description: "A quick 5-minute online visit. Your doctor checks how you're doing and adjusts your dose if needed." },
      { title: "Refill #2 shipped to you", dateRange: { startDays: 86, endDays: 90 }, description: "Your next batch of medication is mailed to your address." },
      { title: "Your plan ends", dateRange: { startDays: 175, endDays: 190 }, description: "After this date you'll need to renew your plan to keep receiving medication." },
    ],
  },
  "12": {
    title: "Your 12 Months Schedule",
    steps: [
      { title: "You signed up", dateLabel: "signup", description: "Your plan is active. We're getting your medication ready." },
      { title: "Medical intake", description: "Fill out a short health form so your doctor can prescribe your medication." },
      { title: "Your first medication ships", dateRange: { startDays: 2, endDays: 3 }, description: "Your medication is mailed to you. Usually arrives 2–3 days after we ship it." },
      { title: "Check-in with your doctor", dateRange: { startDays: 70, endDays: 85 }, description: "A quick 5-minute online visit. Your doctor checks how you're doing and adjusts your dose if needed." },
      { title: "Refill #2 shipped to you", dateRange: { startDays: 86, endDays: 90 }, description: "Your next batch of medication is mailed to your address." },
      { title: "Check-in with your doctor", dateRange: { startDays: 140, endDays: 155 }, description: "A quick 5-minute online visit. Your doctor checks how you're doing and adjusts your dose if needed." },
      { title: "Refill #3 shipped to you", dateRange: { startDays: 156, endDays: 160 }, description: "Your next batch of medication is mailed to your address." },
      { title: "Check-in with your doctor", dateRange: { startDays: 210, endDays: 225 }, description: "A quick 5-minute online visit. Your doctor checks how you're doing and adjusts your dose if needed." },
      { title: "Refill #4 shipped to you", dateRange: { startDays: 226, endDays: 230 }, description: "Your next batch of medication is mailed to your address." },
      { title: "Your plan ends", dateRange: { startDays: 355, endDays: 375 }, description: "After this date you'll need to renew your plan to keep receiving medication." },
    ],
  },
};

interface OrderIntakeData {
  first_name: string;
  last_name: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
  therapy: string;
  stage: string;
  order_id: string;
  intake_id: string;
  unique_id: string;
  prescription_id: string | null;
  intake_form_id: string;
}

interface ApiResponse {
  status: string;
  message: string;
  data: OrderIntakeData;
}

export function Refills() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [allProducts, setAllProducts] = useState<CartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [progressTrackerOrderId, setProgressTrackerOrderId] = useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "error" | "success";
    message: string;
  } | null>(null);
  // Still used in handleFormClick for loading state
  const [loadingButtons, setLoadingButtons] = useState<Set<string>>(new Set());
  const [userStateData, setUserStateData] = useState<{
    stateName: string;
    stateCode: string;
  }>({ stateName: "", stateCode: "" });
  const [productSelectionModal, setProductSelectionModal] = useState<{
    isOpen: boolean;
    products: WeightLossProduct[];
    isLoading: boolean;
    currentProduct: CartProduct | null;
  }>({
    isOpen: false,
    products: [],
    isLoading: false,
    currentProduct: null,
  });
  const [paymentMethodModal, setPaymentMethodModal] = useState<{
    isOpen: boolean;
    selectedProduct: WeightLossProduct | null;
    currentProduct: CartProduct | null;
  }>({
    isOpen: false,
    selectedProduct: null,
    currentProduct: null,
  });
  const [paymentFormModal, setPaymentFormModal] = useState<{
    isOpen: boolean;
    selectedProduct: WeightLossProduct | null;
    currentProduct: CartProduct | null;
  }>({
    isOpen: false,
    selectedProduct: null,
    currentProduct: null,
  });
  // Inline selection states per order
  const [selectedRefillProducts, setSelectedRefillProducts] = useState<
    Record<string, WeightLossProduct | null>
  >({});
  const [availableWeightLossProducts, setAvailableWeightLossProducts] =
    useState<Record<string, WeightLossProduct[]>>({});
  /** Selected tab in Choose Your Plan: 'semaglutide' | 'tirzepatide' (per order_id) */
  const [planTabByOrderId, setPlanTabByOrderId] = useState<
    Record<string, "semaglutide" | "tirzepatide">
  >({});
  const [loadingProducts, setLoadingProducts] = useState<
    Record<string, boolean>
  >({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    Record<string, "same" | "new" | null>
  >({});
  const [showPaymentForm, setShowPaymentForm] = useState<
    Record<string, boolean>
  >({});
  const [appliedCoupons, setAppliedCoupons] = useState<
    Record<string, AppliedRefillCoupon | null>
  >({});
  /** `order_id` for inline pay, or `__modal__` for payment modal */
  const [refillPaySubmitting, setRefillPaySubmitting] = useState<string | null>(
    null,
  );
  const [processingOrder, setProcessingOrder] = useState<
    Record<string, boolean>
  >({});
  const [medicationChangeType, setMedicationChangeType] = useState<
    Record<string, "increase" | "decrease" | "same" | null>
  >({});
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processOrderResult, setProcessOrderResult] = useState<{
    isOpen: boolean;
    type: "success" | "error" | null;
    message: string;
    details?: string;
    newOrderId?: string;
  }>({
    isOpen: false,
    type: null,
    message: "",
    details: "",
    newOrderId: "",
  });
  /** Refill return from Stripe: loading while createOrder runs, then thank-you modal with order_id */
  const [isRefillOrderCreating, setIsRefillOrderCreating] = useState(false);
  const [refillOrderSuccessModal, setRefillOrderSuccessModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const refillReturnProcessedRef = useRef(false);
  /** Set when user clicks Pay & Check-in; cleared when Stripe payment succeeds or 20-min timer fires. */
  const payCheckInClickedNoStripeRef = useRef<{ email: string; order_id: string } | null>(null);
  /** Timestamp (Date.now()) when Pay & Check-in was clicked; used when tab was backgrounded/minimized to check 20 min on visibility change. */
  const payCheckInClickedAtRef = useRef<number | null>(null);
  /** 20-min timer: if Pay & Check-in clicked and payment not done, send refill-webhook with order_id "20 min passed". */
  const payCheckIn20MinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refillContentRef = useRef<HTMLDivElement>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [isRefillGuideVideoOpen, setIsRefillGuideVideoOpen] = useState(false);
  const refillGuideVideoRef = useRef<HTMLVideoElement | null>(null);
  const closeRefillGuideVideo = () => {
    setIsRefillGuideVideoOpen(false);
    const v = refillGuideVideoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };
  const [scheduleHelpModal, setScheduleHelpModal] = useState<{
    isOpen: boolean;
    planType: "1" | "3" | "6" | "12" | null;
    orderDate?: string;
  }>({ isOpen: false, planType: null });
  /** When bm === 3: plan selection (Choose Your Plan) is hidden by default; show after Pay & Check-in */
  const [showPlanSelectionForBm3, setShowPlanSelectionForBm3] = useState(false);
  /** When bm === 4: hide plan selection by default; show after Pay & Check-in */
  const [showPlanSelectionForBm4, setShowPlanSelectionForBm4] = useState(false);
  /** When bm === 3: after Pay & Check-in click, hide current plan section and show "Start Your Plan" primary card */
  const [showStartYourPlanAfterPayCheckIn, setShowStartYourPlanAfterPayCheckIn] = useState(false);
  const planSelectionSectionRef = useRef<HTMLDivElement>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
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
  }>({
    isOpen: false,
    formUrl: "",
    orderId: "",
    productId: 0,
    productName: "",
    productCategoryName: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    stateName: "",
    stateCode: "",
    intakeFormId: "",
    uniqueId: "",
  });

  const fetchRefills = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      }

      const userData = storage.getUserData();
      if (!userData?.email) {
        throw new Error("User data not found");
      }

      const response = await getUserCartProductsV5(userData.email);

      if (response.status === 1) {
        // Handle both single product object and array
        let productsArray: CartProduct[] = [];

        if (Array.isArray(response.product)) {
          productsArray = response.product;
        } else if (response.product && typeof response.product === 'object') {
          // Single product object
          productsArray = [response.product];
        }

        // Extract state data from the first product
        if (productsArray.length > 0) {
          const firstProduct = productsArray[0];
          setUserStateData({
            stateName: firstProduct.state_name || "",
            stateCode: firstProduct.state_code || "",
          });
        }

        // Store all products
        setAllProducts(productsArray);

        // TEMPORARY: Show all products for testing purposes
        // TODO: Revert to filter only CHECKIN products after testing
        // Filter only refill orders (therapy_group === "CHECKIN")
        // const refillProducts = productsArray.filter((product) => {
        //   return product.therapy_group === "CHECKIN" && !!product.form_url_new;
        // });

        // For testing: Show all products
        const refillProducts = productsArray;

        setProducts(refillProducts);
      } else {
        setAllProducts([]);
        setProducts([]);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to fetch refills:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch refills");
    } finally {
      setIsLoading(false);
      if (showRefreshing) {
        setIsRefreshing(false);
      }
    }
  };

  const handleRefillStripeSuccess = async (
    cartProduct: CartProduct,
    planProductId: string,
    response: { status: number; message: string; order_id?: string },
    context: "inline" | "modal",
  ) => {
    clearPayCheckInPendingAndTimer();
    if (context === "modal") {
      setPaymentFormModal({
        isOpen: false,
        selectedProduct: null,
        currentProduct: null,
      });
    } else {
      setSelectedPaymentMethod((prev) => ({
        ...prev,
        [cartProduct.order_id]: "new",
      }));
      setShowPaymentForm((prev) => ({
        ...prev,
        [cartProduct.order_id]: false,
      }));
    }

    if (response.order_id) {
      setProgressTrackerOrderId(response.order_id);
      setShowProgressTracker(true);
      setProcessOrderResult({
        isOpen: true,
        type: "success",
        message: "Your refill order has been placed successfully.",
        details: `Order ID: ${response.order_id}`,
        newOrderId: response.order_id,
      });
      setRefillOrderSuccessModal({ isOpen: true, orderId: response.order_id });
    }

    setNotification({
      type: "success",
      message: response.message || "Order placed successfully",
    });
    setTimeout(() => setNotification(null), 3000);
    await fetchRefills(true);
    void planProductId;
  };

  useEffect(() => {
    fetchRefills();
  }, []);

  const TWENTY_MIN_MS = 20 * 60 * 1000;

  const clearPayCheckInPendingAndTimer = () => {
    payCheckInClickedNoStripeRef.current = null;
    payCheckInClickedAtRef.current = null;
    if (payCheckIn20MinTimerRef.current) {
      clearTimeout(payCheckIn20MinTimerRef.current);
      payCheckIn20MinTimerRef.current = null;
    }
  };

  const sendPayCheckIn20MinPassedWebhook = () => {
    const pending = payCheckInClickedNoStripeRef.current;
    if (!pending) return;
    // trackRefillClick({
    //   ...PAY_CHECKIN_WEBHOOK,
    //   email: pending.email,
    //   order_id: "20 min passed",
    // });
    clearPayCheckInPendingAndTimer();
  };

  // 20-min timer: when Pay & Check-in clicked, start timer; if payment not done in 20 min, send refill-webhook with order_id "20 min passed"
  // Note: when tab is backgrounded or browser minimized, browsers throttle setTimeout. We also use Page Visibility + timestamp below.
  const startPayCheckIn20MinTimer = (_email: string) => {
    payCheckInClickedAtRef.current = Date.now();
    if (payCheckIn20MinTimerRef.current) {
      clearTimeout(payCheckIn20MinTimerRef.current);
      payCheckIn20MinTimerRef.current = null;
    }
    payCheckIn20MinTimerRef.current = setTimeout(sendPayCheckIn20MinPassedWebhook, TWENTY_MIN_MS);
  };

  // When user returns to tab after tab was hidden or browser minimized: if 20 min passed since Pay & Check-in click, send webhook
  // (Browsers throttle setTimeout in background, so the timer may not fire; checking on visibility change makes it reliable.)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const pending = payCheckInClickedNoStripeRef.current;
      const clickedAt = payCheckInClickedAtRef.current;
      if (!pending || clickedAt == null) return;
      if (Date.now() - clickedAt >= TWENTY_MIN_MS) {
        sendPayCheckIn20MinPassedWebhook();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Handle return from Stripe redirect methods (Klarna / wallets): createOrder_stripe
  useEffect(() => {
    const refillSuccess = searchParams.get("refill_success");
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntent = searchParams.get("payment_intent");
    if (refillSuccess !== "1" || redirectStatus !== "succeeded" || !paymentIntent) {
      return;
    }
    if (refillReturnProcessedRef.current) return;
    refillReturnProcessedRef.current = true;

    const run = async () => {
      let orderFailed = false;
      let orderId: string | null = null;
      const pendingRaw = sessionStorage.getItem(REFILL_PENDING_ORDER_KEY);
      sessionStorage.removeItem(REFILL_PENDING_ORDER_KEY);
      if (!pendingRaw) {
        setSearchParams({}, { replace: true });
        refillReturnProcessedRef.current = false;
        return;
      }

      const pending = JSON.parse(pendingRaw) as {
        orderId: string;
        productId: string;
        product_price?: string;
        original_price?: string;
        promo_codes?: string | null;
        campaign_id?: number | string | null;
        email: string;
        first_name: string;
        last_name: string;
        billing_state: string;
        state_code: string;
        state_name: string;
        billing_postcode: string;
        billing_address: string;
        billing_city: string;
        phone: string;
      };

      logRefillPurchase({
        event: "stripe_redirect_return",
        orderId: pending.orderId,
        productId: pending.productId,
        email: pending.email,
        message: "Stripe redirect succeeded, creating order via createOrder_stripe",
      });
      setIsRefillOrderCreating(true);
      try {
        const stateName =
          pending.billing_state ||
          pending.state_code ||
          (pending.state_name ? getStateCode(pending.state_name) : "") ||
          pending.state_name ||
          "";
        const response = await createOrderStripe({
          email: pending.email,
          first_name: pending.first_name || "",
          last_name: pending.last_name || "",
          phone: pending.phone || "",
          address: pending.billing_address || "",
          city_name: pending.billing_city || "",
          state_name: stateName,
          zip_code: pending.billing_postcode || "",
          product_id: pending.productId,
          product_price: pending.product_price ?? "",
          original_price: pending.original_price,
          stripePaymentIntentId: paymentIntent,
          parent_order: pending.orderId,
          start_url: `${window.location.origin}/refills`,
          promo_codes: pending.promo_codes || null,
          campaign_id: pending.campaign_id ?? null,
        });
        if (response.order_id) {
          orderId = String(response.order_id);
          logRefillPurchase({
            event: "stripe_create_order_success",
            orderId: String(response.order_id),
            productId: pending.productId,
            email: pending.email,
            response: { status: response.status },
          });
        }
      } catch (err) {
        logRefillPurchase({
          event: "stripe_create_order_error",
          orderId: pending.orderId,
          productId: pending.productId,
          email: pending.email,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error("createOrder_stripe after redirect:", err);
        orderFailed = true;
        setNotification({
          type: "error",
          message:
            "Payment succeeded but order could not be recorded. Please contact support.",
        });
        setTimeout(() => setNotification(null), 8000);
      } finally {
        setIsRefillOrderCreating(false);
      }

      if (!orderFailed) {
        clearPayCheckInPendingAndTimer();
        setRefillOrderSuccessModal({ isOpen: true, orderId });
        if (orderId) {
          setProgressTrackerOrderId(orderId);
          setShowProgressTracker(true);
        }
      }
      fetchRefills(true);
      setSearchParams({}, { replace: true });
      refillReturnProcessedRef.current = false;
    };
    run();
  }, [searchParams, setSearchParams]);

  // Fetch weight loss products for each weight loss product on mount/update
  useEffect(() => {
    const fetchProductsForWeightLoss = async () => {
      for (const product of products) {
        const productName = product.product_name || "";
        const isWeightLoss = isWeightLossProductName(productName);

        // Check if we already have products for this order
        const existingProducts = availableWeightLossProducts[product.order_id];
        if (
          isWeightLoss &&
          !existingProducts &&
          !loadingProducts[product.order_id]
        ) {
          setLoadingProducts((prev) => ({ ...prev, [product.order_id]: true }));

          try {
            console.log(
              `Fetching weight loss products for order ${product.order_id}`
            );
            const weightLossProducts = await getWeightLossProducts();
            console.log("Weight loss products response:", weightLossProducts);

            if (
              weightLossProducts &&
              weightLossProducts.product &&
              Array.isArray(weightLossProducts.product)
            ) {
              // Show all products from API (no filtering by medication type)
              const allProducts = weightLossProducts.product;

              console.log(
                `All products for order ${product.order_id}:`,
                allProducts
              );

              setAvailableWeightLossProducts((prev) => ({
                ...prev,
                [product.order_id]: allProducts,
              }));
            } else {
              console.error(
                "Invalid weight loss products response structure:",
                weightLossProducts
              );
            }
          } catch (error) {
            console.error(
              `Failed to fetch weight loss products for order ${product.order_id}:`,
              error
            );
          } finally {
            setLoadingProducts((prev) => ({
              ...prev,
              [product.order_id]: false,
            }));
          }
        }
      }
    };

    if (products.length > 0) {
      fetchProductsForWeightLoss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Function to get intake data from the new API
  const getOrderIntakeData = async (
    orderId: string
  ): Promise<OrderIntakeData | null> => {
    try {
      console.log(`Calling intake API for order: ${orderId}`);

      const email = storage.getUserData()?.email ?? "";
      const url = new URL(buildOrderOpTestUrl(orderId));
      url.searchParams.set("email", email);

      const response = await apiFetch(url.toString(), {
        method: "GET",
      });

      console.log(`API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! status: ${response.status}, response: ${errorText}`
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log(`Intake API response for order ${orderId}:`, data);

      if (data.status === "success") {
        if (
          data.message &&
          data.message.toLowerCase().includes("can't find order")
        ) {
          console.log(`Order ${orderId} not ready yet: ${data.message}`);
          throw new Error("ORDER_NOT_READY");
        }

        if (data.data && data.data.intake_form_id === null) {
          console.log(
            `Intake not found for order ${orderId}: intake_form_id is null`
          );
          throw new Error("INTAKE_NOT_FOUND");
        }

        console.log(`Successfully got intake data for order ${orderId}`);
        return data.data;
      } else {
        console.error(
          `API returned error status: ${data.status}, message: ${data.message}`
        );
        throw new Error(data.message || "Failed to fetch intake data");
      }
    } catch (error) {
      console.error(`Failed to get intake data for order ${orderId}:`, error);
      return null;
    }
  };

  // Helper functions for managing button loading state
  const setButtonLoading = (orderId: string, loading: boolean) => {
    setLoadingButtons((prev) => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // TEMPORARILY COMMENTED OUT - Button is hidden
  // const isButtonLoading = (orderId: string) => {
  //   return loadingButtons.has(orderId);
  // };

  // TEMPORARILY COMMENTED OUT - Button is hidden
  // const isFormButtonDisabled = (product: CartProduct) => {
  //   if (
  //     product.stage !== "RECORDED" &&
  //     product.stage !== "NEW" &&
  //     !product.form_url_new
  //   ) {
  //     return true;
  //   }
  //   return false;
  // };

  const handleFormClick = async (product: CartProduct) => {
    setButtonLoading(product.order_id, true);

    try {
      console.log("handleFormClick called with product:", product);

      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error("User data not found");
      }

      // Long-term/check-in orders should skip product selection and go directly to form.
      // Some bm:6 (12-month) orders come back with interval_days === 82.
      const isLongTermOrder =
        product.interval_days === 90 ||
        product.bm === 6 ||
        product.max_checkins === 4;

      // Check if this order needs intake completion (is_sub === 0)
      // For these orders, skip product selection and go directly to form (same as CheckInForms)
      const needsIntakeCompletion = product.is_sub === 0;

      // Check if this is a bm-4 (3-month) order with an active form (form_url_new exists)
      // For these orders, skip product selection and go directly to form_url_new
      // This handles both initial intake (filled_checkins === 0) and check-ins (filled_checkins >= 1)
      const isBm4WithCheckInForm = product.bm === 4 &&
        product.form_url_new &&
        product.form_url_new.trim() !== "";

      console.log("🔍 Order check - interval_days:", product.interval_days, "isLongTermOrder:", isLongTermOrder);
      console.log("🔍 Order check - is_sub:", product.is_sub, "needsIntakeCompletion:", needsIntakeCompletion);
      console.log("🔍 Order check - bm:", product.bm, "isBm4WithCheckInForm:", isBm4WithCheckInForm, "filled_checkins:", product.filled_checkins);

      const productName = product.product_name || "";
      const isWeightLossProduct = isWeightLossProductName(productName);

      // If it's a weight loss product AND NOT a long-term order AND NOT an intake completion order AND NOT a bm-4 check-in,
      // fetch products for inline selection
      if (isWeightLossProduct && !isLongTermOrder && !needsIntakeCompletion && !isBm4WithCheckInForm) {
        console.log("⏭️ Skipping form - showing product selection for weight loss product");
        setLoadingProducts((prev) => ({ ...prev, [product.order_id]: true }));

        try {
          const weightLossProducts = await getWeightLossProducts();

          // Show all products from API (no filtering by medication type)
          const allProducts = weightLossProducts.product;

          setAvailableWeightLossProducts((prev) => ({
            ...prev,
            [product.order_id]: allProducts,
          }));
        } catch (error) {
          console.error("Failed to fetch weight loss products:", error);
          setNotification({
            type: "error",
            message: "Failed to load products. Please try again.",
          });
          setTimeout(() => setNotification(null), 5000);
        } finally {
          setLoadingProducts((prev) => ({
            ...prev,
            [product.order_id]: false,
          }));
          setButtonLoading(product.order_id, false);
        }
        return; // Exit early, show inline product selection
      }

      // Continue with normal form flow for non-weight-loss products or long-term orders
      console.log("✅ Proceeding with form flow for order:", product.order_id);
      let baseFormUrl: string | null = null;

      // Continuation: msg22 must contain continuation_stamp (same format, dynamic value). If continuation_date_utc null → need intake; if set → current flow
      const continuationStampTrimmed = product.continuation_stamp ? String(product.continuation_stamp).trim() : "";
      const msg22ContainsContinuationStamp = !!(product.msg22 && continuationStampTrimmed && String(product.msg22).includes(continuationStampTrimmed));
      const continuationDateIsNull =
        product.continuation_date_utc == null || String(product.continuation_date_utc ?? "").trim() === "";
      const needsContinuationIntake = msg22ContainsContinuationStamp && continuationDateIsNull;

      if (needsContinuationIntake && product.form_url_new?.trim()) {
        baseFormUrl = product.form_url_new.trim();
        console.log("✅ Continuation (continuation_date_utc null) - Using form_url_new for intake:", baseFormUrl);
      } else if (needsIntakeCompletion) {
        // For is_sub === 0: bm === 4 + msg22 "Next link is continuation" → use form_url_new; bm === 3 + form_url_new → use form_url_new; else form_url
        const msg22IsContinuationLink = product.msg22 && /next link is continuation/i.test(String(product.msg22));
        const isBm4CheckIn = product.bm === 4 && msg22IsContinuationLink && product.form_url_new != null && product.form_url_new.trim() !== "";
        const isBm3WithFormUrlNew = product.bm === 3 && product.form_url_new != null && product.form_url_new.trim() !== "";
        baseFormUrl = isBm4CheckIn ? (product.form_url_new!.trim()) : (isBm3WithFormUrlNew ? (product.form_url_new || null) : (product.form_url || null));
        console.log(
          isBm4CheckIn
            ? "✅ is_sub === 0, bm === 4 (msg22 continuation) - Using form_url_new for check-in:"
            : isBm3WithFormUrlNew
              ? "✅ is_sub === 0, bm === 3 - Using form_url_new for intake:"
              : "✅ is_sub === 0 - Using form_url for intake completion:",
          baseFormUrl
        );
      } else if (product.stage === "RECORDED" || product.stage === "NEW") {
        baseFormUrl = product.form_url || null;
        console.log(
          `✅ Stage is ${product.stage} - Using form_url:`,
          baseFormUrl
        );
      } else {
        baseFormUrl = product.form_url_new || null;
        // Allow johdue12@gmail.com on bm:6 check-in to use form_url when form_url_new is not yet set (e.g. 2nd Visit)
        const userEmailForForm = (product.email || storage.getUserData()?.email) ?? "";
        if (!baseFormUrl && product.bm === 6 && userEmailForForm === "johdue12@gmail.com" && (product.form_url != null && String(product.form_url).trim() !== "")) {
          baseFormUrl = product.form_url.trim();
          console.log("✅ bm:6 check-in for johdue12@gmail.com - Using form_url fallback:", baseFormUrl);
        } else {
          console.log(
            "✅ Stage is not RECORDED or NEW - Using form_url_new:",
            baseFormUrl
          );
        }

        if (!baseFormUrl) {
          console.log("❌ form_url_new is null - Cannot open form");
          setNotification({
            type: "info",
            message:
              "Please wait for the next check-in. Your form will be available soon.",
          });
          setTimeout(() => setNotification(null), 8000);
          setButtonLoading(product.order_id, false);
          return;
        }
      }

      if (!baseFormUrl) {
        throw new Error("Form URL not available");
      }

      let intakeData: OrderIntakeData | null = null;
      try {
        intakeData = await getOrderIntakeData(product.order_id);
      } catch (error) {
        console.warn(
          "Failed to get intake data, continuing with form URL from product:",
          error
        );
      }

      // When continuation_date_utc is null and we have continuation_stamp, use form_url_new for intake
      if (needsContinuationIntake && baseFormUrl) {
        console.log("🔄 Continuation intake - redirecting to form_url_new:", baseFormUrl);
        openExternalUrl(baseFormUrl);
        setButtonLoading(product.order_id, false);
        return;
      }

      // When bm === 3 and we have form_url_new, redirect user directly to form_url_new
      const isBm3WithFormUrlNewRedirect =
        needsIntakeCompletion &&
        product.bm === 3 &&
        product.form_url_new != null &&
        product.form_url_new.trim() !== "" &&
        baseFormUrl === product.form_url_new;
      if (isBm3WithFormUrlNewRedirect && baseFormUrl) {
        console.log("🔄 bm === 3 Start Check-in - redirecting to form_url_new:", baseFormUrl);
        openExternalUrl(baseFormUrl);
        setButtonLoading(product.order_id, false);
        return;
      }

      // When bm === 4, is_sub === 0, msg22 "Next link is continuation", use form_url_new and open in new tab
      const msg22IsContinuationLinkRedirect = product.msg22 && /next link is continuation/i.test(String(product.msg22));
      const isBm4CheckInRedirect =
        needsIntakeCompletion &&
        product.bm === 4 &&
        msg22IsContinuationLinkRedirect &&
        product.form_url_new != null &&
        product.form_url_new.trim() !== "" &&
        baseFormUrl === product.form_url_new.trim();
      if (isBm4CheckInRedirect && baseFormUrl) {
        console.log("🔄 bm === 4 Check-in - redirecting to form_url_new:", baseFormUrl);
        openExternalUrl(baseFormUrl);
        setButtonLoading(product.order_id, false);
        return;
      }

      // Check if form_url is the onboarding URL
      const onboardingBase =
        (import.meta.env.VITE_ONBOARDING_URL as string) ||
        "https://www.idunrx.com/onboarding/";
      const onboardingUrlPattern = new RegExp(
        `^${onboardingBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\/$/, "")}\\/?$`,
        "i",
      );
      const isOnboardingUrl =
        baseFormUrl && onboardingUrlPattern.test(baseFormUrl);

      // For is_sub === 0 intake: open form_url with onboarding-style params (check-in paths above are unchanged).
      // If form_url itself is the onboarding URL, keep onboarding base.
      if (needsIntakeCompletion || isOnboardingUrl) {
        console.log(
          "🔄 Intake redirect with parameters instead of modal",
          { needsIntakeCompletion, isOnboardingUrl, baseFormUrl },
        );

        let baseUrl: string;
        if (needsIntakeCompletion && baseFormUrl && !isOnboardingUrl) {
          // Take Intake (is_sub === 0): use product form_url, not hardcoded onboarding URL
          baseUrl = ensureFullFormUrl(baseFormUrl) || baseFormUrl;
        } else {
          baseUrl = onboardingBase.endsWith("/")
            ? onboardingBase
            : `${onboardingBase}/`;
        }

        const params = new URLSearchParams();

        params.append("order_id", product.order_id);
        params.append("unique_id", intakeData?.unique_id || "null");
        params.append("op", "intake");

        params.append(
          "fullName[0]",
          product.first_name ||
          intakeData?.first_name ||
          userData.firstName ||
          ""
        );
        params.append(
          "fullName[1]",
          product.last_name || intakeData?.last_name || userData.lastName || ""
        );
        params.append(
          "email",
          product.email || intakeData?.email || userData.email || ""
        );
        params.append(
          "phone",
          product.phone || intakeData?.phone || userData.phoneNumber || ""
        );

        let stateDisplay = "";
        const stateName =
          product.state_name ||
          intakeData?.state ||
          userStateData.stateName ||
          "";
        const stateCode = product.state_code || userStateData.stateCode || "";

        if (stateName && stateCode) {
          stateDisplay = `${stateName} (${stateCode})`;
        } else if (stateName) {
          stateDisplay = stateName;
        }
        params.append("usState", stateDisplay);

        params.append("address[city]", intakeData?.city || "");
        params.append("address[postal]", intakeData?.zip || "");
        params.append("address[addr_line1]", intakeData?.address || "");

        const productName = product.product_name || "";
        if (isSemaglutideProductName(productName)) {
          params.append("med", "S");
        } else if (isTirzepatideProductName(productName)) {
          params.append("med", "T");
        }

        const separator = baseUrl.includes("?") ? "&" : "?";
        const redirectUrl = `${baseUrl}${separator}${params.toString()}`;
        console.log("🔗 Redirect URL:", redirectUrl);
        console.log(
          needsIntakeCompletion
            ? "📋 Redirecting is_sub === 0 intake via form_url + params"
            : "📋 Redirecting onboarding URL + params",
        );

        // Use mobile-safe navigation helper so iOS Safari doesn't block as a popup
        openExternalUrl(redirectUrl);
        setButtonLoading(product.order_id, false);
        return;
      }

      const finalFormUrl = baseFormUrl;

      // Weight-loss check-in should open as a full-page redirect (not inside iframe modal).
      // Some browsers also block window.open when called after async awaits; openExternalUrl handles fallback.
      if (/\/weight-loss-checkin\/?/i.test(finalFormUrl)) {
        openExternalUrl(finalFormUrl);
        setButtonLoading(product.order_id, false);
        return;
      }

      const modalData = {
        isOpen: true,
        formUrl: ensureFullFormUrl(finalFormUrl) || finalFormUrl,
        orderId: product.order_id,
        productId: product.product_id,
        productName: product.product_name,
        productCategoryName: product.product_category_name,
        email: userData.email || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phoneNumber: userData.phoneNumber || "",
        stateName: userStateData.stateName,
        stateCode: userStateData.stateCode,
        intakeFormId:
          intakeData?.intake_form_id ||
          product.form_id ||
          product.form_id_new ||
          "",
        uniqueId: intakeData?.unique_id || "",
      };

      console.log("Using intake data from new API:", intakeData);
      console.log("Final form URL:", finalFormUrl);
      console.log("Modal data being set:", modalData);
      setModalState(modalData);
    } catch (error) {
      console.error("Failed to open form:", error);

      if (error instanceof Error && error.message === "ORDER_NOT_READY") {
        setNotification({
          type: "info",
          message:
            "Your order is being processed. Please wait 5-10 minutes and try again.",
        });
        setTimeout(() => setNotification(null), 8000);
      } else if (
        error instanceof Error &&
        error.message === "INTAKE_NOT_FOUND"
      ) {
        setNotification({
          type: "info",
          message: "Intake not found, please wait some time and try again.",
        });
        setTimeout(() => setNotification(null), 8000);
      } else {
        setNotification({
          type: "error",
          message: "Unable to load form. Please try after some time.",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } finally {
      setButtonLoading(product.order_id, false);
    }
  };

  const closeModal = async () => {
    setModalState({
      isOpen: false,
      formUrl: "",
      orderId: "",
      productId: 0,
      productName: "",
      productCategoryName: "",
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      stateName: "",
      stateCode: "",
      intakeFormId: "",
      uniqueId: "",
    });

    await fetchRefills(true);
  };

  const handleFormCompleted = async () => {
    console.log("Form completed, refreshing data...");
    await fetchRefills(true);
  };

  const handleManualRefresh = () => {
    fetchRefills(true);
  };

  // Handle process order (Refill Now)
  const handleProcessOrder = async (orderId: string, productId: string) => {
    setProcessingOrder((prev) => ({ ...prev, [orderId]: true }));
    const userData = storage.getUserData();
    logRefillPurchase({
      event: "process_order_start",
      orderId,
      productId,
      userId: userData?.userId,
    });

    try {
      const response = await processOrder({
        orderId: orderId,
        productId: productId,
      });

      console.log("Process order response:", response);

      // Check if step2 exists and has error_found
      if (response.step2) {
        const isSuccess =
          response.step2.error_found === "0" &&
          response.step2.response_code === "100";

        if (isSuccess) {
          logRefillPurchase({
            event: "process_order_success",
            orderId,
            productId,
            userId: userData?.userId,
            response: {
              newOrderId: response.step2?.newid || response.step2?.order_id,
              response_code: response.step2?.response_code,
            },
          });
          // Success case
          const successMessage =
            response.step2.response_message ||
            response.message ||
            "Order processed successfully";
          const newOrderId = response.step2.newid || response.step2.order_id;

          // Close the success modal first, then show progress tracker
          setProcessOrderResult({
            isOpen: false,
            type: null,
            message: "",
            details: "",
            newOrderId: "",
          });

          // Show progress tracker for check-in creation
          if (newOrderId) {
            setProgressTrackerOrderId(newOrderId);
            setShowProgressTracker(true);
          } else {
            // Fallback to success modal if no order ID
            setProcessOrderResult({
              isOpen: true,
              type: "success",
              message: successMessage,
              details: response.step2.totalOrderAmount
                ? `Total Amount: $${response.step2.totalOrderAmount}`
                : "",
              newOrderId: "",
            });
          }

          // Refresh the refills list
          await fetchRefills(true);
        } else {
          logRefillPurchase({
            event: "process_order_error",
            orderId,
            productId,
            userId: userData?.userId,
            message: response.step2.response_message || response.step2.error_message || response.message,
            response: { response_code: response.step2.response_code },
          });
          // Error case
          const errorMessage =
            response.step2.response_message ||
            response.step2.error_message ||
            response.message ||
            "Failed to process order";

          setProcessOrderResult({
            isOpen: true,
            type: "error",
            message: errorMessage,
            details: response.step2.response_code
              ? `Error Code: ${response.step2.response_code}`
              : "",
          });
        }
      } else if (response.status === 1) {
        // Fallback: if no step2 but status is 1, consider it success
        setProcessOrderResult({
          isOpen: true,
          type: "success",
          message: response.message || "Order processed successfully",
          details: "",
        });

        // Refresh the refills list
        await fetchRefills(true);
      } else {
        // Status is not 1
        setProcessOrderResult({
          isOpen: true,
          type: "error",
          message: response.message || "Failed to process order",
          details: "",
        });
      }
    } catch (error: any) {
      logRefillPurchase({
        event: "process_order_error",
        orderId,
        productId,
        userId: userData?.userId,
        error: error?.message || error?.response?.data?.message || String(error),
      });
      console.error("Process order error:", error);
      setProcessOrderResult({
        isOpen: true,
        type: "error",
        message:
          error.message ||
          error.response?.data?.message ||
          "Failed to process order. Please try again.",
        details: "",
      });
    } finally {
      setProcessingOrder((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Extract form flow logic to be reused
  const continueFormFlow = async (currentProduct: CartProduct) => {
    setButtonLoading(currentProduct.order_id, true);

    try {
      const userData = storage.getUserData();
      if (!userData?.userId) {
        throw new Error("User data not found");
      }

      let baseFormUrl: string | null = null;

      if (
        currentProduct.stage === "RECORDED" ||
        currentProduct.stage === "NEW"
      ) {
        baseFormUrl = currentProduct.form_url || null;
      } else {
        baseFormUrl = currentProduct.form_url_new || null;

        if (!baseFormUrl) {
          setNotification({
            type: "info",
            message:
              "Please wait for the next check-in. Your form will be available soon.",
          });
          setTimeout(() => setNotification(null), 8000);
          setButtonLoading(currentProduct.order_id, false);
          return;
        }
      }

      if (!baseFormUrl) {
        throw new Error("Form URL not available");
      }

      let intakeData: OrderIntakeData | null = null;
      try {
        intakeData = await getOrderIntakeData(currentProduct.order_id);
      } catch (error) {
        console.warn(
          "Failed to get intake data, continuing with form URL from product:",
          error
        );
      }

      // Check if form_url is the onboarding URL
      const onboardingBase =
        (import.meta.env.VITE_ONBOARDING_URL as string) ||
        "https://www.idunrx.com/onboarding/";
      const onboardingUrlPattern = new RegExp(
        `^${onboardingBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\/$/, "")}\\/?$`,
        "i",
      );
      const isOnboardingUrl =
        baseFormUrl && onboardingUrlPattern.test(baseFormUrl);
      const needsIntakeCompletion = currentProduct.is_sub === 0;

      // is_sub === 0 intake: open form_url with same params as onboarding (do not alter check-in modal flow)
      if (needsIntakeCompletion || isOnboardingUrl) {
        let baseUrl: string;
        if (needsIntakeCompletion && baseFormUrl && !isOnboardingUrl) {
          baseUrl = ensureFullFormUrl(baseFormUrl) || baseFormUrl;
        } else {
          baseUrl = onboardingBase.endsWith("/")
            ? onboardingBase
            : `${onboardingBase}/`;
        }

        const params = new URLSearchParams();

        params.append("order_id", currentProduct.order_id);
        params.append("unique_id", intakeData?.unique_id || "null");
        params.append("op", "intake");

        params.append(
          "fullName[0]",
          currentProduct.first_name ||
          intakeData?.first_name ||
          userData.firstName ||
          ""
        );
        params.append(
          "fullName[1]",
          currentProduct.last_name ||
          intakeData?.last_name ||
          userData.lastName ||
          ""
        );
        params.append(
          "email",
          currentProduct.email || intakeData?.email || userData.email || ""
        );
        params.append(
          "phone",
          currentProduct.phone ||
          intakeData?.phone ||
          userData.phoneNumber ||
          ""
        );

        let stateDisplay = "";
        const stateName =
          currentProduct.state_name ||
          intakeData?.state ||
          userStateData.stateName ||
          "";
        const stateCode =
          currentProduct.state_code || userStateData.stateCode || "";

        if (stateName && stateCode) {
          stateDisplay = `${stateName} (${stateCode})`;
        } else if (stateName) {
          stateDisplay = stateName;
        }
        params.append("usState", stateDisplay);

        params.append("address[city]", intakeData?.city || "");
        params.append("address[postal]", intakeData?.zip || "");
        params.append("address[addr_line1]", intakeData?.address || "");

        const productName = currentProduct.product_name || "";
        if (isSemaglutideProductName(productName)) {
          params.append("med", "S");
        } else if (isTirzepatideProductName(productName)) {
          params.append("med", "T");
        }

        const separator = baseUrl.includes("?") ? "&" : "?";
        const redirectUrl = `${baseUrl}${separator}${params.toString()}`;
        openExternalUrl(redirectUrl);
        setButtonLoading(currentProduct.order_id, false);
        return;
      }

      const finalFormUrl = baseFormUrl;

      const modalData = {
        isOpen: true,
        formUrl: ensureFullFormUrl(finalFormUrl) || finalFormUrl,
        orderId: currentProduct.order_id,
        productId: currentProduct.product_id,
        productName: currentProduct.product_name,
        productCategoryName: currentProduct.product_category_name,
        email: userData.email || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phoneNumber: userData.phoneNumber || "",
        stateName: userStateData.stateName,
        stateCode: userStateData.stateCode,
        intakeFormId:
          intakeData?.intake_form_id ||
          currentProduct.form_id ||
          currentProduct.form_id_new ||
          "",
        uniqueId: intakeData?.unique_id || "",
      };

      setModalState(modalData);
    } catch (error) {
      console.error("Failed to open form:", error);
      setNotification({
        type: "error",
        message: "Unable to load form. Please try after some time.",
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setButtonLoading(currentProduct.order_id, false);
    }
  };

  // Handle payment method selection - same card
  const handleSameCardSelection = () => {
    const { currentProduct } = paymentMethodModal;
    if (!currentProduct) return;
    const userData = storage.getUserData();
    logRefillPurchase({
      event: "payment_method_same",
      orderId: currentProduct.order_id,
      userId: userData?.userId,
      email: currentProduct.email,
    });

    // Close payment method modal
    setPaymentMethodModal({
      isOpen: false,
      selectedProduct: null,
      currentProduct: null,
    });

    // Continue with form flow
    continueFormFlow(currentProduct);
  };

  // Handle payment method selection - new card
  const handleNewCardSelection = () => {
    const { selectedProduct, currentProduct } = paymentMethodModal;
    if (!currentProduct || !selectedProduct) return;
    const userData = storage.getUserData();
    logRefillPurchase({
      event: "payment_method_new",
      orderId: currentProduct.order_id,
      productId: selectedProduct.product_id,
      userId: userData?.userId,
      email: currentProduct.email,
    });

    // Close payment method modal and show payment form
    setPaymentMethodModal({
      isOpen: false,
      selectedProduct: null,
      currentProduct: null,
    });

    setPaymentFormModal({
      isOpen: true,
      selectedProduct: selectedProduct,
      currentProduct: currentProduct,
    });
  };

  // Handle payment form submission
  const handlePaymentFormSubmit = async (data: PaymentFormData) => {
    const { selectedProduct, currentProduct } = paymentFormModal;
    if (!currentProduct) return;
    const userData = storage.getUserData();
    logRefillPurchase({
      event: "payment_form_submit_start",
      orderId: currentProduct.order_id,
      productId: selectedProduct?.product_id,
      userId: userData?.userId,
      email: currentProduct.email,
    });

    try {
      // Extract month and year from expiry date (MM/YY format)
      const [month, year] = data.expiryDate.split("/");

      // Import payment API
      const { updateOrderPayment } = await import("../../services/api/payment");

      const response = await updateOrderPayment({
        orderId: currentProduct.order_id,
        creditCardNumber: data.cardNumber.replace(/\s/g, ""),
        exMonth: month,
        exYear: `20${year}`,
        cvv: data.cvv,
      });

      if (response.status === 1) {
        logRefillPurchase({
          event: "payment_form_submit_success",
          orderId: currentProduct.order_id,
          productId: selectedProduct?.product_id,
          userId: userData?.userId,
          email: currentProduct.email,
          response: { status: response.status },
        });
        // Close payment form modal
        setPaymentFormModal({
          isOpen: false,
          selectedProduct: null,
          currentProduct: null,
        });

        // Show success notification
        setNotification({
          type: "success",
          message: "Payment method updated successfully",
        });
        setTimeout(() => setNotification(null), 3000);

        // Continue with form flow
        continueFormFlow(currentProduct);
      } else {
        throw new Error(response.message || "Failed to update payment method");
      }
    } catch (error: any) {
      logRefillPurchase({
        event: "payment_form_submit_error",
        orderId: currentProduct.order_id,
        productId: selectedProduct?.product_id,
        userId: userData?.userId,
        email: currentProduct.email,
        error: error?.message || String(error),
      });
      console.error("Payment update error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update payment method",
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleProductSelection = async (selectedProduct: WeightLossProduct) => {
    const currentProduct = productSelectionModal.currentProduct;
    if (!currentProduct) return;

    // Close product selection modal
    setProductSelectionModal({
      isOpen: false,
      products: [],
      isLoading: false,
      currentProduct: null,
    });

    const userData = storage.getUserData();
    logRefillPurchase({
      event: "plan_selected",
      orderId: currentProduct.order_id,
      productId: selectedProduct.product_id,
      userId: userData?.userId,
      email: currentProduct.email,
    });
    setAppliedCoupons((prev) => ({ ...prev, [currentProduct.order_id]: null }));
    logRefillPurchase({
      event: "payment_modal_open",
      orderId: currentProduct.order_id,
      productId: selectedProduct.product_id,
      userId: userData?.userId,
      email: currentProduct.email,
    });

    // Clear button loading state first
    setButtonLoading(currentProduct.order_id, false);

    // Use setTimeout to ensure the product modal closes before opening payment modal
    setTimeout(() => {
      setPaymentMethodModal({
        isOpen: true,
        selectedProduct: selectedProduct,
        currentProduct: currentProduct,
      });
    }, 150);
  };

  if (isLoading) {
    return <CartProductSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-2 border-red-200 p-8 sm:p-12 shadow-xl">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h3>
          <p className="text-gray-600 text-sm sm:text-base mb-8 px-2 leading-relaxed">
            {error}
          </p>
          <Button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchRefills();
            }}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 p-12 sm:p-16 shadow-xl">
        <div className="text-center max-w-lg mx-auto">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 rounded-3xl transform rotate-6"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-300 to-primary-400 rounded-3xl transform -rotate-6"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <RefreshCw className="w-12 h-12 text-white" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            No Refills Available
          </h3>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-2">
            You don't have any refills pending at the moment.
          </p>
          <p className="text-gray-500 text-sm sm:text-base">
            Check back later for your next refill.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={refillContentRef} data-page="refill_section">
      <>
        {/* Loading bar when creating refill order after Stripe return */}
        {isRefillOrderCreating && (
          <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary-100 overflow-hidden">
            <div
              className="h-full w-[40%] bg-primary-600"
              style={{
                animation: "refill-progress 1.5s ease-in-out infinite",
              }}
            />
            <style>{`
            @keyframes refill-progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(350%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
          </div>
        )}
        {/* Modern Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-50 max-w-md mx-auto sm:mx-0 animate-slide-down ${notification.type === "info"
              ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-900 shadow-blue-200/50"
              : notification.type === "success"
                ? "bg-gradient-to-r from-green-50 to-emerald-100 border-green-300 text-green-900 shadow-green-200/50"
                : "bg-gradient-to-r from-red-50 to-rose-100 border-red-300 text-red-900 shadow-red-200/50"
              } rounded-xl shadow-2xl border-2 backdrop-blur-sm p-4`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.type === "info"
                  ? "bg-blue-200"
                  : notification.type === "success"
                    ? "bg-green-200"
                    : "bg-red-200"
                  }`}
              >
                {notification.type === "info" && (
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {notification.type === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {notification.type === "error" && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-relaxed">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${notification.type === "info"
                  ? "text-blue-600 hover:bg-blue-200"
                  : notification.type === "success"
                    ? "text-green-600 hover:bg-green-200"
                    : "text-red-600 hover:bg-red-200"
                  }`}
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Refill Guide (Step-by-Step) - keep near top */}
        {/* <div className="mb-4 sm:mb-5 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            className="group w-full sm:w-auto px-2 py-2 text-base bg-[#3F4070] hover:bg-[#35365D] text-white shadow-lg shadow-[#3F4070]/20 hover:shadow-xl gap-2 rounded-full border border-white/10 transition-all duration-200"
            onClick={() => setIsRefillGuideVideoOpen(true)}
          >
            <span className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center transition-colors group-hover:bg-white/20">
              <svg
                viewBox="0 0 20 20"
                className="w-4 h-4 text-white"
                aria-hidden="true"
                focusable="false"
                fill="currentColor"
              >
                <path d="M7.6 5.7c-.5-.3-1.1 0-1.1.6v7.4c0 .6.6.9 1.1.6l6.5-3.7c.5-.3.5-1 0-1.3L7.6 5.7z" />
              </svg>
            </span>
            Refill Guide (Step-by-Step)
          </Button>
        </div> */}

        {/* Thank you for submitting check-in: when msg22 contains continuation_stamp and continuation_date_utc is set */}
        {/* {products.some((p) => {
        const stamp = p.continuation_stamp ? String(p.continuation_stamp).trim() : "";
        const inMsg22 = !!(p.msg22 && stamp && String(p.msg22).includes(stamp));
        const hasDate = p.continuation_date_utc != null && String(p.continuation_date_utc).trim() !== "";
        return inMsg22 && hasDate;
      }) && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-sm font-semibold text-green-800 sm:text-base">Your check-in has been successfully submitted. Please proceed with your payment below to receive your next dose.</p>
          </div>
        )} */}

        {/* Header Section */}
        {/* <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                IdunRx Monthly Check-in
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="relative p-2"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {products.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs flex items-center justify-center rounded-full">
                    {products.length}
                  </span>
                )}
              </Button>
              <Button variant="secondary" className="p-2">
                <Settings className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div> */}

        {/* Start Your Plan — when bm === 3 or bm === 4: show only after Pay & Check-in click; else show by default */}
        {(() => {
          const sorted = [...products].sort((a, b) => {
            const aDate = getProductLatestDate(a);
            const bDate = getProductLatestDate(b);
            if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime();
            return parseInt(b.order_id) - parseInt(a.order_id);
          });
          const latest = sorted[0];
          const isBm3 = latest?.bm === 3;
          const isBm4 = latest?.bm === 4;
          const showPurple = (!isBm3 && !isBm4) || showStartYourPlanAfterPayCheckIn || showPlanSelectionForBm4;
          if (!showPurple) return null;
          return (
            <div className="mb-4 sm:mb-6" style={{ backgroundColor: "#FAF9F7" }}>
              <div className="w-full py-4 relative">
                {/* <div className="absolute top-4 right-4 z-10">
                <Button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-white/80 hover:bg-white text-gray-700 border border-gray-200 shadow-sm transition-all duration-200 p-2 sm:p-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh data"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div> */}
                <div className="glass-card overflow-hidden">
                  {/* Purple banner — same gradient as before (gradient-bg) */}
                  {/* <div className="gradient-bg p-6 sm:py-8 text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                      <Stethoscope className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready for Your Check-in?</h2>
                    <p className="text-sm opacity-90 leading-relaxed max-w-xl">
                      It&apos;s time to check in with your doctor. Renew your plan below to continue your care.
                    </p>
                  </div>
                </div> */}

                  {/* Purple banner — same gradient as before (gradient-bg) */}
                  <div className="gradient-bg p-6 sm:py-8 text-primary-foreground relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 max-w-4xl mx-auto">
                      {/* First line: Icon and Title */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-left">Ready for Your Check-in?</h2>
                      </div>
                      {/* Second line: Body text centered */}
                      <p className="text-sm opacity-90 leading-relaxed text-center sm:text-left">
                        {/* It&apos;s time to check in with your doctor. Renew your plan below to continue your care. */}
                        Start your refill check-in when you have 7 days of medication remaining. Renew your plan to continue your plan.
                      </p>
                    </div>
                  </div>
                  {/* White HOW IT WORKS section */}
                  <div className="bg-white px-6 py-5 sm:py-6 rounded-b-2xl border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">How it works</h3>
                    <div className="space-y-4">
                      {[
                        "Choose & pay for your next cycle",
                        "Complete your health check-in",
                        "Your doctor reviews & ships your prescription",
                      ].map((label, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-600">
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-800 pt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Check-in/Intake Progress Section */}
        {(() => {
          const sortedProducts = [...products].sort((a, b) => {
            const aDate = getProductLatestDate(a);
            const bDate = getProductLatestDate(b);
            if (aDate && bDate) {
              return new Date(bDate).getTime() - new Date(aDate).getTime();
            }
            return parseInt(b.order_id) - parseInt(a.order_id);
          });
          const latestProduct = sortedProducts[0];

          if (!latestProduct) return null;

          const product = latestProduct;
          const maxCheckins = product.max_checkins || 0;
          const filledCheckins = product.filled_checkins || 0;
          const isSixMonth = maxCheckins === 2;
          const isTwelveMonth = maxCheckins === 4;
          const productDesc = (product.product_description || "").toLowerCase();
          // Exclude bm-4 (3-month), bm-5 (6-month), and bm-6 (12-month) from 1-month plan check
          const isOneMonthPlan = product.is_sub === 0 && product.bm !== 4 && product.bm !== 5 && product.bm !== 6;

          const progressPercentage = maxCheckins > 0 ? (filledCheckins / maxCheckins) * 100 : 0;
          const needsIntakeCompletion = product.is_sub === 0 && product.bm === 3;

          const continuationStampTrimmedRender = product.continuation_stamp ? String(product.continuation_stamp).trim() : "";
          const msg22ContainsContinuationStampRender = !!(product.msg22 && continuationStampTrimmedRender && String(product.msg22).includes(continuationStampTrimmedRender));
          const continuationDateIsNullRender =
            product.continuation_date_utc == null || String(product.continuation_date_utc ?? "").trim() === "";
          const needsContinuationIntakeRender = msg22ContainsContinuationStampRender && continuationDateIsNullRender;

          const getFormUrl = () => {
            // Continuation: when continuation_date_utc is null, need intake → use form_url_new
            if (needsContinuationIntakeRender && product.form_url_new?.trim()) {
              return product.form_url_new.trim();
            }
            // bm === 4, is_sub === 0, msg22 "Next link is continuation" → use form_url_new for check-in
            const msg22ContinuationRender = product.msg22 && /next link is continuation/i.test(String(product.msg22));
            if (product.bm === 4 && product.is_sub === 0 && msg22ContinuationRender && product.form_url_new?.trim()) {
              return product.form_url_new.trim();
            }
            if (needsIntakeCompletion) {
              // bm === 3 plan: use form_url_new when it has a value, else form_url
              if (product.bm === 3 && product.form_url_new != null && product.form_url_new.trim() !== "") {
                return product.form_url_new;
              }
              return product.form_url || null;
            }
            if (product.stage === "RECORDED" || product.stage === "NEW") return product.form_url || null;
            return product.form_url_new || null;
          };
          const formUrl = getFormUrl();
          const isFormAvailable = formUrl && formUrl.trim() !== "";

          const extractDosage = (productName: string): string => {
            const dosageMatch = productName.match(/(\d+\.?\d*)\s*mg/i);
            return dosageMatch ? `${dosageMatch[1]}mg` : productName;
          };

          // is_sub === 0 && bm === 3: 1 Month, 0% progress; when form_url_new has value show "Check-in" not "Intake"
          // therapy_group === "CHECKIN" && is_sub === 0 && form_url_new === "": show 50% and "Need to wait for check in"
          const isBm3Sub0 = product.bm === 3 && product.is_sub === 0;
          const isCheckinWaitingForForm =
            product.therapy_group === "CHECKIN" &&
            product.is_sub === 0 &&
            (!product.form_url_new || String(product.form_url_new).trim() === "");
          if (isBm3Sub0) {
            const orderIdBm3Sub0 = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";
            const useCheckInLabel = !!(product.form_url_new != null && product.form_url_new.trim() !== "");
            const step1Title = useCheckInLabel ? "Check-in" : "Initial Intake";
            const step1Description = useCheckInLabel ? "Complete your health check-in" : "Complete health intake form";
            const step1ButtonLabel = useCheckInLabel ? "Start Check-in" : "Start Intake";
            const showWaitingState = isCheckinWaitingForForm;
            const displayProgress = showWaitingState ? 50 : 0;

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "1 Month"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "1",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Step 1: Initial Intake / Check-in */}
                    <div className={`rounded-2xl border-2 p-4 shadow-sm ${showWaitingState ? "bg-green-50 border-green-200" : "bg-white border-primary-400"}`}>
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${showWaitingState ? "bg-green-500 text-white" : "bg-primary-600 text-white"}`}>
                          {showWaitingState ? <CheckCircle className="w-6 h-6" /> : 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">1st Visit</p>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">
                            {showWaitingState ? "Initial Intake Completed" : step1Title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-1">
                            {showWaitingState ? "Need to wait for check in." : step1Description}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdBm3Sub0}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                          {!showWaitingState && (
                            <div className="mt-3 pt-3 border-t border-primary-100">
                              <Button
                                onClick={() => handleFormClick(product)}
                                disabled={loadingButtons.has(product.order_id) || !isFormAvailable}
                                className={`w-full ${isFormAvailable && !loadingButtons.has(product.order_id) ? "bg-primary-600 hover:bg-primary-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"} py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2`}
                              >
                                {loadingButtons.has(product.order_id) ? "Loading..." : step1ButtonLabel}
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {showWaitingState && (
                            <>
                              <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800">
                                Waiting for check-in
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Step 2: Monthly Check-in - locked */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-gray-200 text-gray-700">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">2nd Visit</p>
                          <h4 className="text-lg font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                            Monthly Check-in
                            <Lock className="w-4 h-4 text-gray-400" />
                          </h4>
                          <p className="text-sm text-gray-600">Health check-in with your doctor</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // BM 5 with is_sub === 0: 6-month plan before first intake — use new stacked cards (don't use 1-month block)
          if (product.bm === 5 && product.is_sub === 0) {
            const orderIdShortBm5Sub0 = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "6 Months"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "6",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="rounded-2xl border-2 border-primary-400 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-primary-600 text-white">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">1st Visit</p>
                          <h4 className="text-lg font-bold text-primary-900 mb-1">Initial Intake</h4>
                          <p className="text-sm text-gray-600 mb-1">Complete health intake form</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdShortBm5Sub0}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                          <div className="mt-4 pt-3 border-t border-primary-100">
                            <Button
                              onClick={() => handleFormClick(product)}
                              disabled={loadingButtons.has(product.order_id) || !isFormAvailable}
                              className={`w-full ${isFormAvailable && !loadingButtons.has(product.order_id) ? "bg-primary-600 hover:bg-primary-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"} py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2`}
                            >
                              {loadingButtons.has(product.order_id) ? "Loading..." : "Start Intake"}
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-gray-200 text-gray-700">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">2nd Visit</p>
                          <h4 className="text-lg font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                            3-Month Check-in
                            <Lock className="w-4 h-4 text-gray-400" />
                          </h4>
                          <p className="text-sm text-gray-600">Health check-in with your doctor</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // BM 4 with is_sub === 0: 3-month plan before first intake — use new stacked cards (don't use 1-month block)
          if (product.bm === 4 && product.is_sub === 0) {
            const orderIdShortBm4Sub0 = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";
            const msg22ContinuationBm4 = product.msg22 && /next link is continuation/i.test(String(product.msg22));
            const useCheckInLabelBm4 = !!(msg22ContinuationBm4 && product.form_url_new?.trim());
            const step1TitleBm4 = useCheckInLabelBm4 ? "Check in" : "Initial Intake";
            const step1ButtonLabelBm4 = useCheckInLabelBm4 ? "Check in" : "Start Intake";

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "3 Months"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "3",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Step 1: Initial Intake / Check in - active */}
                    <div className="rounded-2xl border-2 border-primary-400 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-primary-600 text-white">
                          1
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">1st Visit</p>
                          <h4 className="text-lg font-bold text-primary-900 mb-1">{step1TitleBm4}</h4>
                          <p className="text-sm text-gray-600 mb-1">{useCheckInLabelBm4 ? "Complete your health check-in" : "Complete health intake form"}</p>
                          {!useCheckInLabelBm4 && (
                            <button
                              type="button"
                              onClick={() => navigate(`/orders/${product.order_id}`)}
                              className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                            >

                              <span className="text-gray-500">{orderIdShortBm4Sub0}</span>
                              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                            </button>
                          )}
                          <div className="mt-4 pt-3 border-t border-primary-100">
                            <Button
                              onClick={() => handleFormClick(product)}
                              disabled={loadingButtons.has(product.order_id) || !isFormAvailable}
                              className={`w-full ${isFormAvailable && !loadingButtons.has(product.order_id) ? "bg-primary-600 hover:bg-primary-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"} py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2`}
                            >
                              {loadingButtons.has(product.order_id) ? "Loading..." : step1ButtonLabelBm4}
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Step 2: 3-Month Check-in - locked */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-gray-200 text-gray-700">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">2nd Visit</p>
                          <h4 className="text-lg font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                            3-Month Check-in
                            <Lock className="w-4 h-4 text-gray-400" />
                          </h4>
                          <p className="text-sm text-gray-600">Health check-in with your doctor</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 1-Month plan view (is_sub === 0 and product_description contains "1 months")
          if (isOneMonthPlan) {
            const oneMonthFilled = product.filled_checkins ?? 0;
            const oneMonthProgress = Math.min(100, (oneMonthFilled / 2) * 100);
            const intakeCompleted = oneMonthFilled >= 1;
            const orderIdShortOne = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";
            const formatDateOne = (d: Date) =>
              d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "1 Month"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "1",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="relative mt-4">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
                      <div
                        className="absolute top-0 left-0 w-full bg-primary-600 transition-all duration-500"
                        style={{ height: `${oneMonthProgress}%` }}
                      />
                    </div>
                    <div className="space-y-0">
                      {/* Step 1: Initial Intake */}
                      <div className="relative flex items-start gap-3 pb-4">
                        <div className={`relative z-10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-md ${intakeCompleted ? "bg-primary-600" : "bg-gray-300"}`}>
                          {intakeCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : <Pill className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 mb-0.5">Initial Intake</h4>
                              <p className="text-xs text-gray-600 mb-1">Complete health intake form</p>
                              <button
                                type="button"
                                onClick={() => navigate(`/orders/${product.order_id}`)}
                                className="flex items-center gap-2 text-xs text-gray-700 hover:text-primary-600 mt-1"
                              >

                                <span className="text-gray-500">{orderIdShortOne}</span>
                                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                              </button>
                            </div>
                            {!intakeCompleted && (
                              <Button
                                onClick={() => handleFormClick(product)}
                                disabled={loadingButtons.has(product.order_id) || !isFormAvailable}
                                className={`${isFormAvailable && !loadingButtons.has(product.order_id) ? "bg-primary-600 hover:bg-primary-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"} px-4 py-2 rounded-lg text-xs font-medium flex-shrink-0`}
                              >
                                {loadingButtons.has(product.order_id) ? "Loading..." : "Start Intake"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Step 2: Monthly Check-in */}
                      <div className="relative flex items-start gap-3">
                        <div className="relative z-10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-md bg-gray-300">
                          <Pill className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 mb-0.5">Monthly Check-in</h4>
                              <p className="text-xs text-gray-600 mb-1">Health check-in with your doctor</p>
                              <button
                                type="button"
                                onClick={() => navigate(`/orders/${product.order_id}`)}
                                className="flex items-center gap-2 text-xs text-gray-700 hover:text-primary-600 mt-1"
                              >

                                <span className="text-gray-500">{orderIdShortOne}</span>
                                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                              </button>
                              <p className="text-xs text-gray-600 mt-1.5">Month 1</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                Payment Required
                              </span>
                              <Button
                                onClick={() => {
                                  const email = (product.email || storage.getUserData()?.email) ?? "";
                                  const orderId = product.order_id ?? "";
                                  // trackRefillClick({
                                  //   ...PAY_CHECKIN_WEBHOOK,
                                  //   email,
                                  //   order_id: orderId,
                                  //   message: `payment process started - ${orderId}`,
                                  // });
                                  payCheckInClickedNoStripeRef.current = { email, order_id: orderId };
                                  startPayCheckIn20MinTimer(email);
                                  // callPayCheckInWebhook(email);
                                  handleFormClick(product);
                                }}
                                disabled={loadingButtons.has(product.order_id) || !isFormAvailable || (modalState.isOpen && modalState.orderId === product.order_id)}
                                className={`${isFormAvailable && !loadingButtons.has(product.order_id) && !(modalState.isOpen && modalState.orderId === product.order_id)
                                  ? "bg-primary-600 hover:bg-primary-700 text-white"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  } px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5`}
                              >
                                {loadingButtons.has(product.order_id) ? (
                                  "Loading..."
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4" />
                                    Pay & Check-in
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // bm === 3 && is_sub >= 1: after Pay & Check-in click, hide this section and show "Start Your Plan" primary card
          // Handles both is_sub === 1 and is_sub === 2 (and other values >= 1)
          const isBm3SubGreaterThan0 = product.bm === 3 && product.is_sub >= 1;
          if (isBm3SubGreaterThan0 && showStartYourPlanAfterPayCheckIn) return null;
          if (isBm3SubGreaterThan0) {
            const orderIdShortBm3 = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";
            const formatDateBm3 = (d: Date) =>
              d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const bm3Progress = 50; // 1 of 2 steps (Initial Intake done)

            // Check if order date is less than 20 days old and calculate days remaining
            const orderDateCheck = (() => {
              const orderDateStr = getProductOrderDate(product);
              if (!orderDateStr) return { isLessThan20Days: false, daysRemaining: 0 };
              try {
                const orderDate = new Date(orderDateStr);
                if (isNaN(orderDate.getTime())) return { isLessThan20Days: false, daysRemaining: 0 };
                const today = new Date();
                const diffTime = today.getTime() - orderDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const daysRemaining = 20 - diffDays;
                return {
                  isLessThan20Days: diffDays < 20,
                  daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                };
              } catch {
                return { isLessThan20Days: false, daysRemaining: 0 };
              }
            })();
            const isOrderLessThan20Days = orderDateCheck.isLessThan20Days;
            const daysRemaining = orderDateCheck.daysRemaining;

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "1 Month"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "1",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Step 1: Initial Intake - completed */}
                    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-green-500 text-white">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">1st Visit</p>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">Initial Intake</h4>
                          <p className="text-sm text-gray-600 mb-1">Complete health intake form</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdShortBm3}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Step 2: Monthly Check-in - active, Pay & Check-in */}
                    <div className="rounded-2xl border-2 border-primary-400 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-primary-600 text-white">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">2nd Visit</p>
                          <h4 className="text-lg font-bold text-primary-900 mb-1">Monthly Check-in</h4>
                          <p className="text-sm text-gray-600 mb-1">Health check-in with your doctor</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdShortBm3}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                          <p className="text-sm text-gray-500 mt-1">Month 1</p>
                          <div className="mt-4 pt-3 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center gap-1 w-fit">
                              <Calendar className="w-3.5 h-3.5" />
                              Payment Required
                            </span>
                            {(() => {
                              const userEmailBm3 = (product.email || storage.getUserData()?.email) ?? "";
                              const allowBm3SecondVisitForUser = userEmailBm3 === "johdue3@gmail.com";
                              const disablePayCheckIn = isOrderLessThan20Days && !allowBm3SecondVisitForUser;
                              return disablePayCheckIn ? (
                                <Button
                                  disabled={true}
                                  className="bg-gray-300 text-gray-500 cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                                >
                                  <Calendar className="w-4 h-4" />
                                  Pay & Check-in
                                </Button>
                              ) : (
                              <Button
                                  onClick={() => {
                                    const email = (product.email || storage.getUserData()?.email) ?? "";
                                    const orderId = product.order_id ?? "";
                                    // trackRefillClick({
                                    //   ...PAY_CHECKIN_WEBHOOK,
                                    //   email,
                                    //   order_id: orderId,
                                    //   message: `payment process started - ${orderId}`,
                                    // });
                                    payCheckInClickedNoStripeRef.current = { email, order_id: orderId };
                                    startPayCheckIn20MinTimer(email);
                                    // callPayCheckInWebhook(email);
                                    logRefillPurchase({
                                      event: "pay_checkin_click",
                                      orderId: product.order_id,
                                      email: product.email,
                                      userId: storage.getUserData()?.userId,
                                    });
                                    setShowStartYourPlanAfterPayCheckIn(true);
                                    setShowPlanSelectionForBm3(true);
                                    setTimeout(() => planSelectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                                  }}
                                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                                >
                                  <Calendar className="w-4 h-4" />
                                  Pay & Check-in
                                </Button>
                               );
                            })()} 
                          </div>
                          {isOrderLessThan20Days && ((product.email || storage.getUserData()?.email) ?? "") !== "johdue3@gmail.com" && daysRemaining > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-amber-600 font-medium">
                                Please wait {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} for your next check-in.
                              </p>
                              <p className="text-xs text-amber-600">
                                If you still can't get your Check-in active, please contact{" "}
                                <a
                                  href={`mailto:${(import.meta.env.VITE_SUPPORT_EMAIL as string) || "support@idunrx.com"}`}
                                  className="underline font-medium text-blue-700"
                                >
                                  {(import.meta.env.VITE_SUPPORT_EMAIL as string) || "support@idunrx.com"}
                                </a>
                                .
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // bm === 4 && is_sub >= 1: after Pay & Check-in click, hide this section and show "Start Your Plan" primary card
          // Handles both is_sub === 1 and is_sub === 2 (and other values >= 1) for 3-month orders
          const isBm4SubGreaterThan0 = product.bm === 4 && product.is_sub >= 1;
          if (isBm4SubGreaterThan0 && (showStartYourPlanAfterPayCheckIn || showPlanSelectionForBm4)) return null;
          if (isBm4SubGreaterThan0) {
            const orderIdShortBm4 = product.order_id ? `ORD-${product.order_id.slice(-8).toUpperCase()}` : "";
            const formatDateBm4 = (d: Date) =>
              d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const bm4Progress = 50; // 1 of 2 steps (Initial Intake done)

            // Check if order date is less than 80 days old and calculate days remaining (3-month orders)
            const orderDateCheckBm4 = (() => {
              const orderDateStr = getProductOrderDate(product);
              if (!orderDateStr) return { isLessThan80Days: false, daysRemaining: 0 };
              try {
                const orderDate = new Date(orderDateStr);
                if (isNaN(orderDate.getTime())) return { isLessThan80Days: false, daysRemaining: 0 };
                const today = new Date();
                const diffTime = today.getTime() - orderDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const daysRemaining = 80 - diffDays;
                return {
                  isLessThan80Days: diffDays < 80,
                  daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                };
              } catch {
                return { isLessThan80Days: false, daysRemaining: 0 };
              }
            })();
            const isOrderLessThan80Days = orderDateCheckBm4.isLessThan80Days;
            const daysRemainingBm4 = orderDateCheckBm4.daysRemaining;

            return (
              <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                          CURRENT PLAN
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{product.product_name || "3 Months"}</h3>
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        {(product.product_category_name || product.product_description) && (
                          <p className="text-sm text-gray-600 mt-1">
                            {product.product_category_name || product.product_description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScheduleHelpModal({
                          isOpen: true,
                          planType: "3",
                          orderDate: getProductOrderDate(product),
                        })}
                        className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                      >
                        Help with Check-in Schedule
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Step 1: Initial Intake - completed */}
                    <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-green-500 text-white">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">1st Visit</p>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">Initial Intake</h4>
                          <p className="text-sm text-gray-600 mb-1">Complete health intake form</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdShortBm4}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Step 2: 3-Month Check-in - active, Pay & Check-in */}
                    <div className="rounded-2xl border-2 border-primary-400 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold bg-primary-600 text-white">
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-500 mb-0.5">2nd Visit</p>
                          <h4 className="text-lg font-bold text-primary-900 mb-1">3-Month Check-in</h4>
                          <p className="text-sm text-gray-600 mb-1">Health check-in with your doctor</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${product.order_id}`)}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
                          >

                            <span className="text-gray-500">{orderIdShortBm4}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                          <p className="text-sm text-gray-500 mt-1">Month 3</p>
                          <div className="mt-4 pt-3 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center gap-1 w-fit">
                              <Calendar className="w-3.5 h-3.5" />
                              Payment Required
                            </span>
                            <Button
                              onClick={() => {
                                const email = (product.email || storage.getUserData()?.email) ?? "";
                                const orderId = product.order_id ?? "";
                                // trackRefillClick({
                                //   ...PAY_CHECKIN_WEBHOOK,
                                //   email,
                                //   order_id: orderId,
                                //   message: `payment process started - ${orderId}`,
                                // });
                                payCheckInClickedNoStripeRef.current = { email, order_id: orderId };
                                startPayCheckIn20MinTimer(email);
                                // callPayCheckInWebhook(email);
                                logRefillPurchase({
                                  event: "pay_checkin_click",
                                  orderId: product.order_id,
                                  email: product.email,
                                  userId: storage.getUserData()?.userId,
                                });
                                setShowStartYourPlanAfterPayCheckIn(true);
                                setShowPlanSelectionForBm4(true);
                                setTimeout(() => planSelectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                              }}
                              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <Calendar className="w-4 h-4" />
                              Pay & Check-in
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Check if this is a bm-4 (3-month), bm-5 (6-month), or bm-6 (12-month) order
          const isBm4Order = product.bm === 4;
          const isBm5Order = product.bm === 5; // bm-5 is 6-month order
          const isBm6Order = product.bm === 6; // bm-6 is 12-month order
          const isThreeMonth = isBm4Order; // bm-4 is 3-month order

          // Only show for 6-month, 12-month, 3-month (bm-4), 6-month (bm-5), or 12-month (bm-6) orders
          if (!isSixMonth && !isTwelveMonth && !isThreeMonth && !isBm5Order && !isBm6Order) return null;

          // Define timeline stages
          const getTimelineStages = () => {
            if (isThreeMonth) {
              // 3-Month Order (bm-4) - 2 stages
              return [
                {
                  title: "Initial Intake",
                  description: "Complete health intake form",
                  month: "0-1 Month",
                  checkinIndex: 0,
                  isActive: filledCheckins === 0,
                  isCompleted: filledCheckins >= 1,
                  isLocked: filledCheckins < 0,
                },
                {
                  title: "3-Month Check-in",
                  description: "Health check-in with your doctor",
                  month: "1-3 Months",
                  checkinIndex: 1,
                  isActive: filledCheckins === 1,
                  isCompleted: filledCheckins >= 2,
                  isLocked: filledCheckins < 1,
                },
              ];
            } else if (isSixMonth || isBm5Order) {
              // 6-Month Order (maxCheckins === 2 or bm-5) - 2 stages
              return [
                {
                  title: "Initial Intake",
                  description: "Complete health intake form",
                  month: "0-1 Month",
                  checkinIndex: 0,
                  isActive: filledCheckins === 0,
                  isCompleted: filledCheckins >= 1,
                  isLocked: filledCheckins < 0,
                },
                {
                  title: "3-Month Check-in",
                  description: "Health check-in with your doctor",
                  month: "1-3 Months",
                  checkinIndex: 1,
                  isActive: filledCheckins === 1,
                  isCompleted: filledCheckins >= 2,
                  isLocked: filledCheckins < 1,
                },
              ];
            } else {
              // 12-Month Order (maxCheckins === 4 or bm-6)
              return [
                {
                  title: "Initial Intake",
                  description: "Complete health intake form",
                  month: "0-1 Month",
                  checkinIndex: 0,
                  isActive: filledCheckins === 0,
                  isCompleted: filledCheckins >= 1,
                  isLocked: filledCheckins < 0,
                },
                {
                  title: "3-Month Check-in",
                  description: "Health check-in with your doctor",
                  month: "1-3 Months",
                  checkinIndex: 1,
                  isActive: filledCheckins === 1,
                  isCompleted: filledCheckins >= 2,
                  isLocked: filledCheckins < 1,
                },
                {
                  title: "6-Month Check-in",
                  description: "Health check-in with your doctor",
                  month: "3-6 Months",
                  checkinIndex: 2,
                  isActive: filledCheckins === 2,
                  isCompleted: filledCheckins >= 3,
                  isLocked: filledCheckins < 2,
                },
                {
                  title: "9-Month Check-in",
                  description: "Health check-in with your doctor",
                  month: "6-9 Months",
                  checkinIndex: 3,
                  isActive: filledCheckins === 3,
                  isCompleted: filledCheckins >= 4,
                  isLocked: filledCheckins < 3,
                },
              ];
            }
          };

          const stages = getTimelineStages();
          const medicationDosage = extractDosage(product.product_name || "");
          const orderIdShort = product.order_id?.slice(-8).toUpperCase() || "";

          // Format date for completed stages
          const formatDate = (date: Date): string => {
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          };

          // Get status text for each stage (index-wise: box 0 → intakes_dates[0], box 1 → intakes_dates[1], etc.)
          const getStatusText = (stage: typeof stages[0]) => {
            if (stage.isCompleted) {
              const dateAt = getProductCompletedDateAt(product, stage.checkinIndex);
              if (dateAt) return `Completed ${formatDate(new Date(dateAt))}`;
              return "";
            } else if (stage.isActive) {
              if (stage.checkinIndex === 0) {
                return "Month 1";
              } else if (stage.checkinIndex === 1) {
                return "Month 3";
              } else if (stage.checkinIndex === 2) {
                return "Month 6";
              } else if (stage.checkinIndex === 3) {
                return "Month 9";
              }
            }
            return null;
          };

          // Visit label: 1st Visit, 2nd Visit, etc.
          const getVisitLabel = (index: number) => {
            const n = index + 1;
            if (n === 1) return "1st Visit";
            if (n === 2) return "2nd Visit";
            if (n === 3) return "3rd Visit";
            return `${n}th Visit`;
          };

          // For upcoming stages: next est. date. bm-6: 2nd = 1st+3mo, 3rd = 2nd+3mo, 4th = 3rd+3mo. Others: 2nd ~4mo, then +3mo each.
          const getNextCheckInRange = (upcomingIndex: number): string | null => {
            try {
              if (isBm6Order) {
                // bm-6 (12-month): 3-month gap as 70–85 days from previous step (15-day window)
                let refDate: Date | null = null;
                const prevStepIndex = upcomingIndex - 1;
                const completedAtPrev = getProductCompletedDateAt(product, prevStepIndex);
                if (completedAtPrev) {
                  refDate = new Date(completedAtPrev);
                } else {
                  let lastKnown = getProductCompletedDateAt(product, 0) ?? getProductOrderDate(product);
                  if (!lastKnown) lastKnown = new Date().toISOString().slice(0, 19).replace("T", " ");
                  refDate = new Date(lastKnown);
                  for (let i = 1; i <= prevStepIndex; i++) {
                    refDate.setDate(refDate.getDate() + 70);
                  }
                }
                if (!refDate || isNaN(refDate.getTime())) return null;
                const windowStart = new Date(refDate);
                windowStart.setDate(windowStart.getDate() + 70);
                const windowEnd = new Date(refDate);
                windowEnd.setDate(windowEnd.getDate() + 85);
                return `Next check-in: ${formatDate(windowStart)} - ${formatDate(windowEnd)}`;
              }

              // bm-5 (6-month): next check-in window = order date + 70 days to +85 days
              if (isBm5Order) {
                // For bm-5 we only have one upcoming check-in (3-month), so we ignore upcomingIndex > 1
                const orderDateStr =
                  getProductCompletedDateAt(product, upcomingIndex - 1) ??
                  getProductOrderDate(product) ??
                  new Date().toISOString().slice(0, 19).replace("T", " ");
                const orderDate = new Date(orderDateStr);
                if (isNaN(orderDate.getTime())) return null;
                const windowStart = new Date(orderDate);
                windowStart.setDate(windowStart.getDate() + 70);
                const windowEnd = new Date(windowStart);
                windowEnd.setDate(windowEnd.getDate() + 15);
                return `Next check-in: ${formatDate(windowStart)} - ${formatDate(windowEnd)}`;
              }

              // Non bm-6, non bm-5: base = previous completion, or order date, or today
              const baseRefStr =
                getProductCompletedDateAt(product, upcomingIndex - 1) ??
                getProductOrderDate(product) ??
                new Date().toISOString().slice(0, 19).replace("T", " ");
              const base = new Date(baseRefStr);
              if (isNaN(base.getTime())) return null;

              // 6-month / legacy: 2nd box ~4 months from 1st (116–121 days), then +3 months (92–97) each
              const DAYS_TO_SECOND_WINDOW = 116;
              const DAYS_SECOND_END = 121;
              const DAYS_TO_NEXT_WINDOW = 92;
              const DAYS_NEXT_END = 97;

              let windowStart = new Date(base);
              let windowEnd = new Date(base);
              if (upcomingIndex === 1) {
                windowStart.setDate(windowStart.getDate() + DAYS_TO_SECOND_WINDOW);
                windowEnd.setDate(windowEnd.getDate() + DAYS_SECOND_END);
                return `Next check-in: ${formatDate(windowStart)} - ${formatDate(windowEnd)}`;
              }
              if (upcomingIndex === 2) {
                windowStart.setDate(windowStart.getDate() + DAYS_TO_SECOND_WINDOW + DAYS_TO_NEXT_WINDOW);
                windowEnd.setDate(windowEnd.getDate() + DAYS_TO_SECOND_WINDOW + DAYS_NEXT_END);
                return `Next check-in: ${formatDate(windowStart)} - ${formatDate(windowEnd)}`;
              }
              if (upcomingIndex === 3) {
                windowStart.setDate(windowStart.getDate() + DAYS_TO_SECOND_WINDOW + DAYS_TO_NEXT_WINDOW + DAYS_TO_NEXT_WINDOW);
                windowEnd.setDate(windowEnd.getDate() + DAYS_TO_SECOND_WINDOW + DAYS_TO_NEXT_WINDOW + DAYS_NEXT_END);
                return `Next check-in: ${formatDate(windowStart)} - ${formatDate(windowEnd)}`;
              }
              return null;
            } catch {
              return null;
            }
          };

          return (
            <div className="mb-4 sm:mb-6" data-order-id={product.order_id}>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5">
                {/* Current Plan Section */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        CURRENT PLAN
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                          {product.product_name || (isThreeMonth ? "3 Months" : isSixMonth || isBm5Order ? "6 Months" : isBm6Order || isTwelveMonth ? "12 Months" : "12 Months")}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      </div>
                      {(product.product_category_name || product.product_description) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {product.product_category_name || product.product_description}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setScheduleHelpModal({
                        isOpen: true,
                        planType: isThreeMonth ? "3" : isSixMonth || isBm5Order ? "6" : "12",
                        orderDate: getProductOrderDate(product),
                      })}
                      className="shrink-0 text-sm font-medium text-primary-700 hover:text-primary-800 border-2 border-primary-400 hover:border-primary-500 bg-white px-3 py-2 rounded-lg"
                    >
                      Help with Check-in Schedule
                    </Button>
                  </div>
                </div>

                {/* Visit cards - stacked design (no timeline line) */}
                <div className="space-y-3 mt-4">
                  {stages.map((stage, index) => {
                    const statusText = getStatusText(stage);
                    const isActive = stage.isActive;
                    const isCompleted = stage.isCompleted;
                    const isUpcoming = !isActive && !isCompleted && !stage.isLocked;
                    // Show next check-in date range for any future step (locked or upcoming)
                    const isFutureStep = !isActive && !isCompleted;

                    const cardBg = isActive
                      ? "bg-white border-2 border-primary-400"
                      : isCompleted
                        ? "bg-green-50 border-2 border-green-200"
                        : "bg-white border border-gray-200";

                    const circleBg = isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-700";

                    return (
                      <div
                        key={index}
                        className={`rounded-2xl border p-4 shadow-sm transition-shadow ${cardBg}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${circleBg}`}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 mb-0.5">{getVisitLabel(index)}</p>
                            <h4 className={`text-lg font-bold mb-1 ${isCompleted ? "text-gray-900" : isActive ? "text-primary-900" : "text-gray-700"}`}>{stage.title}</h4>

                            {/* Medication: "Prescribed" for completed, "Current" in primary for active, gray for upcoming */}
                            {(stage.checkinIndex === 0 || !stage.isLocked) && medicationDosage && (
                              <div className={`flex items-center gap-1.5 text-xs mb-1 ${isCompleted ? "text-sky-600" : isActive ? "text-primary-600" : "text-gray-600"}`}>
                                <Pill className={`w-3.5 h-3.5 flex-shrink-0 ${isCompleted ? "text-sky-500" : isActive ? "text-primary-500" : "text-gray-500"}`} />
                                <span>{isCompleted ? `Prescribed: ${medicationDosage}` : `Current: ${medicationDosage}`}</span>
                              </div>
                            )}

                            <p className="text-xs text-gray-500">
                              {isActive ? stage.description : isCompleted ? stage.description : <span className="text-gray-500">Coming up next</span>}
                            </p>

                            {/* Date: "Est. ..." for active/upcoming, "Done on ..." for completed */}
                            {((isFutureStep || (isActive && index >= 1)) && (() => {
                              const rangeText = getNextCheckInRange(index);
                              const useGray = isFutureStep && !isActive;
                              return rangeText ? (
                                <div className={`flex items-start gap-1.5 text-sm mt-1.5 ${useGray ? "text-gray-600" : "text-primary-600"}`}>
                                  <Calendar className={`w-4 h-4 flex-shrink-0 mt-0.5 ${useGray ? "text-gray-500" : "text-primary-500"}`} />
                                  <span>Est. {rangeText.replace(/^Next check-in:\s*/i, "")}</span>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-1.5">
                                  <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
                                  <span className="text-gray-500">Coming up next</span>
                                </div>
                              );
                            })())}
                            {isCompleted && statusText && (() => {
                              // Only show CheckInThankYouBox for 6-month (bm === 5) and 12-month (bm === 6) orders
                              const isBm5OrBm6 = product.bm === 5 || product.bm === 6;
                              if (!isBm5OrBm6) return null;
                              const dateAt = getProductCompletedDateAt(product, stage.checkinIndex);
                              return dateAt ? (
                                <CheckInThankYouBox
                                  completedDate={dateAt}
                                  showRefillMessage={stage.checkinIndex >= 1}
                                  isFirstVisit={stage.checkinIndex === 0}
                                />
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {/* Full-width button at bottom (like design) */}
                        {isActive && (() => {
                          const hasFormIdNew = product.form_id_new != null && product.form_id_new !== "";
                          const continuationLinkEmpty = product.continuation_link == null || product.continuation_link === "";
                          const isGeneratingCheckIn = hasFormIdNew && continuationLinkEmpty && stage.checkinIndex !== 0;

                          // A "check-in" button is anything beyond the first visit, or when this is a long-term/check-in order.
                          const isCheckInButton =
                            stage.checkinIndex > 0 ||
                            product.therapy_group === "CHECKIN";

                          // If backend hasn't provided form_url_new for check-ins yet, block navigation to avoid wrong link.
                          const formUrlNewEmptyForCheckInRaw =
                            isCheckInButton &&
                            (product.form_url_new == null ||
                              String(product.form_url_new).trim() === "");

                          // Allow Check In Now for johdue12@gmail.com on bm:6 2nd Visit even when form_url_new is not yet set
                          const userEmail = (product.email || storage.getUserData()?.email) ?? "";
                          const isBm6SecondVisitAllowCheckIn =
                            product.bm === 6 &&
                            stage.checkinIndex === 1 &&
                            userEmail === "johdue12@gmail.com";
                          const formUrlNewEmptyForCheckIn =
                            formUrlNewEmptyForCheckInRaw && !isBm6SecondVisitAllowCheckIn;
                          const effectiveFormAvailable =
                            isFormAvailable || (isBm6SecondVisitAllowCheckIn && (product.form_url != null && String(product.form_url).trim() !== ""));

                          const isDisabled =
                            loadingButtons.has(product.order_id) ||
                            !effectiveFormAvailable ||
                            isGeneratingCheckIn ||
                            formUrlNewEmptyForCheckIn;

                          return (
                            <div className="mt-4 pt-3 border-t border-primary-100">
                              <Button
                                onClick={() => {
                                  // if (stage.checkinIndex > 0) {
                                  //   trackRefillClick({
                                  //     email:
                                  //       (product.email ||
                                  //         storage.getUserData()?.email) ?? "",
                                  //     order_id: product.order_id ?? "",
                                  //     event_type: "check_in_click",
                                  //     button_name: "Check In Now",
                                  //     page: "Refills",
                                  //   });
                                  // }
                                  handleFormClick(product);
                                }}
                                disabled={isDisabled}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                              >
                                {loadingButtons.has(product.order_id)
                                  ? "Loading..."
                                  : isGeneratingCheckIn
                                    ? "Generating check-in"
                                    : stage.checkinIndex === 0
                                      ? "Start Now"
                                      : "Check In Now"}
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                              {formUrlNewEmptyForCheckIn && (
                                <p className="mt-2 text-xs text-amber-600 font-medium text-center">
                                  Please wait for next check-in. Your form will be available soon.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                        {isBm4Order && stage.isCompleted && stage.checkinIndex === 1 && (
                          <div className="mt-4 pt-3 border-t border-primary-100">
                            <Button
                              onClick={() => {
                                const email = (product.email || storage.getUserData()?.email) ?? "";
                                const orderId = product.order_id ?? "";
                                // trackRefillClick({
                                //   ...PAY_CHECKIN_WEBHOOK,
                                //   email,
                                //   order_id: orderId,
                                //   message: `payment process started - ${orderId}`,
                                // });
                                payCheckInClickedNoStripeRef.current = { email, order_id: orderId };
                                startPayCheckIn20MinTimer(email);
                                // callPayCheckInWebhook(email);
                                logRefillPurchase({
                                  event: "pay_checkin_click",
                                  orderId: product.order_id,
                                  email: product.email,
                                  userId: storage.getUserData()?.userId,
                                });
                                setShowPlanSelectionForBm4(true);
                                setTimeout(() => planSelectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                              }}
                              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              Pay & Check-in
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Order Progress Tracker - Inline on page */}
        {showProgressTracker && (
          <OrderProgressTracker
            isOpen={showProgressTracker}
            newOrderId={progressTrackerOrderId}
            onComplete={() => {
              setShowProgressTracker(false);
              setProgressTrackerOrderId(undefined);
              // Navigate to dashboard to see the check-in
              navigate("/dashboard");
            }}
            onClose={() => {
              setShowProgressTracker(false);
              setProgressTrackerOrderId(undefined);
            }}
          />
        )}

        {/* Past Check-ins Section - Using Completed Orders */}
        {/* {(() => {
        const completedCheckIns = allProducts.filter(
          (p) => p.stage === "RECORDED" || p.stage === "NEW"
        );

        return completedCheckIns.length > 0 ? (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-primary-600" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Past Check-ins
                </h3>
              </div>
              <div className="space-y-4">
                {completedCheckIns.slice(0, 5).map((checkIn) => {
                  const date = checkIn.time
                    ? new Date(checkIn.time).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                    : "Date not available";

                  return (
                    <div
                      key={checkIn.order_id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {date}
                          </span>
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            Completed
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {checkIn.product_name || "Check-in completed"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null;
      })()} */}

        {/* Responsive Step-by-Step Workflow Cards */}
        <div className="space-y-4 sm:space-y-5">
          {(() => {
            // Show only the latest order for better UX
            // Sort by latest intake date (most recent first) or order_id (highest first) and take the first one
            const sortedProducts = [...products].sort((a, b) => {
              const aDate = getProductLatestDate(a);
              const bDate = getProductLatestDate(b);
              if (aDate && bDate) {
                return new Date(bDate).getTime() - new Date(aDate).getTime();
              }
              return parseInt(b.order_id) - parseInt(a.order_id);
            });
            const latestProduct = sortedProducts[0];

            // If no products, return null
            if (!latestProduct) return null;

            const product = latestProduct;

            // Continuation: msg22 must contain continuation_stamp. If continuation_date_utc null → need intake; if set → show plan selection + thank you
            const continuationStampTrimmedCard = product.continuation_stamp ? String(product.continuation_stamp).trim() : "";
            const msg22ContainsContinuationStampCard = !!(product.msg22 && continuationStampTrimmedCard && String(product.msg22).includes(continuationStampTrimmedCard));
            const continuationDateIsNullCard =
              product.continuation_date_utc == null || String(product.continuation_date_utc ?? "").trim() === "";
            const needsContinuationIntakeCard = msg22ContainsContinuationStampCard && continuationDateIsNullCard;
            const continuationSubmittedCard = msg22ContainsContinuationStampCard && !continuationDateIsNullCard;

            // When bm === 3: hide plan selection by default; show only after Pay & Check-in button is clicked
            if (product.bm === 3 && !showPlanSelectionForBm3) return null;
            // When bm === 4: hide plan selection by default; show after Pay & Check-in
            if (product.bm === 4 && !showPlanSelectionForBm4) return null;
            // bm === 6 (12-month): do not show "Choose Your Plan" card flow on Refills
            if (product.bm === 6) return null;

            const index = 0;
            const productName = product.product_name || "";
            const isWeightLoss = isWeightLossProductName(productName);
            const selectedProduct = selectedRefillProducts[product.order_id];
            const paymentMethod = selectedPaymentMethod[product.order_id];

            // Long-term/check-in orders (some bm:6 come with interval_days === 82)
            const isLongTermOrder =
              product.interval_days === 90 ||
              product.bm === 6 ||
              product.max_checkins === 4;

            // Check if this order needs intake completion (is_sub === 0)
            // This is the same logic used in CheckInForms component
            const needsIntakeCompletion = product.is_sub === 0;

            // Check completion states
            // Check-in completed: is_sub === 1 AND form_url_new === "" (empty string)
            // This means the form_url_new field exists but is an empty string
            const isCheckInCompleted =
              product.is_sub === 1 &&
              product.form_url_new === "";

            // Intake completed: is_sub === 1 AND form_url_new is not present/null 
            // AND form_id_new is not present/null AND interval_days === 90
            // Note: "not getting" means the field is null or undefined (not present in response)
            // Empty string "" is different - that indicates check-in completed
            const formUrlNewNotPresent =
              product.form_url_new === null ||
              product.form_url_new === undefined;
            const formIdNewNotPresent =
              product.form_id_new === null ||
              product.form_id_new === undefined;

            const isIntakeCompleted =
              product.is_sub === 1 &&
              formUrlNewNotPresent &&
              formIdNewNotPresent &&
              product.interval_days === 90 &&
              !isCheckInCompleted; // Don't show intake completed if check-in is already completed

            // For bm-4 orders: check if intake/check-in is completed
            // bm-4 orders are completed when is_sub === 1 and form_url_new === "" (check-in completed)
            // OR when is_sub === 1 and form_url_new/form_id_new are null/undefined (intake completed)
            const isBm4Order = product.bm === 4;
            const isBm4Completed = isBm4Order && (
              isCheckInCompleted || // form_url_new === ""
              (product.is_sub === 1 && formUrlNewNotPresent && formIdNewNotPresent) // intake completed
            );

            // Check if form button should be disabled
            // Continuation intake: enable when form_url_new is set
            // For is_sub === 0 (intake completion), button should be enabled if form_url exists
            // For check-in orders (interval_days === 90), disable if form_url_new and form_id_new are empty
            const isFormButtonDisabled = needsContinuationIntakeCard
              ? !product.form_url_new || product.form_url_new.trim() === ""
              : needsIntakeCompletion
                ? !product.form_url || product.form_url.trim() === ""
                : // For check-in orders, disable if form_url_new and form_id_new are empty
                (product.form_url_new === "" && product.form_id_new === "") ||
                // If stage is not RECORDED or NEW and form_url_new is null/empty, disable
                (product.stage &&
                  product.stage !== "RECORDED" &&
                  product.stage !== "NEW" &&
                  (!product.form_url_new || product.form_url_new === ""));

            // Determine current step
            let currentStep = 1;
            if (isWeightLoss && !isLongTermOrder && !needsIntakeCompletion) {
              // Step 1: Product Selection (always shown)
              currentStep = 1;
              if (selectedProduct) {
                // Step 2: Payment Method
                currentStep = 2;
                if (paymentMethod) {
                  // Step 3: Complete
                  currentStep = 3;
                }
              }
            }

            return (
              <div
                ref={planSelectionSectionRef}
                key={`${product.order_id}-${product.product_id}`}
                className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Minimal Card Header with Product Info - compact */}
                <div className="bg-white px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        LATEST ORDER
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                          {product.product_name}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200 whitespace-nowrap flex-shrink-0">
                          {product.product_category_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Order #{product.order_id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* HOW IT WORKS: hidden by default when bm = 3 or bm = 4; only shown in modal on Pay & Check-in */}
                {isWeightLoss && !isLongTermOrder && !needsIntakeCompletion && product.bm !== 3 && product.bm !== 4 && (
                  <div className="px-4 sm:px-5 py-3 sm:py-4 bg-white border-b border-gray-200">
                    <div className="mb-3 sm:mb-4">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        HOW IT WORKS
                      </h3>
                    </div>
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                      {[1, 2, 3].map((step) => {
                        const isActive = step === currentStep;
                        const isCompleted = step < currentStep;

                        return (
                          <div
                            key={step}
                            className="flex items-center flex-1 min-w-0"
                          >
                            <div className="flex flex-col items-center flex-1 relative w-full">
                              <div
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 ${isActive || isCompleted
                                  ? "bg-primary-600 text-white border-2 border-white shadow-lg"
                                  : "bg-white border-2 border-gray-300 text-gray-400"
                                  }`}
                              >
                                <span>{step}</span>
                              </div>
                              <p
                                className={`text-xs sm:text-sm font-medium mt-2.5 text-center transition-colors leading-tight ${isActive || isCompleted
                                  ? "text-gray-900 font-semibold"
                                  : "text-gray-400"
                                  }`}
                              >
                                {step === 1
                                  ? "Choose Plan"
                                  : step === 2
                                    ? "Pay"
                                    : "Complete"}
                              </p>
                            </div>
                            {step < 3 && (
                              <div
                                className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-all duration-300 min-w-[20px] ${isCompleted
                                  ? "bg-primary-600"
                                  : "bg-gray-200"
                                  }`}
                              ></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Main Content Area - Full Width Layout (compact) */}
                <div className="p-3 sm:p-4">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Clean Prescription Info Section */}
                    {product.prescriptions &&
                      product.prescriptions.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="mb-2">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">
                              Prescribed Medications
                            </h4>
                            <p className="text-xs text-gray-500">
                              Your current medication instructions
                            </p>
                          </div>
                          <div className="space-y-2">
                            {product.prescriptions
                              .slice()
                              .sort((a, b) => {
                                const getNumber = (name: string) => {
                                  const sMatch = name.match(/S(\d+):/);
                                  const tMatch = name.match(/T(\d+):/);
                                  if (sMatch) return parseInt(sMatch[1], 10);
                                  if (tMatch) return parseInt(tMatch[1], 10);
                                  return 999;
                                };
                                return getNumber(a.name) - getNumber(b.name);
                              })
                              .map((prescription, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white rounded-lg p-2.5 sm:p-3 border border-gray-100"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gray-200 text-gray-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-900 font-semibold text-sm mb-1">
                                        {prescription.name.replace(
                                          /^DiRx - /,
                                          ""
                                        )}
                                      </p>
                                      {prescription.directions && (
                                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                                          {prescription.directions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Check-in / Intake Section - only when action needed; Check-in Completed section hidden per design */}
                    {(isLongTermOrder || needsIntakeCompletion) && !isBm4Order && !(isCheckInCompleted || isIntakeCompleted || isBm4Completed) && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-600 text-white">
                              <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">
                                {needsIntakeCompletion
                                  ? "Complete Medical Intake"
                                  : product.filled_checkins === 0
                                    ? "Complete Your Intake"
                                    : product.therapy_group === "CHECKIN" || isLongTermOrder
                                      ? "Complete Your Check-in"
                                      : "Complete Medical Intake"}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {needsIntakeCompletion
                                  ? "Please complete your medical intake to proceed with your medication"
                                  : product.filled_checkins === 0
                                    ? "Please complete your health assessment to continue your care"
                                    : product.therapy_group === "CHECKIN" || isLongTermOrder
                                      ? "Please complete your health assessment to continue your care"
                                      : "Please complete your medical intake to proceed with your medication"}
                              </p>
                            </div>
                          </div>

                          {/* Check-in Info */}
                          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-400 mb-3">
                            <Shield className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-blue-800 text-xs font-medium">
                                Medical Information Required
                              </p>
                              <p className="text-blue-700 text-[11px] mt-0.5">
                                Please complete your health assessment to proceed safely
                              </p>
                            </div>
                          </div>

                          {/* Check-in Button */}
                          {isFormButtonDisabled ? (
                            <div className="space-y-2">
                              <Button
                                disabled={true}
                                className="bg-gray-300 cursor-not-allowed text-gray-500 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 w-full text-sm"
                              >
                                <span>
                                  {needsIntakeCompletion
                                    ? "Complete Medical Intake"
                                    : product.filled_checkins === 0
                                      ? "Start Intake"
                                      : product.therapy_group === "CHECKIN" || isLongTermOrder
                                        ? "Start Check-in"
                                        : "Complete Medical Intake"}
                                </span>
                                <Stethoscope className="w-4 h-4" />
                              </Button>
                              <div className="text-center">
                                <p className="text-xs text-amber-600 font-medium">
                                  {needsIntakeCompletion
                                    ? "Intake form not available"
                                    : "Waiting for next check-in"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {needsIntakeCompletion
                                    ? "Please contact support if you need assistance"
                                    : "Form will be available soon"}
                                </p>
                              </div>
                            </div>
                          ) : (() => {
                            // Check if check-in is being generated (form_id_new exists but continuation_link is null/empty)
                            const hasFormIdNew = product.form_id_new != null && product.form_id_new !== "";
                            const continuationLinkEmpty = product.continuation_link == null || product.continuation_link === "";
                            const isCheckInButton = !needsIntakeCompletion &&
                              ((product.filled_checkins ?? 0) > 0 || product.therapy_group === "CHECKIN" || isLongTermOrder);
                            const isGeneratingCheckIn = hasFormIdNew && continuationLinkEmpty && isCheckInButton;
                            const isDisabled = loadingButtons.has(product.order_id) || isGeneratingCheckIn;

                            return (
                              <Button
                                onClick={() => handleFormClick(product)}
                                disabled={isDisabled}
                                className={`${!isDisabled
                                  ? "bg-primary-600 hover:bg-primary-700"
                                  : "bg-primary-400 cursor-not-allowed"
                                  } text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 w-full text-sm`}
                              >
                                {loadingButtons.has(product.order_id) ? (
                                  <>
                                    <svg
                                      className="animate-spin h-4 w-4 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span className="text-sm sm:text-base">
                                      Loading...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {isGeneratingCheckIn
                                        ? "Generating check-in"
                                        : needsIntakeCompletion
                                          ? "Complete Medical Intake"
                                          : product.filled_checkins === 0
                                            ? "Start Intake"
                                            : product.therapy_group === "CHECKIN" || isLongTermOrder
                                              ? "Start Check-in"
                                              : "Complete Medical Intake"}
                                    </span>
                                    <Stethoscope className="w-4 h-4" />
                                  </>
                                )}
                              </Button>
                            );
                          })()}
                        </>
                      </div>
                    )}

                    {/* Step 1: Product Selection - Choose Your Plan (reference design) */}
                    {isWeightLoss && !isLongTermOrder && !needsIntakeCompletion && (
                      <div className="bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
                        {/* Step indicator row */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-4">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-semibold text-xs sm:text-sm transition-all flex-shrink-0 ${currentStep >= 1 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"}`}
                          >
                            {currentStep > 1 ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : "1"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">Choose Your Plan</h4>
                            <p className="text-xs sm:text-sm text-gray-500">Choose the product that matches your needs</p>
                          </div>
                        </div>

                        {loadingProducts[product.order_id] ? (
                          <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600" />
                          </div>
                        ) : availableWeightLossProducts[product.order_id]?.length > 0 ? (
                          <>
                            {/* Header: Choose Your Plan (calendar) + Save up to X% (sparkle) */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                {/* <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                                <Calendar className="w-4 h-4" />
                              </div> */}
                                {/* <h3 className="text-base sm:text-lg font-bold text-gray-900">Choose Your Plan</h3>
                          */}
                              </div>
                              {(() => {
                                const list = availableWeightLossProducts[product.order_id] || [];
                                const prices = list.map((p) => parseFloat(p.product_price || "0"));
                                const maxPrice = Math.max(...prices, 1);
                                const minPrice = Math.min(...prices);
                                const maxSavePct = maxPrice > 0 ? Math.round(((maxPrice - minPrice) / maxPrice) * 100) : 0;
                                return maxSavePct > 0 ? (
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                                    <span className="font-medium">Save up to 84%</span>
                                  </div>
                                ) : null;
                              })()}
                            </div>

                            {/* Plan options - tabs: Semaglutide | Tirzepatide */}
                            {(() => {
                              const list = availableWeightLossProducts[product.order_id] || [];
                              const semaglutideProducts = list.filter((p) =>
                                isSemaglutideProductName(p.product_name || "")
                              );
                              const tirzepatideProducts = list.filter((p) =>
                                isTirzepatideProductName(p.product_name || "")
                              );
                              const orderKey = String(product.order_id);
                              const activeTab = planTabByOrderId[orderKey] ?? (semaglutideProducts.length > 0 ? "semaglutide" : "tirzepatide");
                              const showTabs = semaglutideProducts.length > 0 && tirzepatideProducts.length > 0;
                              const renderPlanCard = (p: typeof list[0]) => {
                                const isSelected = selectedProduct?.product_id === p.product_id;
                                const price = parseFloat(p.product_price || "0");
                                const orgPrice = p.org_price ? parseFloat(p.org_price) : price * 1.2;
                                const name = p.product_name.toLowerCase();
                                const monthsFromName =
                                  /12\s*month/i.test(name) ? 12 :
                                    /6\s*month/i.test(name) ? 6 :
                                      /3\s*month/i.test(name) ? 3 :
                                        1;
                                const monthlyPrice = price / monthsFromName;
                                const totalSavings = orgPrice - price;
                                const savingsPercent = orgPrice > 0 ? Math.round((totalSavings / orgPrice) * 100) : 0;
                                const sortedByPrice = [...list].sort((a, b) => parseFloat(a.product_price || "0") - parseFloat(b.product_price || "0"));
                                const bestValueProductId = sortedByPrice.length >= 3 ? sortedByPrice[3]?.product_id : null;
                                const isThreeMonthPlan = /3\s*month/i.test(name);
                                const isBestSeller = bestValueProductId === p.product_id || isThreeMonthPlan;
                                return (
                                  <div
                                    key={p.product_id}
                                    onClick={() => {
                                      setSelectedRefillProducts((prev) => ({ ...prev, [product.order_id]: p }));
                                      setSelectedPaymentMethod((prev) => ({ ...prev, [product.order_id]: null }));
                                      setShowPaymentForm((prev) => ({ ...prev, [product.order_id]: false }));
                                      setAppliedCoupons((prev) => ({ ...prev, [product.order_id]: null }));
                                    }}
                                    className={`rounded-xl border-2 p-3 sm:p-4 md:p-5 transition-all cursor-pointer ${isSelected
                                      ? "border-primary-500 bg-primary-50"
                                      : "border-gray-200 bg-white hover:border-gray-300"
                                      }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                      <div className="flex-shrink-0 flex items-start sm:items-center">
                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center mt-0.5 sm:mt-0 ${isSelected
                                          ? "border-primary-600 bg-primary-600"
                                          : "border-gray-300 bg-white"
                                          }`}>
                                          {isSelected && (
                                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white" />
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                          <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 break-words">
                                            {p.product_name}
                                          </h4>
                                          {isBestSeller && (
                                            <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded text-xs font-bold bg-yellow-400 text-black uppercase self-start sm:self-center">
                                              BEST SELLER
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1.5 mb-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* <span className="text-xs sm:text-sm text-gray-500 line-through">
                                              ${Math.round(orgPrice).toLocaleString()}
                                            </span>
                                            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" /> */}
                                            <span className="text-sm sm:text-base font-semibold text-gray-900">
                                              Total ${Math.round(price).toLocaleString()}
                                            </span>
                                          </div>
                                          {totalSavings > 0 && savingsPercent > 0 && (
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700">
                                                Save {savingsPercent}%
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                ${Math.round(totalSavings).toLocaleString()} total savings
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end sm:flex-shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                                        <span className="text-xs sm:hidden text-gray-600 font-medium">Monthly:</span>
                                        <div>
                                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                                            ${Math.round(monthlyPrice).toLocaleString()}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-0.5">/month</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };
                              return (
                                <div className="space-y-4">
                                  {/* Tab buttons - show when both medication types have plans */}
                                  {showTabs && (
                                    <div className="flex rounded-xl bg-primary-100 p-1 border border-primary-200">
                                      <button
                                        type="button"
                                        onClick={() => setPlanTabByOrderId((prev) => ({ ...prev, [orderKey]: "semaglutide" }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === "semaglutide"
                                          ? "bg-primary-600 text-white shadow-sm border border-primary-600"
                                          : "text-primary-700 hover:text-primary-800 hover:bg-primary-50 hover:pr-1"
                                          }`}
                                      >
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${activeTab === "semaglutide" ? "bg-white/20 text-white" : "bg-primary-200 text-primary-700"}`}>S</span>
                                        Semaglutide
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPlanTabByOrderId((prev) => ({ ...prev, [orderKey]: "tirzepatide" }))}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === "tirzepatide"
                                          ? "bg-primary-600 text-white shadow-sm border border-primary-600"
                                          : "text-primary-700 hover:text-primary-800 hover:bg-primary-50 hover:pr-1"
                                          }`}
                                      >
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${activeTab === "tirzepatide" ? "bg-white/20 text-white" : "bg-primary-200 text-primary-700"}`}>T</span>
                                        Tirzepatide
                                      </button>
                                    </div>
                                  )}
                                  {/* Active tab content */}
                                  {activeTab === "semaglutide" && semaglutideProducts.length > 0 && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                                      <div className="flex items-center gap-2 mb-4">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                          <span className="text-emerald-600 font-bold text-sm">S</span>
                                        </div>
                                        <div>
                                          <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                            Semaglutide
                                          </h3>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            Choose your plan below
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-2.5 sm:space-y-3">
                                        {semaglutideProducts.map((p) => renderPlanCard(p))}
                                      </div>
                                    </div>
                                  )}
                                  {activeTab === "tirzepatide" && tirzepatideProducts.length > 0 && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                                      <div className="flex items-center gap-2 mb-4">
                                        <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                                          <span className="text-sky-600 font-bold text-sm">T</span>
                                        </div>
                                        <div>
                                          <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                            Tirzepatide
                                          </h3>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            Choose your plan below
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-2.5 sm:space-y-3">
                                        {tirzepatideProducts.map((p) => renderPlanCard(p))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Footer: payment methods */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-200">
                              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-gray-500 text-center">
                                Apple Pay · Google Pay · Klarna · Card
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-10 sm:py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                              </svg>
                            </div>
                            <p className="text-gray-500 text-sm sm:text-base font-medium">No products available</p>
                            <p className="text-gray-400 text-xs sm:text-sm mt-1">Please check back later</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Payment Method - Responsive */}
                    {isWeightLoss && !isLongTermOrder && !needsIntakeCompletion && selectedProduct && (
                      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-semibold text-xs sm:text-sm transition-all flex-shrink-0 ${currentStep >= 2
                              ? "bg-primary-600 text-white"
                              : "bg-gray-200 text-gray-500"
                              }`}
                          >
                            {currentStep > 2 ? (
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              "2"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1">
                              Fill Payment Information
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500">
                              Secure checkout with Stripe
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                          <RefillCouponBox
                            key={`${product.order_id}-${selectedProduct.product_id}`}
                            productId={selectedProduct.product_id}
                            email={(
                              storage.getUserData()?.email ||
                              product.email ||
                              ""
                            ).trim()}
                            appliedCoupon={appliedCoupons[product.order_id] ?? null}
                            onApplied={(coupon) =>
                              setAppliedCoupons((prev) => ({
                                ...prev,
                                [product.order_id]: coupon,
                              }))
                            }
                            onCleared={() =>
                              setAppliedCoupons((prev) => ({
                                ...prev,
                                [product.order_id]: null,
                              }))
                            }
                          />
                          {appliedCoupons[product.order_id] && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                              <span className="text-gray-600">
                                Original{" "}
                                <span className="line-through">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(
                                    parseFloat(selectedProduct.product_price || "0") || 0,
                                  )}
                                </span>
                              </span>
                              <span className="font-semibold text-gray-900">
                                Due{" "}
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                }).format(
                                  getCouponPayableAmount(
                                    selectedProduct.product_price,
                                    appliedCoupons[product.order_id],
                                  ),
                                )}
                              </span>
                            </div>
                          )}
                        {!paymentMethod &&
                          !showPaymentForm[product.order_id] ? (
                          <div className="grid gap-3 sm:gap-4 grid-cols-1">
                            <button
                              onClick={() =>
                                setShowPaymentForm((prev) => ({
                                  ...prev,
                                  [product.order_id]: true,
                                }))
                              }
                              className="relative p-3 sm:p-4 border border-gray-200 rounded-lg text-left hover:border-primary-400 hover:shadow-sm transition-all duration-200 bg-white"
                            >
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center">
                                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-sm sm:text-base text-gray-900">
                                    Pay with Stripe
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                                    Card, Apple Pay, Google Pay, Klarna
                                  </p>
                                </div>
                              </div>
                            </button>
                          </div>
                        ) : showPaymentForm[product.order_id] &&
                          selectedProduct ? (
                          <div className="p-4 sm:p-5 bg-gray-50 rounded-lg border-2 border-gray-200">
                            <div className="pt-2">
                              <RefillStripePayment
                                key={`${selectedProduct.product_id}-${appliedCoupons[product.order_id]?.code ?? "none"}-${getCouponPayableAmount(selectedProduct.product_price, appliedCoupons[product.order_id])}`}
                                selectedProduct={selectedProduct}
                                currentProduct={product}
                                appliedCoupon={appliedCoupons[product.order_id] ?? null}
                                submitButtonLabel={formatRefillPayButtonLabel(
                                  getCouponPayableAmount(
                                    selectedProduct.product_price ??
                                      product.product_price,
                                    appliedCoupons[product.order_id],
                                  ),
                                )}
                                onSuccess={(response) =>
                                  handleRefillStripeSuccess(
                                    product,
                                    selectedProduct.product_id,
                                    response,
                                    "inline",
                                  )
                                }
                                onCancel={() => {
                                  setShowPaymentForm((prev) => ({
                                    ...prev,
                                    [product.order_id]: false,
                                  }));
                                }}
                              />
                            </div>
                          </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Product Selection Modal */}
        <Modal
          isOpen={productSelectionModal.isOpen}
          onClose={() =>
            setProductSelectionModal({
              isOpen: false,
              products: [],
              isLoading: false,
              currentProduct: null,
            })
          }
          title="Select Your Refill Product"
        >
          <RefillProductSelectionModal
            products={productSelectionModal.products}
            onSelect={handleProductSelection}
            onCancel={() =>
              setProductSelectionModal({
                isOpen: false,
                products: [],
                isLoading: false,
                currentProduct: null,
              })
            }
            isLoading={productSelectionModal.isLoading}
          />
        </Modal>

        {/* Payment Method Selection Modal */}
        <Modal
          isOpen={paymentMethodModal.isOpen}
          onClose={() =>
            setPaymentMethodModal({
              isOpen: false,
              selectedProduct: null,
              currentProduct: null,
            })
          }
          title="Payment Method"
        >
          <PaymentMethodSelectionModal
            hideSameCard={paymentMethodModal.currentProduct?.cc_type === "offline"}
            onSelectSameCard={handleSameCardSelection}
            onSelectNewCard={handleNewCardSelection}
            onCancel={() =>
              setPaymentMethodModal({
                isOpen: false,
                selectedProduct: null,
                currentProduct: null,
              })
            }
          />
        </Modal>

        {/* Stripe Payment Modal for refill (Payment Element → createOrder_stripe) */}
        <Modal
          isOpen={paymentFormModal.isOpen}
          onClose={() =>
            setPaymentFormModal({
              isOpen: false,
              selectedProduct: null,
              currentProduct: null,
            })
          }
          title="Pay for Refill"
        >
          {paymentFormModal.currentProduct && paymentFormModal.selectedProduct ? (
            <div className="space-y-4">
              <RefillCouponBox
                key={`${paymentFormModal.currentProduct.order_id}-${paymentFormModal.selectedProduct.product_id}`}
                productId={paymentFormModal.selectedProduct.product_id}
                email={(
                  storage.getUserData()?.email ||
                  paymentFormModal.currentProduct.email ||
                  ""
                ).trim()}
                appliedCoupon={
                  appliedCoupons[paymentFormModal.currentProduct.order_id] ?? null
                }
                onApplied={(coupon) =>
                  setAppliedCoupons((prev) => ({
                    ...prev,
                    [paymentFormModal.currentProduct!.order_id]: coupon,
                  }))
                }
                onCleared={() =>
                  setAppliedCoupons((prev) => ({
                    ...prev,
                    [paymentFormModal.currentProduct!.order_id]: null,
                  }))
                }
              />
              <RefillStripePayment
                key={`${paymentFormModal.selectedProduct.product_id}-${appliedCoupons[paymentFormModal.currentProduct.order_id]?.code ?? "none"}`}
                selectedProduct={paymentFormModal.selectedProduct}
                currentProduct={paymentFormModal.currentProduct}
                appliedCoupon={
                  appliedCoupons[paymentFormModal.currentProduct.order_id] ?? null
                }
                submitButtonLabel={formatRefillPayButtonLabel(
                  getCouponPayableAmount(
                    paymentFormModal.selectedProduct.product_price,
                    appliedCoupons[paymentFormModal.currentProduct.order_id],
                  ),
                )}
                onSuccess={(response) =>
                  handleRefillStripeSuccess(
                    paymentFormModal.currentProduct!,
                    paymentFormModal.selectedProduct!.product_id,
                    response,
                    "modal",
                  )
                }
                onCancel={() =>
                  setPaymentFormModal({
                    isOpen: false,
                    selectedProduct: null,
                    currentProduct: null,
                  })
                }
              />
            </div>
          ) : null}
        </Modal>

        {/* Form Modal */}
        <FormModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          formUrl={modalState.formUrl}
          orderId={modalState.orderId}
          productId={modalState.productId}
          productName={modalState.productName}
          productCategoryName={modalState.productCategoryName}
          onFormCompleted={handleFormCompleted}
          email={modalState.email}
          firstName={modalState.firstName}
          lastName={modalState.lastName}
          phoneNumber={modalState.phoneNumber}
          stateName={modalState.stateName}
          stateCode={modalState.stateCode}
          intakeFormId={modalState.intakeFormId}
          uniqueId={modalState.uniqueId}
        />

        {/* HOW IT WORKS modal (bm = 3: Pay & Check-in click) */}
        <Modal
          isOpen={showHowItWorksModal}
          onClose={() => setShowHowItWorksModal(false)}
          title="HOW IT WORKS"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Complete your monthly check-in in three simple steps:
            </p>
            <div className="flex items-center justify-between gap-2">
              {[
                { step: 1, label: "Choose Plan" },
                { step: 2, label: "Pay" },
                { step: 3, label: "Complete" },
              ].map(({ step, label }) => (
                <div key={step} className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                    {step}
                  </div>
                  <p className="text-xs font-medium mt-2 text-gray-900 text-center">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowHowItWorksModal(false)}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Got it
              </Button>
            </div>
          </div>
        </Modal>

        {/* Refill Guide (Step-by-Step) video modal */}
        <Modal
          isOpen={isRefillGuideVideoOpen}
          onClose={closeRefillGuideVideo}
          title="Refill Guide (Step-by-Step)"
        >
          <div className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                ref={refillGuideVideoRef}
                src={refillGuideStepByStepVideo}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>
            <p className="text-sm text-gray-600">
              Watch this quick guide before your next refill check-in.
            </p>
            <div className="flex justify-end pt-1">
              <Button
                onClick={closeRefillGuideVideo}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Got it
              </Button>
            </div>
          </div>
        </Modal>

        {/* Help with Check-in Schedule modal – plan-based step list */}
        <Modal
          isOpen={scheduleHelpModal.isOpen}
          onClose={() => setScheduleHelpModal({ isOpen: false, planType: null })}
          title={scheduleHelpModal.planType ? SCHEDULE_BY_PLAN[scheduleHelpModal.planType].title : "Your Schedule"}
        >
          {scheduleHelpModal.planType && (() => {
            const { steps } = SCHEDULE_BY_PLAN[scheduleHelpModal.planType!];
            const orderDate = scheduleHelpModal.orderDate ?? undefined;

            const getStepCardStyle = (index: number) => {
              if (index === 0) return { bg: "bg-green-50", border: "border-green-200", circle: "bg-green-500 text-white" };
              if (index === 1) return { bg: "bg-orange-50", border: "border-orange-200", circle: "bg-orange-500 text-white" };
              if (index === 2) return { bg: "bg-sky-50", border: "border-sky-200", circle: "bg-sky-500 text-white" };
              // Step 4+ use app theme (primary)
              return { bg: "bg-primary-50", border: "border-primary-200", circle: "bg-primary-600 text-white" };
            };

            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Here&apos;s what happens, step by step.</p>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                  {steps.map((step, i) => {
                    const style = getStepCardStyle(i);
                    const dateStr = getStepDateDisplay(orderDate, step);
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border-2 p-4 ${style.bg} ${style.border}`}
                      >
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${style.circle}`}>
                            {i === 0 ? <CheckCircle className="w-6 h-6" /> : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-gray-900">{step.title}</h4>
                            {dateStr && (
                              <div className="flex items-center gap-2 mt-1.5 text-gray-700">
                                <Calendar className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                <span className="text-sm font-semibold">{dateStr}</span>
                              </div>
                            )}
                            <p className="text-sm text-gray-600 mt-1.5">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  💡 All dates are estimates. We&apos;ll remind you before each step.
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setScheduleHelpModal({ isOpen: false, planType: null })}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    Got it
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* Refill Thank You modal (after Stripe return + createOrder) */}
        <Modal
          isOpen={refillOrderSuccessModal.isOpen}
          onClose={() =>
            setRefillOrderSuccessModal({ isOpen: false, orderId: null })
          }
          title="Thank You!"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Your refill order has been placed successfully.
                </p>
                <p className="text-sm text-green-800 mt-1">
                  Thank you for your payment.
                </p>
                {refillOrderSuccessModal.orderId && (
                  <p className="text-xl font-semibold text-primary-900 mt-2">
                    Order ID:{" "}
                    <span className="font-semibold bg-green-100 px-2 py-0.5 rounded">
                      {refillOrderSuccessModal.orderId}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setRefillOrderSuccessModal({ isOpen: false, orderId: null });
                  window.location.reload();
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        </Modal>

        {/* Process Order Result Modal */}
        <Modal
          isOpen={processOrderResult.isOpen}
          onClose={() =>
            setProcessOrderResult({
              isOpen: false,
              type: null,
              message: "",
              details: "",
              newOrderId: "",
            })
          }
          title={
            processOrderResult.type === "success"
              ? "Order Processed Successfully"
              : "Order Processing Failed"
          }
        >
          <div className="space-y-4">
            {/* Icon and Message */}
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${processOrderResult.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
                }`}
            >
              <div className="flex-shrink-0">
                {processOrderResult.type === "success" ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${processOrderResult.type === "success"
                    ? "text-green-900"
                    : "text-red-900"
                    }`}
                >
                  {processOrderResult.message}
                </p>
                {processOrderResult.details && (
                  <p
                    className={`text-xs mt-2 ${processOrderResult.type === "success"
                      ? "text-green-700"
                      : "text-red-700"
                      }`}
                  >
                    {processOrderResult.details}
                  </p>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  setProcessOrderResult({
                    isOpen: false,
                    type: null,
                    message: "",
                    details: "",
                    newOrderId: "",
                  })
                }
                className={
                  processOrderResult.type === "success"
                    ? "bg-primary-600 hover:bg-primary-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {processOrderResult.type === "success" ? "Continue" : "Close"}
              </Button>
            </div>
          </div>
        </Modal>

      </>
    </div>
  );
}
