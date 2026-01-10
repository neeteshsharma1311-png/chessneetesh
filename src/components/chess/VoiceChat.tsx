import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceChatProps {
  gameId: string;
  currentUserId: string;
  opponentId: string;
  opponentName: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

const VoiceChat: React.FC<VoiceChatProps> = ({
  gameId,
  currentUserId,
  opponentId,
  opponentName,
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Setup signaling channel
  useEffect(() => {
    const channelName = `voice-${gameId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const message = payload as SignalingMessage;
        
        if (message.to !== currentUserId) return;
        
        console.log('Voice: Received signal:', message.type);
        
        if (message.type === 'offer') {
          await handleOffer(message.data as RTCSessionDescriptionInit);
        } else if (message.type === 'answer') {
          await handleAnswer(message.data as RTCSessionDescriptionInit);
        } else if (message.type === 'ice-candidate' && message.data) {
          await handleIceCandidate(message.data as RTCIceCandidateInit);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      cleanup();
    };
  }, [gameId, currentUserId, cleanup]);

  // Send signaling message
  const sendSignal = useCallback(async (message: SignalingMessage) => {
    if (!channelRef.current) return;
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: message,
    });
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          from: currentUserId,
          to: opponentId,
          data: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Voice: Remote track received');
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
        
        // Setup remote audio analyzer
        if (audioContextRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          remoteAnalyserRef.current = analyser;
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Voice: Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
        toast({
          title: "Voice connected!",
          description: `You can now talk with ${opponentName}`,
        });
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentUserId, opponentId, opponentName, sendSignal, toast]);

  // Start voice call
  const startCall = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      localStreamRef.current = stream;
      
      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
      
      // Create peer connection and add tracks
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await sendSignal({
        type: 'offer',
        from: currentUserId,
        to: opponentId,
        data: offer,
      });
      
      console.log('Voice: Offer sent');
    } catch (error) {
      console.error('Voice: Error starting call:', error);
      setIsConnecting(false);
      toast({
        title: "Microphone access denied",
        description: "Please enable microphone access to use voice chat.",
        variant: "destructive",
      });
    }
  }, [isConnecting, isConnected, createPeerConnection, sendSignal, currentUserId, opponentId, toast]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    console.log('Voice: Handling offer');
    setIsConnecting(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      localStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
      
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal({
        type: 'answer',
        from: currentUserId,
        to: opponentId,
        data: answer,
      });
      
      console.log('Voice: Answer sent');
    } catch (error) {
      console.error('Voice: Error handling offer:', error);
      setIsConnecting(false);
      toast({
        title: "Failed to connect",
        description: "Could not establish voice connection.",
        variant: "destructive",
      });
    }
  }, [createPeerConnection, sendSignal, currentUserId, opponentId, toast]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('Voice: Handling answer');
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    cleanup();
    toast({
      title: "Voice disconnected",
      description: "Voice chat ended.",
    });
  }, [cleanup, toast]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isDeafened;
      setIsDeafened(!isDeafened);
    }
  }, [isDeafened]);

  // Audio level visualization
  useEffect(() => {
    if (!isConnected) return;
    
    const updateLevels = () => {
      if (localAnalyserRef.current) {
        const dataArray = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLocalAudioLevel(avg / 255);
      }
      
      if (remoteAnalyserRef.current) {
        const dataArray = new Uint8Array(remoteAnalyserRef.current.frequencyBinCount);
        remoteAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setRemoteAudioLevel(avg / 255);
      }
    };
    
    const interval = setInterval(updateLevels, 100);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Mic className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                {isConnected && !isMuted && (
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-green-500/30"
                    animate={{ scale: [1, 1 + localAudioLevel * 0.5] }}
                    transition={{ duration: 0.1 }}
                  />
                )}
              </div>
              <span className="text-sm font-medium">Voice Chat</span>
              {isConnected && (
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
                  Connected
                </Badge>
              )}
              {isConnecting && (
                <Badge variant="secondary" className="text-xs">
                  Connecting...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Button
                    size="icon"
                    variant={isMuted ? "destructive" : "outline"}
                    className="h-8 w-8"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    size="icon"
                    variant={isDeafened ? "destructive" : "outline"}
                    className="h-8 w-8"
                    onClick={toggleDeafen}
                  >
                    {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={endCall}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={startCall}
                  disabled={isConnecting}
                  className="gap-1"
                >
                  <Phone className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Start Voice'}
                </Button>
              )}
            </div>
          </div>
          
          {isConnected && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>You:</span>
                <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    animate={{ width: `${localAudioLevel * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>{opponentName}:</span>
                <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    animate={{ width: `${remoteAudioLevel * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default VoiceChat;
