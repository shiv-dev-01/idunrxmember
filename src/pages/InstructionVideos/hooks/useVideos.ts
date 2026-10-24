import { useState, useEffect } from 'react';
import type { Video } from '../../../types';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchVideos = () => {
      setTimeout(() => {
        setVideos([
          {
            id: '1',
            title: 'How to Use Your Injection Pen',
            description: 'Step-by-step guide on properly using your medication pen',
            thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800',
            duration: '5:30'
          },
          {
            id: '2',
            title: 'Storage Instructions',
            description: 'Learn how to properly store your medication',
            thumbnail: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&w=800',
            duration: '3:45'
          },
          {
            id: '3',
            title: 'Understanding Side Effects',
            description: 'Important information about potential side effects',
            thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800',
            duration: '7:15'
          }
        ]);
        setIsLoading(false);
      }, 1000);
    };

    fetchVideos();
  }, []);

  return { videos, isLoading };
}