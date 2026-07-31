import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert, ShieldX, Activity } from 'lucide-react';
import ChatInterface from './ChatInterface';
import PreCallLobby from './PreCallLobby';
import CallControls from './CallControls';
import CallFeedbackModal from './CallFeedbackModal';
import CustomPopup from './CustomPopup';
import { calculateQualityLevel, parseIceCandidateType, getBandwidthConstraints } from '../utils/webrtcHelpers';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.protocol + '//' + window.location.hostname + ':5000');

export default function CallInterface({
  socket,
  sessionId,
  currentUser,
  remoteUser,
  isCaller,
  onHangUp,
  authToken
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);

  // Security deterrence states
  const [localFocused, setLocalFocused] = useState(true);
  const [remoteFocused, setRemoteFocused] = useState(true);
  const [securityViolation, setSecurityViolation] = useState('');
  const [localScreenshotViolation, setLocalScreenshotViolation] = useState(false);
  const [peerScreenshotViolation, setPeerScreenshotViolation] = useState(false);
  const [peerScreenshotAlert, setPeerScreenshotAlert] = useState('');
  
  // Message log
  const [messages, setMessages] = useState([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const canvasAnimRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('Calling...');
  const reconnectAttemptsRef = useRef(0);
  const callTimeoutRef = useRef(null);
  const iceCandidateStatsRef = useRef({ host: 0, srflx: 0, relay: 0 });
  const reconnectTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);
  const handleReconnectionRef = useRef(null);
  const callAcceptedRef = useRef(false);
  const triggerOfferRef = useRef(null);

  // Call Quality states & refs
  const [qualityLevel, setQualityLevel] = useState('Excellent');
  const [showDevStats, setShowDevStats] = useState(false);
  const [technicalStats, setTechnicalStats] = useState({
    bitrate: 0,
    rtt: 0,
    loss: 0,
    jitter: 0,
    fps: 0,
    resWidth: 0,
    resHeight: 0,
    protocol: 'N/A',
    candidateType: 'N/A'
  });
  const prevStatsRef = useRef({ time: Date.now(), bytes: 0, frames: 0, lost: 0, totalPackets: 0 });
  const [videoQualityMode, setVideoQualityMode] = useState('Auto');
  const videoQualityModeRef = useRef('Auto');
  const applyVideoParametersRef = useRef(null);

  // Device & audio filter states
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [], audioOutputs: [] });
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const wasVideoActiveRef = useRef(true);
  const [orientation, setOrientation] = useState(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  // Lobby states
  const [inLobby, setInLobby] = useState(true);
  const [micVolume, setMicVolume] = useState(0);
  const [networkLatency, setNetworkLatency] = useState('Checking...');
  const [networkStatus, setNetworkStatus] = useState('Checking...');
  const [peerReady, setPeerReady] = useState(false);

  const [permissionsError, setPermissionsError] = useState(null);
  const [popupState, setPopupState] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const showPopup = (title, message, type = 'info', onConfirm = null) => {
    setPopupState({ isOpen: true, title, message, type, onConfirm });
  };
  const peerReadyRef = useRef(false);

  // Stable video binder callbacks to avoid re-render blinking
  const bindLocalVideo = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream;
    }
  }, [localStream]);

  const bindRemoteVideo = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Advanced control states
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Call feedback states
  const [dbCallIdState, setDbCallIdState] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackIssues, setFeedbackIssues] = useState([]);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Helper: Apply WebRTC video sender parameters (bitrate and resolution scaling)
  const applyVideoParameters = async (mode, currentQuality) => {
    if (!pcRef.current || pcRef.current.connectionState === 'closed') {
      return;
    }

    try {
      const senders = pcRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (!videoSender) {
        return;
      }

      const parameters = videoSender.getParameters();
      if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
      }

      const targetMode = mode === 'Auto' ? (currentQuality || qualityLevel) : mode;
      const { maxBitrate, scaleResolutionDownBy } = getBandwidthConstraints(targetMode);

      const currentEnc = parameters.encodings[0];
      if (currentEnc.maxBitrate !== maxBitrate || currentEnc.scaleResolutionDownBy !== scaleResolutionDownBy) {
        currentEnc.maxBitrate = maxBitrate;
        currentEnc.scaleResolutionDownBy = scaleResolutionDownBy;
        await videoSender.setParameters(parameters);
        console.log(`[Adaptive Quality] Applied params for Mode: ${mode} (Effective: ${targetMode}) -> Bitrate: ${maxBitrate} bps, Scale: ${scaleResolutionDownBy}x`);
      }
    } catch (err) {
      console.warn('[Adaptive Quality] Failed to update sender parameters:', err);
    }
  };

  applyVideoParametersRef.current = applyVideoParameters;

  // Query and list user media devices
  const getDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devList.filter((d) => d.kind === 'audioinput');
      const videoInputs = devList.filter((d) => d.kind === 'videoinput');
      const audioOutputs = devList.filter((d) => d.kind === 'audiooutput');

      setDevices({ audioInputs, videoInputs, audioOutputs });

      if (audioInputs.length && !selectedAudioInput) setSelectedAudioInput(audioInputs[0].deviceId);
      if (videoInputs.length && !selectedVideoInput) setSelectedVideoInput(videoInputs[0].deviceId);
      if (audioOutputs.length && !selectedAudioOutput) setSelectedAudioOutput(audioOutputs[0].deviceId);
    } catch (err) {
      console.warn('Failed to enumerate devices:', err);
    }
  };

  // Switch camera during active WebRTC call
  const handleSwitchCamera = async (deviceId) => {
    setSelectedVideoInput(deviceId);
    if (!localStream || !pcRef.current) return;

    try {
      console.log(`[Device Switch] Switching camera to: ${deviceId}`);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 640, height: 480 }
      });
      const newTrack = newStream.getVideoTracks()[0];

      const senders = pcRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
        console.log('[Device Switch] Video track replaced successfully.');
      }

      const oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) {
        oldTrack.stop();
        localStream.removeTrack(oldTrack);
      }
      localStream.addTrack(newTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err) {
      console.error('[Device Switch] Camera replaceTrack failed:', err);
    }
  };

  const toggleCameraFacing = async () => {
    if (!devices.videoInputs || devices.videoInputs.length <= 1) return;
    const currentIndex = devices.videoInputs.findIndex((d) => d.deviceId === selectedVideoInput);
    const nextIndex = (currentIndex + 1) % devices.videoInputs.length;
    const nextDevice = devices.videoInputs[nextIndex];
    await handleSwitchCamera(nextDevice.deviceId);
  };

  // Switch mic input or toggled filters (echoCancellation, noiseSuppression, AGC)
  const handleSwitchMicrophone = async (deviceId, customEcho, customNS, customAGC) => {
    const targetMic = deviceId || selectedAudioInput;
    const targetEcho = customEcho !== undefined ? customEcho : echoCancellation;
    const targetNS = customNS !== undefined ? customNS : noiseSuppression;
    const targetAGC = customAGC !== undefined ? customAGC : autoGainControl;

    if (deviceId) {
      setSelectedAudioInput(deviceId);
    }
    if (customEcho !== undefined) setEchoCancellation(customEcho);
    if (customNS !== undefined) setNoiseSuppression(customNS);
    if (customAGC !== undefined) setAutoGainControl(customAGC);

    if (!localStream || !pcRef.current) return;

    try {
      console.log(`[Device Switch] Switching mic constraints to: Device: ${targetMic}, Echo: ${targetEcho}, NS: ${targetNS}, AGC: ${targetAGC}`);
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: targetMic ? { exact: targetMic } : undefined,
          echoCancellation: targetEcho,
          noiseSuppression: targetNS,
          autoGainControl: targetAGC
        }
      });
      const newTrack = newStream.getAudioTracks()[0];

      const senders = pcRef.current.getSenders();
      const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(newTrack);
        console.log('[Device Switch] Audio track replaced successfully.');
      }

      const oldTrack = localStream.getAudioTracks()[0];
      if (oldTrack) {
        oldTrack.stop();
        localStream.removeTrack(oldTrack);
      }
      localStream.addTrack(newTrack);
    } catch (err) {
      console.error('[Device Switch] Audio replaceTrack failed:', err);
    }
  };

  // Switch audio output destination
  const handleSwitchSpeaker = async (deviceId) => {
    setSelectedAudioOutput(deviceId);
    if (!remoteVideoRef.current) return;

    try {
      if (typeof remoteVideoRef.current.setSinkId === 'function') {
        await remoteVideoRef.current.setSinkId(deviceId);
        console.log(`[Device Switch] Output audio speaker set to: ${deviceId}`);
      } else {
        console.warn('[Device Switch] setSinkId speaker routing is unsupported in this browser.');
      }
    } catch (err) {
      console.error('[Device Switch] Speaker setSinkId failed:', err);
    }
  };

  // Runs Google STUN round-trip diagnostic latency test
  const runNetworkDiagnostic = async () => {
    setNetworkStatus('Checking...');
    const startTime = Date.now();
    try {
      const tempPc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      tempPc.createDataChannel('latency-check');
      const offer = await tempPc.createOffer();
      await tempPc.setLocalDescription(offer);

      await new Promise((resolve) => {
        tempPc.onicecandidate = (event) => {
          if (event.candidate) {
            resolve();
          }
        };
        setTimeout(resolve, 2000); // 2s fallback timeout
      });

      const duration = Date.now() - startTime;
      tempPc.close();

      setNetworkLatency(`${duration} ms`);
      setNetworkStatus(duration < 250 ? 'Excellent' : duration < 500 ? 'Good' : 'Fair');
    } catch (err) {
      console.warn('Network latency diagnostic failed:', err);
      setNetworkLatency('Unreachable / Offline');
      setNetworkStatus('Poor');
    }
  };

  // Synthesize 1s sine-wave beep to test audio outputs/speakers
  const playSpeakerTest = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // 440Hz A4 pitch

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

      osc.start();
      osc.stop(ctx.currentTime + 1.0);
      console.log('[Speaker Test] Sine beep successfully triggered.');
    } catch (err) {
      console.warn('Failed to output speaker test beep:', err);
    }
  };

  // Dynamic microphone visual volume level meter
  useEffect(() => {
    if (!localStream || !inLobby) {
      setMicVolume(0);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    let audioContext;
    let analyser;
    let source;
    let intervalId;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      intervalId = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((avg / 120) * 100)));
      }, 100);
    } catch (err) {
      console.warn('Lobby mic volume visualizer failed to initialize:', err);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [localStream, inLobby]);

  // Run network latency checks when the lobby mounts
  useEffect(() => {
    runNetworkDiagnostic();
  }, []);

  // Live session duration tracking timer
  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      setCallDuration(0);
      return;
    }

    const intervalId = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [connectionStatus]);

  // 1.5 Call Quality Monitoring Loop (RTCPeerConnection.getStats())
  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      return;
    }

    const intervalId = setInterval(async () => {
      if (!pcRef.current || pcRef.current.connectionState === 'closed') {
        return;
      }

      try {
        const stats = await pcRef.current.getStats();
        const now = Date.now();
        const timeDiff = (now - prevStatsRef.current.time) / 1000;

        let bytesReceived = prevStatsRef.current.bytes;
        let framesDecoded = prevStatsRef.current.frames;
        let packetsLost = prevStatsRef.current.lost;
        let packetsReceived = prevStatsRef.current.totalPackets;
        let jitter = 0;
        let resWidth = 0;
        let resHeight = 0;
        let rtt = 0;
        let protocol = 'N/A';
        let candidateType = 'N/A';

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            bytesReceived = report.bytesReceived ?? bytesReceived;
            framesDecoded = report.framesDecoded ?? framesDecoded;
            packetsLost = report.packetsLost ?? packetsLost;
            packetsReceived = report.packetsReceived ?? packetsReceived;
            jitter = report.jitter ?? jitter;
            resWidth = report.frameWidth ?? resWidth;
            resHeight = report.frameHeight ?? resHeight;
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime ?? rtt;
            
            const localCandidate = stats.get(report.localCandidateId);
            if (localCandidate) {
              protocol = (localCandidate.protocol ?? 'N/A').toUpperCase();
              candidateType = localCandidate.candidateType ?? 'N/A';
            }
          }
        });

        const bitrate = timeDiff > 0 ? ((bytesReceived - prevStatsRef.current.bytes) * 8) / (timeDiff * 1000) : 0;
        const lostDiff = packetsLost - prevStatsRef.current.lost;
        const receivedDiff = packetsReceived - prevStatsRef.current.totalPackets;
        const lossRate = (lostDiff + receivedDiff) > 0 ? (lostDiff / (lostDiff + receivedDiff)) * 100 : 0;
        const fps = timeDiff > 0 ? (framesDecoded - prevStatsRef.current.frames) / timeDiff : 0;
        const rttMs = rtt * 1000;
        const jitterMs = jitter * 1000;

        const newQuality = calculateQualityLevel(lossRate, rttMs, jitterMs);

        setQualityLevel(newQuality);
        setTechnicalStats({
          bitrate: Math.max(0, bitrate),
          rtt: rttMs,
          loss: Math.max(0, lossRate),
          jitter: jitterMs,
          fps: Math.max(0, fps),
          resWidth,
          resHeight,
          protocol,
          candidateType
        });

        if (applyVideoParametersRef.current) {
          applyVideoParametersRef.current(videoQualityModeRef.current, newQuality);
        }

        prevStatsRef.current = {
          time: now,
          bytes: bytesReceived,
          frames: framesDecoded,
          lost: packetsLost,
          totalPackets: packetsReceived
        };

      } catch (err) {
        console.warn('Error reading RTCPeerConnection statistics:', err);
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [connectionStatus]);

  // Caller Timeout handler (No response within 30s)
  useEffect(() => {
    if (isCaller) {
      console.log('Starting call timeout timer...');
      callTimeoutRef.current = setTimeout(() => {
        showPopup('Call Timeout', 'Call timed out. No response from recipient.', 'error', () => {
          handleDisconnect();
        });
      }, 30000);
    }
    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, [isCaller]);

  // Authoritative State Machine Synchronization Listener
  useEffect(() => {
    socket.on('call_state_changed', ({ state, dbCallId }) => {
      console.log(`[StateMachine] authoritative state updated to: ${state}`);
      if (dbCallId) {
        setDbCallIdState(dbCallId);
      }
      const statusLabels = {
        'CALLING': 'Calling...',
        'RINGING': 'Ringing...',
        'ACCEPTING': 'Connecting...',
        'CONNECTING': 'Connecting...',
        'CONNECTED': 'Connected',
        'RECONNECTING': 'Reconnecting...',
        'FAILED': 'Connection Failed',
        'ENDED': 'Call Ended',
        'REJECTED': 'Call Rejected',
        'TIMEOUT': 'Call Timed Out'
      };
      if (statusLabels[state]) {
        setConnectionStatus(statusLabels[state]);
      }

      const isTerminal = ['ENDED', 'FAILED', 'REJECTED', 'TIMEOUT'].includes(state);
      if (isTerminal) {
        const currentDbId = dbCallId || dbCallIdState;
        if (currentDbId) {
          setShowFeedbackModal(true);
        } else {
          setTimeout(() => {
            onHangUp();
          }, 1500);
        }
      }
    });

    return () => {
      socket.off('call_state_changed');
    };
  }, [socket]);

  const [iceServersState, setIceServersState] = useState(null);

  // 1. Initializing Media Stream and fetching ICE servers
  useEffect(() => {
    let activeStream = null;
    let canvasInterval = null;
    let isUnmounted = false;

    async function setupMediaAndICE() {
      // Fetch dynamic ICE configuration from backend
      let configIceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      try {
        const backendUrl = BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/calls/ice-servers`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.iceServers) {
            configIceServers = data.iceServers;
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic ICE servers, falling back to defaults:', err);
      }
      if (isUnmounted) return;
      setIceServersState(configIceServers);

      try {
        // Attempt webcam and microphone access
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('navigator.mediaDevices is undefined. Insecure HTTP connection detected. Please enable the secure context flag in your browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: {
            echoCancellation: echoCancellation,
            noiseSuppression: noiseSuppression,
            autoGainControl: autoGainControl
          }
        });
        if (isUnmounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream = stream;
        setLocalStream(activeStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = activeStream;
        }
        await getDevices();
      } catch (err) {
        console.warn('Camera/mic access failed, using simulated canvas stream:', err);
        setPermissionsError(err.message || 'Permissions denied');
        // Fallback: Create animated simulated video using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        let angle = 0;
        
        canvasInterval = setInterval(() => {
          // BG
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Accent circle movement
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(
            320 + Math.cos(angle) * 120,
            240 + Math.sin(angle) * 120,
            50,
            0,
            2 * Math.PI
          );
          ctx.fill();

          // User initials or text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${currentUser} (Simulated Feed)`, 320, 240);
          
          ctx.fillStyle = '#9ca3af';
          ctx.font = '16px sans-serif';
          ctx.fillText('Webcam access was disabled/unavailable', 320, 280);

          angle += 0.04;
        }, 33);

        let canvasStream;
        try {
          if (canvas.captureStream) {
            canvasStream = canvas.captureStream(30);
          } else if (canvas.mozCaptureStream) {
            canvasStream = canvas.mozCaptureStream(30);
          } else {
            canvasStream = new MediaStream();
          }
        } catch (e) {
          console.warn('Canvas stream capture failed:', e);
          canvasStream = new MediaStream();
        }
        
        // Try to add audio node if possible
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const dest = audioCtx.createMediaStreamDestination();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc.connect(dest);
          osc.start();
          // Don't actually play the oscillator out loud, just pipe it to stream
          canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (e) {
          console.warn('Simulated audio track failed:', e);
        }

        if (isUnmounted) {
          if (canvasInterval) clearInterval(canvasInterval);
          canvasStream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = canvasStream;
        setLocalStream(canvasStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = canvasStream;
        }
      }
    }

    setupMediaAndICE();

    return () => {
      isUnmounted = true;
      if (canvasInterval) {
        clearInterval(canvasInterval);
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const inLobbyRef = useRef(true);
  useEffect(() => {
    inLobbyRef.current = inLobby;
  }, [inLobby]);

  // Trigger peer connection initialization when stream and ICE servers are loaded
  useEffect(() => {
    if (localStream && iceServersState && !pcRef.current) {
      console.log('[WebRTC] Stream and ICE servers loaded, instantiating Peer Connection...');
      initPeerConnection(localStream, iceServersState);
    }
  }, [localStream, iceServersState]);

  // Cleanup stream tracks on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`[Cleanup] Stopped local stream track: ${track.kind}`);
        });
      }
    };
  }, [localStream]);

  // Cleanup peer connection on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
        console.log('[Cleanup] Closed and cleared peer connection.');
      }
    };
  }, []);

  // 2. Initialize Peer Connection
  const initPeerConnection = (stream, customIceServers) => {
    const pc = new RTCPeerConnection({ iceServers: customIceServers });
    pcRef.current = pc;

    // Helper: Handle reconnection via ICE restart with exponential backoff (1s, 2s, 4s, 8s)
    const handleReconnection = () => {
      if (isReconnectingRef.current) return;
      isReconnectingRef.current = true;

      const attemptReconnect = async () => {
        if (reconnectAttemptsRef.current >= 4) {
          console.warn('[Reconnection] Max reconnection attempts (4) reached.');
          setConnectionStatus('Connection Failed');
          socket.emit('update_call_state', { sessionId, state: 'FAILED' });
          showPopup('Reconnection Failed', 'Reconnection failed. P2P link terminated.', 'error', () => {
            handleDisconnect();
          });
          return;
        }

        reconnectAttemptsRef.current++;
        setConnectionStatus('CONNECTION LOST');
        socket.emit('update_call_state', { sessionId, state: 'RECONNECTING' });

        const delay = Math.pow(2, reconnectAttemptsRef.current - 1) * 1000;
        console.log(`[Reconnection] Reconnect Attempt ${reconnectAttemptsRef.current}/4 in ${delay}ms...`);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(async () => {
          if (!pcRef.current || pcRef.current.connectionState === 'closed') {
            isReconnectingRef.current = false;
            return;
          }

          setConnectionStatus('RECONNECTING');
          console.log(`[Reconnection] Executing ICE Restart handshake offer...`);

          if (isCaller) {
            try {
              const offer = await pcRef.current.createOffer({ iceRestart: true });
              await pcRef.current.setLocalDescription(offer);
              socket.emit('signal', {
                sessionId,
                sdp: pcRef.current.localDescription,
                type: 'offer'
              });
            } catch (err) {
              console.error('[Reconnection] ICE Restart offer failed:', err);
            }
          }
          isReconnectingRef.current = false;
        }, delay);
      };

      attemptReconnect();
    };

    handleReconnectionRef.current = handleReconnection;

    const handleConnectionFailed = () => {
      setConnectionStatus('Connection Failed');
      console.error('WebRTC P2P Connection failed.');
      socket.emit('update_call_state', { sessionId, state: 'FAILED' });
      handleDisconnect();
    };

    // Listeners for connection state updates
    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection State:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connecting':
          setConnectionStatus('Connecting...');
          socket.emit('update_call_state', { sessionId, state: 'CONNECTING' });
          break;
        case 'connected':
          setConnectionStatus('Connected');
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          socket.emit('update_call_state', { sessionId, state: 'CONNECTED' });
          break;
        case 'disconnected':
          setConnectionStatus('Reconnecting...');
          socket.emit('update_call_state', { sessionId, state: 'RECONNECTING' });
          handleReconnection();
          break;
        case 'failed':
          handleConnectionFailed();
          socket.emit('update_call_state', { sessionId, state: 'FAILED' });
          break;
        case 'closed':
          setConnectionStatus('Call Ended');
          socket.emit('update_call_state', { sessionId, state: 'ENDED' });
          break;
        default:
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection State:', pc.iceConnectionState);
      switch (pc.iceConnectionState) {
        case 'checking':
          setConnectionStatus('Connecting...');
          socket.emit('update_call_state', { sessionId, state: 'CONNECTING' });
          break;
        case 'connected':
        case 'completed':
          setConnectionStatus('Connected');
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          socket.emit('update_call_state', { sessionId, state: 'CONNECTED' });
          break;
        case 'disconnected':
          setConnectionStatus('Reconnecting...');
          socket.emit('update_call_state', { sessionId, state: 'RECONNECTING' });
          handleReconnection();
          break;
        case 'failed':
          handleConnectionFailed();
          socket.emit('update_call_state', { sessionId, state: 'FAILED' });
          break;
        default:
          break;
      }
    };

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote track addition
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candStr = event.candidate.candidate;
        const candidateType = parseIceCandidateType(candStr);
        
        if (candidateType !== 'unknown') {
          iceCandidateStatsRef.current[candidateType]++;
          console.log(`Gathered ICE Candidate Type: ${candidateType} (Host: ${iceCandidateStatsRef.current.host}, Srflx: ${iceCandidateStatsRef.current.srflx}, Relay: ${iceCandidateStatsRef.current.relay})`);
        }

        socket.emit('signal', {
          sessionId,
          candidate: event.candidate,
          type: 'candidate'
        });
      }
    };

    const triggerOffer = async () => {
      console.log('[WebRTC] Initiating offer...');
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', {
          sessionId,
          sdp: pc.localDescription,
          type: 'offer'
        });
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    };
    triggerOfferRef.current = triggerOffer;

    // Since CallInterface only mounts for the caller after acceptance, we can treat it as accepted immediately on mount
    if (isCaller) {
      console.log('[WebRTC] Component mounted. Call is accepted.');
      callAcceptedRef.current = true;
      if (!inLobbyRef.current) {
        triggerOffer();
      } else {
        console.log('[WebRTC] Currently in lobby, deferring offer creation...');
      }
    }

    // Bind signaling listener
    socket.on('signal', async ({ sdp, candidate, type }) => {
      try {
        if (type === 'offer') {
          console.log('Received offer, setting remote desc and creating answer...');
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            sessionId,
            sdp: pc.localDescription,
            type: 'answer'
          });
        } else if (type === 'answer') {
          console.log('Received answer, setting remote desc...');
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } else if (type === 'candidate' && candidate) {
          console.log('Received ICE candidate...');
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error handling signaling:', err);
      }
    });

    // Security violation handler (if server blocks SDP screen sharing)
    socket.on('security_violation', ({ error }) => {
      setSecurityViolation(error);
      // Clean call connection
      handleDisconnect();
    });
  };

  // Orientation change detection effect
  useEffect(() => {
    const handleResize = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
      console.log(`[Orientation] Layout changed to: ${newOrientation}`);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 3. Visibility and Reconnection Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;

      // Background/Foreground track toggle & status emission
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (!isVisible) {
          wasVideoActiveRef.current = videoTrack ? videoTrack.enabled : false;
          if (videoTrack && videoTrack.enabled) {
            videoTrack.enabled = false;
            console.log('[Background] Paused local video track to conserve resources.');
            socket.emit('video_state_changed', { sessionId, isVideoOff: true });
          }
        } else {
          if (videoTrack && wasVideoActiveRef.current) {
            videoTrack.enabled = true;
            console.log('[Foreground] Resumed local video track.');
            socket.emit('video_state_changed', { sessionId, isVideoOff: false });
          }
        }
      }

      // Handle tab suspension resume
      if (isVisible) {
        console.log('[Reconnection] Tab visibility restored. Verifying WebRTC connection state...');
        if (pcRef.current && (pcRef.current.connectionState === 'disconnected' || pcRef.current.connectionState === 'failed')) {
          if (handleReconnectionRef.current) {
            handleReconnectionRef.current();
          }
        }
      }
    };

    const handleOffline = () => {
      console.log('[Reconnection] Browser offline status detected.');
      setConnectionStatus('CONNECTION LOST');
      socket.emit('update_call_state', { sessionId, state: 'RECONNECTING' });
    };

    const handleOnline = () => {
      console.log('[Reconnection] Browser online status restored. Restarting ICE...');
      if (handleReconnectionRef.current) {
        handleReconnectionRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Bind peer camera status
    socket.on('peer_video_changed', ({ user, isVideoOff }) => {
      if (user === remoteUser) {
        setRemoteVideoOff(isVideoOff);
      }
    });

    // Bind peer screenshot warning
    socket.on('peer_screenshot_warning', ({ user }) => {
      if (user === remoteUser) {
        setPeerScreenshotAlert(`Security Alert: ${remoteUser} attempted to capture a screenshot! Feeds suspended.`);
        setPeerScreenshotViolation(true);
        setTimeout(() => {
          setPeerScreenshotViolation(false);
          setPeerScreenshotAlert('');
        }, 7000);
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      socket.off('peer_video_changed');
      socket.off('peer_screenshot_warning');
      socket.off('signal');
      socket.off('call_accepted');
      socket.off('security_violation');
    };
  }, [socket, sessionId, remoteUser]);

  // 3.5 Screenshot Hotkey Interception
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isPrintScreen = e.key === 'PrintScreen';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
      const isWinScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S');

      if (isPrintScreen || isMacScreenshot || isWinScreenshot) {
        // Intercept and prevent default where supported
        e.preventDefault();
        setLocalScreenshotViolation(true);
        socket.emit('screenshot_attempted', { sessionId });
        setTimeout(() => {
          setLocalScreenshotViolation(false);
        }, 7000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [socket, sessionId]);

  // 4. Message Log Handlers
  useEffect(() => {
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, id: Math.random(), isMine: false }]);
    });

    socket.on('message_delivered', (msg) => {
      setMessages((prev) => [...prev, { ...msg, id: Math.random(), isMine: true }]);
    });

    socket.on('message_rejected', ({ text, error }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random(),
          sender: 'system_warning',
          originalText: text,
          error: error
        }
      ]);
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_delivered');
      socket.off('message_rejected');
    };
  }, [socket]);

  // Actions
  const handleSendMessage = (text) => {
    socket.emit('send_message', { sessionId, text });
  };

  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const targetState = !videoTrack.enabled;
        setIsVideoOff(targetState);
        socket.emit('video_state_changed', { sessionId, isVideoOff: targetState });
      }
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: {
          echoCancellation: echoCancellation,
          noiseSuppression: noiseSuppression,
          autoGainControl: autoGainControl
        }
      });
      setLocalStream(stream);
      setPermissionsError(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      await getDevices();
    } catch (err) {
      console.warn('Failed to obtain camera/mic permissions:', err);
      setPermissionsError(err.message || 'Permissions denied');
      showPopup('Permissions Required', 'Swaply requires Camera and Microphone access. Please grant permissions in your browser address bar and try again.', 'error');
    }
  };

  const handleSetQualityMode = (mode) => {
    setVideoQualityMode(mode);
    videoQualityModeRef.current = mode;
    applyVideoParameters(mode, qualityLevel);
  };

  const handleDisconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    socket.emit('terminate_call', { sessionId });
    if (inLobby) {
      onHangUp();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Failed to enter fullscreen mode:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleTogglePiP = async () => {
    if (!remoteVideoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-Picture failed:', err);
    }
  };

  const handleJoinCall = () => {
    setInLobby(false);
    if (isCaller && callAcceptedRef.current && typeof triggerOfferRef.current === 'function') {
      triggerOfferRef.current();
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      const backendUrl = BACKEND_URL;
      const body = {
        callId: dbCallIdState,
        rating: feedbackRating,
        issues: feedbackIssues,
        comments: feedbackComments
      };

      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${backendUrl}/api/calls/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit feedback');
      }

      console.log('[Feedback] Feedback submitted successfully.');
    } catch (err) {
      console.warn('Feedback submission failed:', err.message);
    } finally {
      setFeedbackSubmitted(true);
      setShowFeedbackModal(false);
      onHangUp();
    }
  };

  const handleStarClick = (rating) => {
    setFeedbackRating(rating);
  };

  const handleToggleIssue = (issue) => {
    setFeedbackIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  if (inLobby) {
    return (
      <PreCallLobby
        localStream={localStream}
        micVolume={micVolume}
        devices={devices}
        selectedVideoInput={selectedVideoInput}
        selectedAudioInput={selectedAudioInput}
        selectedAudioOutput={selectedAudioOutput}
        networkLatency={networkLatency}
        networkStatus={networkStatus}
        bindLocalVideo={bindLocalVideo}
        handleSwitchCamera={handleSwitchCamera}
        handleSwitchMicrophone={handleSwitchMicrophone}
        handleSwitchSpeaker={handleSwitchSpeaker}
        playSpeakerTest={playSpeakerTest}
        handleDisconnect={handleDisconnect}
        handleJoinCall={handleJoinCall}
        permissionsError={permissionsError}
        onRequestPermissions={handleRequestPermissions}
      />
    );
  }

        return (
    <div className={`call-fullscreen-overlay ${isMinimized ? 'minimized' : ''}`}>
      {/* 1. Header overlay bar (floats at the top) */}
      <div className="call-header-overlay" style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        zIndex: 90,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        padding: '0.75rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            Swaply Secure Call
          </h1>
          <div className={`status-badge status-${connectionStatus.toLowerCase().replace(/\./g, '').replace(/\s+/g, '-')}`}>
            <span className="status-dot"></span>
            <span className="status-text">{connectionStatus}</span>
          </div>
          {connectionStatus === 'Connected' && (
            <span className={`quality-badge q-${qualityLevel.toLowerCase()}`} style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: qualityLevel === 'Excellent' ? 'rgba(16,185,129,0.15)' : qualityLevel === 'Good' ? 'rgba(52,211,153,0.15)' : qualityLevel === 'Fair' ? 'rgba(245,158,11,0.15)' : qualityLevel === 'Poor' ? 'rgba(249,115,22,0.15)' : 'rgba(239,68,68,0.15)',
              color: qualityLevel === 'Excellent' ? '#10b981' : qualityLevel === 'Good' ? '#34d399' : qualityLevel === 'Fair' ? '#f59e0b' : qualityLevel === 'Poor' ? '#f97316' : '#ef4444',
              border: '1px solid currentColor',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block'
              }}></span>
              Quality: {qualityLevel}
            </span>
          )}
          {connectionStatus === 'Connected' && (
            <span className="duration-badge" style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: 'var(--font-mono)'
            }}>
              ⏱️ {formatDuration(callDuration)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          <span>Caller: {isCaller ? currentUser : remoteUser}</span>
          <span>•</span>
          <span>Recipient: {isCaller ? remoteUser : currentUser}</span>
        </div>
      </div>

      {/* Warning banner if remote user attempted screenshot */}
      {peerScreenshotAlert && (
        <div className="system-notification-banner" style={{
          position: 'absolute',
          top: '5.5rem',
          left: '1.5rem',
          right: '1.5rem',
          zIndex: 110,
          background: '#FFF2F2',
          color: 'var(--color-danger)',
          borderColor: 'var(--color-danger)'
        }}>
          <ShieldAlert size={18} />
          <span>{peerScreenshotAlert}</span>
        </div>
      )}

      {securityViolation && (
        <div className="system-notification-banner" style={{
          position: 'absolute',
          top: '5.5rem',
          left: '1.5rem',
          right: '1.5rem',
          zIndex: 110,
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fca5a5',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        }}>
          <ShieldX size={18} />
          <span>Security Alert: {securityViolation} Connection terminated.</span>
        </div>
      )}

      {/* 2. Main full-screen Video Call Canvas Workspace */}
      <div className="video-workspace" style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        flex: 1,
        background: '#09090b',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Remote Video - Full Backdrop */}
        <div className={`video-wrapper remote-video ${(!remoteFocused || localScreenshotViolation || peerScreenshotViolation) ? 'blurred' : ''}`} style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {remoteVideoOff ? (
            <div className="camera-muted-placeholder" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#18181b',
              zIndex: 5
            }}>
              <div className="camera-muted-avatar" style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#f4f4f5',
                marginBottom: '1rem'
              }}>
                {remoteUser.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#a1a1aa' }}>
                CAMERA MUTED
              </div>
            </div>
          ) : null}
          <video
            ref={bindRemoteVideo}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: remoteVideoOff ? 'none' : 'block'
            }}
          />
          <div className="video-label" style={{
            position: 'absolute',
            bottom: '7.5rem',
            left: '1.5rem',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {remoteUser}
          </div>

          {localScreenshotViolation && (
            <div className="blur-overlay" style={{ background: '#FFF2F2', zIndex: 40 }}>
              <ShieldAlert className="blur-icon" size={32} style={{ color: 'var(--color-danger)' }} />
              <div className="blur-text" style={{ color: 'var(--color-danger)' }}>Screenshot Intercepted</div>
              <div className="blur-subtext">Screenshots are blocked on Swaply. Your feed has been temporarily suspended.</div>
            </div>
          )}

          {peerScreenshotViolation && (
            <div className="blur-overlay" style={{ background: '#FFF2F2', zIndex: 40 }}>
              <ShieldAlert className="blur-icon" size={32} style={{ color: 'var(--color-danger)' }} />
              <div className="blur-text" style={{ color: 'var(--color-danger)' }}>Peer Capture Warning</div>
              <div className="blur-subtext">Security Alert: {remoteUser} attempted to capture a screenshot! Feeds suspended.</div>
            </div>
          )}

          {!remoteStream && !remoteVideoOff && !localScreenshotViolation && !peerScreenshotViolation && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#a1a1aa',
              zIndex: 5,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Activity className="animate-pulse" size={40} style={{ color: '#8b5cf6' }} />
              <span>{connectionStatus}</span>
            </div>
          )}
        </div>

        {/* Local Video - Floating overlay cards */}
        <div className={`video-wrapper local-video ${(localScreenshotViolation || peerScreenshotViolation) ? 'blurred' : ''}`}>
          {isVideoOff ? (
            <div className="camera-muted-placeholder" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#334155'
            }}>
              <div className="camera-muted-avatar" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#cbd5e1'
              }}>
                {currentUser.substring(0, 2).toUpperCase()}
              </div>
            </div>
          ) : null}
          <video
            ref={bindLocalVideo}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isVideoOff ? 'none' : 'block'
            }}
          />
          <div className="video-label-pill" style={{
            position: 'absolute',
            bottom: '0.4rem',
            left: '0.4rem',
            background: 'rgba(15, 23, 42, 0.65)',
            color: '#fff',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.65rem',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {currentUser}
          </div>
        </div>

        {/* Developer WebRTC Stats Panel */}
        {showDevStats && (
          <div className="glass-panel dev-stats-drawer" style={{
            position: 'absolute',
            top: '7.5rem',
            left: '1.5rem',
            width: '280px',
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1rem',
            maxHeight: 'calc(100% - 15rem)',
            overflowY: 'auto',
            zIndex: 60,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}>
              <Activity size={16} /> WebRTC Connection Diagnostic
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>ICE Link:</span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{technicalStats.candidateType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Latency (RTT):</span>
                <span style={{ color: '#fff' }}>{technicalStats.rtt} ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Packet Loss:</span>
                <span style={{ color: technicalStats.packetLoss > 2 ? '#ef4444' : '#10b981' }}>{technicalStats.packetLoss}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Jitter:</span>
                <span style={{ color: '#fff' }}>{technicalStats.jitter} s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Video Resolution:</span>
                <span style={{ color: '#fff' }}>{technicalStats.resolution}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Frame Rate:</span>
                <span style={{ color: '#fff' }}>{technicalStats.fps} FPS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Bitrate:</span>
                <span style={{ color: '#fff' }}>{technicalStats.bitrate} Kbps</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ color: '#9ca3af' }}>Quality Score:</span>
                <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{qualityLevel}</span>
              </div>
              
              {/* Quality Preset Selection */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.35rem' }}>Manual Video Preset</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.25rem' }}>
                  {['Auto', 'High', 'Medium', 'Low'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => handleSetQualityMode(tier)}
                      style={{
                        padding: '0.25rem 0',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        background: videoQualityMode === tier ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Floating Translucent WhatsApp-Style Controls Bar */}
        <CallControls
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          isChatOpen={isChatOpen}
          showDevStats={showDevStats}
          isMinimized={isMinimized}
          devices={devices}
          remoteVideoRef={remoteVideoRef}
          onToggleVideo={handleToggleVideo}
          onToggleMute={handleToggleMute}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          onToggleDevStats={() => setShowDevStats(!showDevStats)}
          onTogglePiP={handleTogglePiP}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
          onSwitchCamera={toggleCameraFacing}
          onHangUp={handleDisconnect}
        />

        {/* 4. Sliding Chat Drawer Overlay Container */}
        <div className={`chat-overlay-container ${isChatOpen ? 'open' : ''}`} style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 80,
          transform: isChatOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="chat-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(30, 41, 59, 0.5)'
          }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Secure Session Chat</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '1.25rem',
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#fff'}
              onMouseLeave={(e) => e.target.style.color = '#a1a1aa'}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>

      {/* Feedback Modal Overlay */}
      <CallFeedbackModal
        isOpen={showFeedbackModal}
        rating={feedbackRating}
        onRatingSelect={handleStarClick}
        selectedIssues={feedbackIssues}
        onToggleIssue={handleToggleIssue}
        comments={feedbackComments}
        onCommentsChange={setFeedbackComments}
        onSkip={onHangUp}
        onSubmit={handleSubmitFeedback}
      />

      <CustomPopup
        isOpen={popupState.isOpen}
        title={popupState.title}
        message={popupState.message}
        type={popupState.type}
        onClose={() => {
          setPopupState(prev => ({ ...prev, isOpen: false }));
          if (popupState.onConfirm) {
            popupState.onConfirm();
          }
        }}
      />
    </div>
  );
}
