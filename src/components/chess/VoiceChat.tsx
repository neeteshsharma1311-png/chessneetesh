import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceChatProps {
  gameId: string;
  currentUserId: string;
  opponentId: string;
  opponentName: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'ready';
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const isInitiator = useRef(currentUserId < opponentId); // Deterministic initiator

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('VoiceChat: Cleaning up...');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    iceCandidatesQueue.current = [];
    setIsConnected(false);
    setIsConnecting(false);
    setOpponentReady(false);
  }, []);

  // Send signaling message
  const sendSignal = useCallback(async (message: SignalingMessage) => {
    if (!channelRef.current) {
      console.log('VoiceChat: Channel not ready, cannot send signal');
      return;
    }
    
    console.log('VoiceChat: Sending signal:', message.type, 'to:', message.to);
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: message,
      });
    } catch (error) {
      console.error('VoiceChat: Error sending signal:', error);
    }
  }, []);

  // Create peer connection with better ICE handling
  const createPeerConnection = useCallback(async () => {
    console.log('VoiceChat: Creating peer connection...');
    
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('VoiceChat: ICE candidate generated');
        sendSignal({
          type: 'ice-candidate',
          from: currentUserId,
          to: opponentId,
          data: event.candidate.toJSON(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('VoiceChat: ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      } else if (pc.iceConnectionState === 'failed') {
        setConnectionError('Connection failed. Try again.');
        setIsConnecting(false);
        cleanup();
      } else if (pc.iceConnectionState === 'disconnected') {
        // Don't immediately fail, ICE might recover
        console.log('VoiceChat: ICE disconnected, waiting for recovery...');
      }
    };

    pc.ontrack = (event) => {
      console.log('VoiceChat: Remote track received');
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(err => {
          console.log('VoiceChat: Audio play failed (user gesture needed):', err);
        });
        
        // Setup remote audio analyzer
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
        }
        const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        remoteAnalyserRef.current = analyser;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('VoiceChat: Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        toast({
          title: "Voice connected!",
          description: `You can now talk with ${opponentName}`,
        });
      } else if (pc.connectionState === 'failed') {
        setConnectionError('Connection failed. Try again.');
        setIsConnecting(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentUserId, opponentId, opponentName, sendSignal, cleanup, toast]);

  // Process queued ICE candidates
  const processIceCandidates = useCallback(async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return;
    
    console.log('VoiceChat: Processing', iceCandidatesQueue.current.length, 'queued ICE candidates');
    
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('VoiceChat: Error adding queued ICE candidate:', err);
        }
      }
    }
  }, []);

  // Get user media
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      localStreamRef.current = stream;
      
      // Setup audio context for visualization
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
      
      return stream;
    } catch (error) {
      console.error('VoiceChat: Microphone access denied:', error);
      throw error;
    }
  }, []);

  // Start as initiator (create offer)
  const startAsInitiator = useCallback(async () => {
    console.log('VoiceChat: Starting as initiator');
    
    try {
      const stream = await getUserMedia();
      const pc = await createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await sendSignal({
        type: 'offer',
        from: currentUserId,
        to: opponentId,
        data: offer,
      });
      
      console.log('VoiceChat: Offer sent');
    } catch (error) {
      console.error('VoiceChat: Error starting as initiator:', error);
      setConnectionError('Failed to access microphone');
      setIsConnecting(false);
    }
  }, [getUserMedia, createPeerConnection, sendSignal, currentUserId, opponentId]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    console.log('VoiceChat: Handling offer from:', fromUserId);
    
    if (peerConnectionRef.current) {
      console.log('VoiceChat: Already have peer connection, ignoring offer');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      const stream = await getUserMedia();
      const pc = await createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any queued ICE candidates
      await processIceCandidates();
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal({
        type: 'answer',
        from: currentUserId,
        to: fromUserId,
        data: answer,
      });
      
      console.log('VoiceChat: Answer sent');
    } catch (error) {
      console.error('VoiceChat: Error handling offer:', error);
      setConnectionError('Failed to connect');
      setIsConnecting(false);
    }
  }, [getUserMedia, createPeerConnection, processIceCandidates, sendSignal, currentUserId]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('VoiceChat: Handling answer');
    
    if (!peerConnectionRef.current) {
      console.log('VoiceChat: No peer connection for answer');
      return;
    }
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      // Process any queued ICE candidates
      await processIceCandidates();
    } catch (error) {
      console.error('VoiceChat: Error handling answer:', error);
    }
  }, [processIceCandidates]);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) {
      console.log('VoiceChat: Queuing ICE candidate (no peer connection)');
      iceCandidatesQueue.current.push(candidate);
      return;
    }
    
    if (!peerConnectionRef.current.remoteDescription) {
      console.log('VoiceChat: Queuing ICE candidate (no remote description)');
      iceCandidatesQueue.current.push(candidate);
      return;
    }
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('VoiceChat: Error adding ICE candidate:', error);
    }
  }, []);

  // Setup signaling channel
  useEffect(() => {
    const channelName = `voice-${gameId}`;
    console.log('VoiceChat: Setting up channel:', channelName);
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUserId },
      },
    });

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const message = payload as SignalingMessage;
        
        if (message.to !== currentUserId) return;
        
        console.log('VoiceChat: Received signal:', message.type, 'from:', message.from);
        
        if (message.type === 'ready') {
          setOpponentReady(true);
          // If we're initiator and opponent is ready, start the connection
          if (isInitiator.current && isConnecting && !peerConnectionRef.current) {
            await startAsInitiator();
          }
        } else if (message.type === 'offer') {
          await handleOffer(message.data as RTCSessionDescriptionInit, message.from);
        } else if (message.type === 'answer') {
          await handleAnswer(message.data as RTCSessionDescriptionInit);
        } else if (message.type === 'ice-candidate' && message.data) {
          await handleIceCandidate(message.data as RTCIceCandidateInit);
        }
      })
      .subscribe((status) => {
        console.log('VoiceChat: Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsChannelReady(true);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('VoiceChat: Cleaning up channel');
      cleanup();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsChannelReady(false);
    };
  }, [gameId, currentUserId, cleanup, handleOffer, handleAnswer, handleIceCandidate, startAsInitiator, isConnecting]);

  // Start voice call
  const startCall = useCallback(async () => {
    if (isConnecting || isConnected || !isChannelReady) return;
    
    console.log('VoiceChat: Starting call, isInitiator:', isInitiator.current);
    setIsConnecting(true);
    setConnectionError(null);
    
    // Notify opponent we're ready
    await sendSignal({
      type: 'ready',
      from: currentUserId,
      to: opponentId,
      data: null,
    });
    
    // If we're the initiator, start immediately
    if (isInitiator.current) {
      // Wait a moment for opponent to be ready
      setTimeout(async () => {
        if (!peerConnectionRef.current) {
          await startAsInitiator();
        }
      }, 500);
    }
  }, [isConnecting, isConnected, isChannelReady, sendSignal, currentUserId, opponentId, startAsInitiator]);

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

  // Retry connection
  const retryConnection = useCallback(() => {
    cleanup();
    setConnectionError(null);
    startCall();
  }, [cleanup, startCall]);

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
                <Badge variant="secondary" className="text-xs animate-pulse">
                  Connecting...
                </Badge>
              )}
              {connectionError && (
                <Badge variant="destructive" className="text-xs">
                  Error
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
              ) : connectionError ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryConnection}
                  className="gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startCall}
                  disabled={isConnecting || !isChannelReady}
                  className="gap-1"
                >
                  <Phone className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Start Voice'}
                </Button>
              )}
            </div>
          </div>
          
          {connectionError && (
            <p className="mt-2 text-xs text-destructive">{connectionError}</p>
          )}
          
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
