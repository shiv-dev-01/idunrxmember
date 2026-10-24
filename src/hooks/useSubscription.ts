import { useState } from "react";
import type { Subscription } from "../types";
import bottel_img from "../assets/img/bottel_img.png";

export function useSubscription() {
  const [subscription] = useState<Subscription>({
    productName: "Compounded Semaglutide",
    dosage: "0.25 mg/week",
    orderDate: "06-12-2024",
    price: "$0.00",
    nextBillingDate: "Dec 6, 2024",
    imageUrl:bottel_img,
  });

  return subscription;
}
