import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate a more pleasant melody programmatically
  const generateMelody = (): string => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = context.sampleRate;
      const duration = 8; // 8 seconds
      const length = sampleRate * duration;
      const buffer = context.createBuffer(2, length, sampleRate);
      
      // Cute kawaii melody notes - higher pitched and more cheerful
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // C5, D5, E5, F5, G5, A5, B5, C6
      // Multiple cute melody patterns
      const melodyPatterns = [
        [0, 2, 4, 2, 6, 4, 2, 0, 1, 3, 5, 3, 7, 5, 3, 0], // Happy bounce
        [0, 4, 2, 6, 4, 0, 3, 5, 7, 5, 3, 1, 4, 2, 0], // Dreamy
        [2, 4, 6, 7, 6, 4, 2, 0, 3, 5, 7, 5, 3, 1, 2, 4], // Playful
        [0, 2, 4, 6, 7, 6, 4, 2, 5, 7, 5, 3, 1, 3, 5, 0], // Kawaii
      ];
      const melody = melodyPatterns[Math.floor(Math.random() * melodyPatterns.length)];
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        
        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const noteIndex = Math.floor((time * 2) % melody.length);
          const frequency = notes[melody[noteIndex]];
          
          // Create a cute, bell-like tone (more kawaii)
          const fundamental = Math.sin(2 * Math.PI * frequency * time);
          const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.4;
          const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * time) * 0.2;
          const softening = Math.sin(2 * Math.PI * frequency * 0.5 * time) * 0.1; // Add softness
          
          let sample = (fundamental + harmonic2 + harmonic3 + softening) * 0.25;
          
          // Add cute bounce effect
          const noteTime = (time * 1.5) % 1;
          const envelope = noteTime < 0.05 ? noteTime * 20 : 
                          noteTime < 0.15 ? 1 :
                          noteTime > 0.85 ? (1 - noteTime) * 6.67 : 0.8;
          
          sample *= envelope;
          
          // Overall fade in/out
          const fadeTime = 0.5;
          if (time < fadeTime) {
            sample *= time / fadeTime;
          } else if (time > duration - fadeTime) {
            sample *= (duration - time) / fadeTime;
          }
          
          channelData[i] = sample;
        }
      }
      
      // Convert to WAV blob URL
      const wav = audioBufferToWav(buffer);
      return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    } catch (error) {
      console.log("Could not generate melody:", error);
      // Fallback to a simple pleasant tone
      return "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGURCjeL0fPTgC4DJ27A7+OZURE=";
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const [audioSrc, setAudioSrc] = useState<string>("");

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.15;
      
      // Generate cute melody
      const melody = generateMelody();
      setAudioSrc(melody);
      audioRef.current.src = melody;
      setAudioReady(true);
    }
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current && audioReady) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.log("Audio play failed:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const regenerateMusic = () => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.pause();
      setIsPlaying(false);
      setAudioReady(false);
      
      setTimeout(() => {
        const melody = generateMelody();
        setAudioSrc(melody);
        if (audioRef.current) {
          audioRef.current.src = melody;
          setAudioReady(true);
          if (wasPlaying) {
            audioRef.current.play().catch((error) => {
              console.log("Audio play failed:", error);
            });
          }
        }
      }, 100);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm max-w-md mx-auto shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-600">🎵 Background Music</h3>
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
              variant="ghost"
              size="sm"
              onClick={regenerateMusic}
              disabled={!audioReady}
              className="text-purple-500 hover:text-purple-600 disabled:text-gray-400"
              title="Tạo giai điệu mới"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={togglePlayPause}
              disabled={!audioReady}
              className="bg-pink-500 hover:bg-pink-600 text-white disabled:bg-gray-400"
              size="sm"
            >
              {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {!audioReady ? "Đang tạo..." : isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
        
        <div className="bg-pink-100 rounded-xl p-3">
          <p className="text-sm text-gray-600 mb-2">Now Playing:</p>
          <p className="font-medium text-purple-600">Cute Kawaii Melody 🎶</p>
          <p className="text-xs text-gray-500 mt-1">
            Nhạc gốc tham khảo: <a href="https://youtu.be/n_ZyXuSVQ5Q?si=5--FpbK0_698vPX6" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline">
              Xem trên YouTube
            </a>
          </p>
          <p className="text-xs text-pink-400 mt-1">🌸 Nhạc kawaii tạo tự động - nhấn nút ↻ để đổi giai điệu</p>
          {!audioReady && (
            <p className="text-xs text-blue-400 mt-1">🔄 Đang tạo nhạc kawaii cute...</p>
          )}
          {audioReady && !isPlaying && (
            <p className="text-xs text-green-400 mt-1">✅ Sẵn sàng phát nhạc! Nhấn Play để nghe</p>
          )}
          {isPlaying && (
            <p className="text-xs text-pink-500 mt-1">🎵 Đang phát nhạc kawaii cute với giai điệu ngọt ngào...</p>
          )}
        </div>

        <audio
          ref={audioRef}
          loop
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("Audio error:", e);
            setAudioReady(false);
          }}
          onLoadedData={() => setAudioReady(true)}
          onCanPlay={() => setAudioReady(true)}
        >
          Your browser does not support the audio element.
        </audio>
      </CardContent>
    </Card>
  );
}