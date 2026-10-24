import { Step } from 'react-joyride';

export const TOUR_STEPS: Step[] = [
  {
    target: '.welcome-section',
    title: '👋 Welcome!',
    content: 'Manage your subscription and medical care all in one place.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.doctor-chat',
    title: '👩‍⚕️ Message Your Doctor',
    content: 'Have secure, private conversations with your healthcare provider. Your medical information is always protected.',
    placement: 'top-start',
    placementBeacon: 'top',
    offset: 20,
  },
  {
    target: '.message-privacy-toggle',
    title: '🔒 Privacy First',
    content: 'Messages are hidden by default. Click here to show or hide them when needed.',
    placement: 'left',
  },
  {
    target: '.quick-actions',
    title: '⚡ Quick Actions',
    content: 'Update your delivery, billing, and subscription settings.',
    placement: 'left',
  }
];