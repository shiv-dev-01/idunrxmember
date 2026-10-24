import React, { useState } from 'react';
import { Play, Clock } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

interface Video {
  title: string;
  description: string;
  src: string;
  thumbnail: string;
}

interface VideoListProps {
  videos: Video[];
}

export function VideoList({ videos }: VideoListProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <div 
            key={video.title} 
            className="card group cursor-pointer hover:shadow-md transition-all"
            onClick={() => setSelectedVideo(video)}
          >
            <div className="relative aspect-video rounded-lg overflow-hidden">
              {/* Video Thumbnail */}
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white">5:30</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {video.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      <Modal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title={selectedVideo?.title || ''}
      >
        <div className="space-y-4">
          <div className="aspect-video">
            {selectedVideo && (
              <div className="w-full h-full">
                <iframe
                  src={`${selectedVideo.src}?autoPlay=true`}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
          {selectedVideo?.description && (
            <p className="text-gray-600">{selectedVideo.description}</p>
          )}
        </div>
      </Modal>
    </>
  );
}