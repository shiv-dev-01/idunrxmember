import React from "react";
import { ChatBox } from "../../../components/chat/ChatBox";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { Stethoscope } from "lucide-react";

interface ChatSectionProps {
  orderId: string;
  productCategory?: string;
}

// const blockedOrderIds = [
//   "89442",
//   "88921",
//   "88883",
//   "84477",
//   "83948",
//   "83410",
//   "83388",
// ];

export function ChatSection({ orderId, productCategory }: ChatSectionProps) {
  const isMobile = useIsMobile();

  // ❌ Don't render chat if the orderId is blocked
  // if (blockedOrderIds.includes(orderId)) {
  //   return (
  //     <>
  //       <div
  //         className={`
  //     card flex flex-col transition-all duration-300 relative`}
  //       >
  //         <div className="flex-1 overflow-hidden bg-gray-50">
  //           <div className="flex justify-center items-center py-4 text-gray-500 h-40 md:h-80">
  //             There’s no message yet. The doctor will review it and get back to
  //             you soon.{" "}
  //           </div>
  //         </div>
  //       </div>
  //     </>
  //   );
  // }

  return (
    <div
      className={`
      doctor-chat
      ${isMobile ? "h-[calc(100vh-64px)]" : ""}
    `}
    >
      <ChatBox
        title={`Order #${orderId} Support`}
        placeholder="Ask a question about your order..."
        productCategory={productCategory}
      />
    </div>
  );
}
