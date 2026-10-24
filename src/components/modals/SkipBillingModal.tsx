import React from 'react';
import { Button } from '../ui/Button';

interface SkipBillingModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  nextBillingDate: string;
}

export function SkipBillingModal({
  onConfirm,
  onCancel,
  nextBillingDate,
}: SkipBillingModalProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Are you sure you want to skip the billing scheduled for {nextBillingDate}?
        Your next billing date will be moved to the following month.
      </p>

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="secondary" onClick={onCancel} size="md">
          Cancel
        </Button>
        <Button onClick={onConfirm} size="md">
          Confirm Skip
        </Button>
      </div>
    </div>
  );
}