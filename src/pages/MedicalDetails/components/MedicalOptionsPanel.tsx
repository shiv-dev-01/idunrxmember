import React, { useState } from 'react';
import { MapPin, CreditCard, CalendarX, Building, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AddressForm } from '../../../components/modals/AddressForm';
import { PaymentForm } from '../../../components/modals/PaymentForm';
import { SkipBillingModal } from '../../../components/modals/SkipBillingModal';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useSubscription } from '../../../hooks/useSubscription';

type ActionButtonProps = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function ActionButton({ icon: Icon, label, onClick, disabled }: ActionButtonProps) {
  const isMobile = useIsMobile();
  
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      fullWidth
      size={isMobile ? 'sm' : 'md'}
      className={`justify-start ${disabled ? 'opacity-50' : ''}`}
    >
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${disabled ? 'text-gray-400' : 'text-primary-500'}`} />
      <span className="text-sm">{label}</span>
    </Button>
  );
}

type ModalType = 'delivery' | 'billing' | 'payment' | 'skip' | null;

export function MedicalOptionsPanel() {
  const isMobile = useIsMobile();
  const subscription = useSubscription();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddressSubmit = (data: any, type: 'delivery' | 'billing') => {
    console.log(`Updating ${type} address:`, data);
    setActiveModal(null);
  };

  const handlePaymentSubmit = (data: any) => {
    console.log('Updating payment details:', data);
    setActiveModal(null);
  };

  const handleSkipBilling = () => {
    console.log('Skipping next billing');
    setActiveModal(null);
  };

  const actions = (
    <div className={`quick-actions ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
      <ActionButton
        icon={MapPin}
        label="Update Delivery Address"
        onClick={() => setActiveModal('delivery')}
      />
      <ActionButton
        icon={Building}
        label="Update Billing Address"
        onClick={() => setActiveModal('billing')}
      />
      <ActionButton
        icon={CalendarX}
        label="Skip Next Billing"
        onClick={() => setActiveModal('skip')}
      />
      <ActionButton
        icon={CreditCard}
        label="Update Payment Details"
        onClick={() => setActiveModal('payment')}
      />
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="bg-white border-t shadow-lg">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between p-4"
          >
            <span className="font-medium">Quick Actions</span>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            )}
          </Button>
          {isExpanded && (
            <div className="p-3 border-t">
              {actions}
            </div>
          )}
        </div>

        <Modal
          isOpen={activeModal === 'delivery'}
          onClose={() => setActiveModal(null)}
          title="Update Delivery Address"
        >
          <AddressForm
            onSubmit={(data) => handleAddressSubmit(data, 'delivery')}
            onCancel={() => setActiveModal(null)}
            type="delivery"
          />
        </Modal>

        <Modal
          isOpen={activeModal === 'billing'}
          onClose={() => setActiveModal(null)}
          title="Update Billing Address"
        >
          <AddressForm
            onSubmit={(data) => handleAddressSubmit(data, 'billing')}
            onCancel={() => setActiveModal(null)}
            type="billing"
          />
        </Modal>

        <Modal
          isOpen={activeModal === 'payment'}
          onClose={() => setActiveModal(null)}
          title="Update Payment Details"
        >
          <PaymentForm
            onSubmit={handlePaymentSubmit}
            onCancel={() => setActiveModal(null)}
          />
        </Modal>

        <Modal
          isOpen={activeModal === 'skip'}
          onClose={() => setActiveModal(null)}
          title="Skip Next Billing"
        >
          <SkipBillingModal
            onConfirm={handleSkipBilling}
            onCancel={() => setActiveModal(null)}
            nextBillingDate={subscription.nextBillingDate}
          />
        </Modal>
      </>
    );
  }
  
  return (
    <>
      {actions}

      <Modal
        isOpen={activeModal === 'delivery'}
        onClose={() => setActiveModal(null)}
        title="Update Delivery Address"
      >
        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, 'delivery')}
          onCancel={() => setActiveModal(null)}
          type="delivery"
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'billing'}
        onClose={() => setActiveModal(null)}
        title="Update Billing Address"
      >
        <AddressForm
          onSubmit={(data) => handleAddressSubmit(data, 'billing')}
          onCancel={() => setActiveModal(null)}
          type="billing"
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
        title="Update Payment Details"
      >
        <PaymentForm
          onSubmit={handlePaymentSubmit}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'skip'}
        onClose={() => setActiveModal(null)}
        title="Skip Next Billing"
      >
        <SkipBillingModal
          onConfirm={handleSkipBilling}
          onCancel={() => setActiveModal(null)}
          nextBillingDate={subscription.nextBillingDate}
        />
      </Modal>
    </>
  );
}