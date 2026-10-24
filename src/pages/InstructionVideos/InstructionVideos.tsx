import React from 'react';
import { VideoList } from './components/VideoList';

const VIDEOS = [
  {
    title: "Getting Started with Your Treatment",
    description: "Learn about your medication and how to get the most from your treatment",
    src: "https://fast.wistia.net/embed/iframe/yigrlcya4v",
    thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Proper Injection Technique",
    description: "Step-by-step guide for safe and effective injection",
    src: "https://fast.wistia.net/embed/iframe/oygwrfrygc",
    thumbnail: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Monthly Progress Check-In",
    description: "How to track and monitor your treatment progress",
    src: "https://fast.wistia.net/embed/iframe/5tswe6u23e",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  },
];

export function InstructionVideos() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">📹 Instruction Videos</h2>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Learn how to use your medication properly with our instructional videos
        </p>
      </div>
      <VideoList videos={VIDEOS} />
    </div>
  );
}