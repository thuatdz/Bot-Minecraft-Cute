import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Using YouTube link as iframe for audio extraction (hidden)
  const videoId = "n_ZyXuSVQ5Q";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&enablejsapi=1`;

  useEffect(() => {
    setAudioReady(true);
    
    // Listen for user interaction to enable autoplay
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        // Only auto-start if user hasn't manually controlled yet
        setTimeout(() => {
          setIsPlaying(true);
        }, 500);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  const togglePlayPause = () => {
    const iframe = document.getElementById('background-audio') as HTMLIFrameElement;
    if (iframe && audioReady) {
      // Mark that user has interacted manually
      setHasUserInteracted(true);
      
      try {
        if (isPlaying) {
          // Pause the audio
          iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setIsPlaying(false);
        } else {
          // Play the audio
          iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      } catch (error) {
        console.log("Audio control failed:", error);
      }
    }
  };

  const toggleMute = () => {
    const iframe = document.getElementById('background-audio') as HTMLIFrameElement;
    if (iframe) {
      try {
        if (isMuted) {
          iframe.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          setIsMuted(false);
        } else {
          iframe.contentWindow?.postMessage('{"event":"command","func":"mute","args":""}', '*');
          setIsMuted(true);
        }
      } catch (error) {
        console.log("Volume control failed:", error);
      }
    }
  };

  return (
    <>
      {/* Hidden YouTube iframe for background audio */}
      <iframe
        id="background-audio"
        src={embedUrl}
        style={{
          position: 'fixed',
          top: '-1000px',
          left: '-1000px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title="Background Audio"
      />

      {/* Audio Player Controls */}
      <Card className="bg-white/80 backdrop-blur-sm max-w-md mx-auto shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-600">🎵 Nhạc Nền</h3>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-pink-500 hover:text-pink-600"
                title="Bật/tắt âm thanh"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={togglePlayPause}
                disabled={!audioReady}
                className="bg-pink-500 hover:bg-pink-600 text-white disabled:bg-gray-400"
                size="sm"
              >
                {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {!audioReady ? "Đang tải..." : isPlaying ? "Tạm dừng" : "Phát"}
              </Button>
            </div>
          </div>
          
          <div className="bg-pink-100 rounded-xl p-3">
            <p className="text-sm text-gray-600 mb-2">Đang Phát:</p>
            <p className="font-medium text-purple-600">Nhạc Nền Cute 🎶</p>
            <p className="text-xs text-gray-500 mt-1">
              Nguồn: <a href="https://youtu.be/n_ZyXuSVQ5Q?si=5--FpbK0_698vPX6" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline">
                Xem trên YouTube
              </a>
            </p>
            <p className="text-xs text-pink-400 mt-1">🌸 Âm thanh phát nền tự động khi có tương tác</p>
            {audioReady && !hasUserInteracted && (
              <p className="text-xs text-blue-400 mt-1">👆 Nhấn bất kỳ đâu để kích hoạt âm thanh</p>
            )}
            {audioReady && hasUserInteracted && !isPlaying && (
              <p className="text-xs text-yellow-500 mt-1">⏸️ Nhạc đã tạm dừng - nhấn Phát để tiếp tục</p>
            )}
            {isPlaying && hasUserInteracted && (
              <p className="text-xs text-pink-500 mt-1">🎵 Đang phát nhạc nền...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}