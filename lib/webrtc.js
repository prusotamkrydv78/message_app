// WebRTC Voice Call Manager
export class CallManager {
  constructor(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null; // { type: 'outgoing'|'incoming', otherId, status }
    this.onCallStateChange = null;
    this.onIncomingCall = null;
    this.onCallError = null;
    this._facingMode = 'user'; // 'user' (front) | 'environment' (rear)

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Voice call events
    this.socket.on('incoming_call', ({ from, offer }) => {
      this.currentCall = { type: 'incoming', otherId: from, status: 'ringing', isVideo: false };
      this.onIncomingCall?.(from, offer, false);
    });

    this.socket.on('call_answered', ({ from, answer }) => {
      if (this.currentCall?.otherId === from) {
        this.handleAnswer(answer);
      }
    });

    this.socket.on('call_declined', ({ from }) => {
      if (this.currentCall?.otherId === from) {
        this.endCall();
        this.onCallStateChange?.('declined');
      }
    });

    this.socket.on('call_ended', ({ from }) => {
      if (this.currentCall?.otherId === from) {
        this.endCall();
        this.onCallStateChange?.('ended');
      }
    });

    this.socket.on('call_error', ({ message }) => {
      this.onCallError?.(message);
    });

    // Video call events
    this.socket.on('incoming_video_call', ({ from, offer }) => {
      this.currentCall = { type: 'incoming', otherId: from, status: 'ringing', isVideo: true };
      this.onIncomingCall?.(from, offer, true);
    });

    this.socket.on('video_call_answered', ({ from, answer }) => {
      if (this.currentCall?.otherId === from) {
        this.handleAnswer(answer);
      }
    });

    this.socket.on('video_call_declined', ({ from }) => {
      if (this.currentCall?.otherId === from) {
        this.endCall();
        this.onCallStateChange?.('declined');
      }
    });

    this.socket.on('video_call_ended', ({ from }) => {
      if (this.currentCall?.otherId === from) {
        this.endCall();
        this.onCallStateChange?.('ended');
      }
    });

    this.socket.on('video_call_error', ({ message }) => {
      this.onCallError?.(message);
    });

    // ICE candidates for both voice and video
    this.socket.on('ice_candidate', ({ from, candidate }) => {
      if (this.currentCall?.otherId === from && this.peerConnection) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });

    this.socket.on('video_ice_candidate', ({ from, candidate }) => {
      if (this.currentCall?.otherId === from && this.peerConnection) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });
  }

  async startCall(otherId, isVideo = false) {
    try {
      if (this.currentCall) throw new Error('Already in a call');
      
      this.currentCall = { type: 'outgoing', otherId, status: 'calling', isVideo };
      this.onCallStateChange?.('calling');

      // Get user media
      const constraints = isVideo 
        ? {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: {
              facingMode: { ideal: this._facingMode },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 24, max: 30 },
            },
          }
        : {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection with STUN/TURN for production
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
      const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
      const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
      const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
      if (turnUrl && turnUser && turnCred) {
        iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
      }
      this.peerConnection = new RTCPeerConnection({ iceServers });

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onCallStateChange?.('connected');
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const iceEvent = isVideo ? 'video_ice_candidate' : 'ice_candidate';
          this.socket.emit(iceEvent, { to: otherId, candidate: event.candidate });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        //console.log('Connection state:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'connected') {
          this.onCallStateChange?.('connected');
        } else if (this.peerConnection.connectionState === 'failed') {
          this.endCall();
          this.onCallError?.('Connection failed');
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      const eventName = isVideo ? 'video_call_user' : 'call_user';
      this.socket.emit(eventName, { to: otherId, offer });

    } catch (error) {
      this.endCall();
      this.onCallError?.(error.message);
    }
  }

  async answerCall(offer) {
    try {
      if (!this.currentCall || this.currentCall.type !== 'incoming') return;

      const isVideo = this.currentCall.isVideo;
      
      // Get user media
      const constraints = isVideo 
        ? {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: {
              facingMode: { ideal: this._facingMode },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 24, max: 30 },
            },
          }
        : {
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onCallStateChange?.('connected');
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const eventName = isVideo ? 'video_ice_candidate' : 'ice_candidate';
          this.socket.emit(eventName, { to: this.currentCall.otherId, candidate: event.candidate });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        //console.log('Connection state:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'connected') {
          this.onCallStateChange?.('connected');
        } else if (this.peerConnection.connectionState === 'failed') {
          this.endCall();
          this.onCallError?.('Connection failed');
        }
      };

      // Set remote description and create answer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      const eventName = isVideo ? 'answer_video_call' : 'answer_call';
      this.socket.emit(eventName, { to: this.currentCall.otherId, answer });
      this.currentCall.status = 'connected';

    } catch (error) {
      this.declineCall();
      this.onCallError?.(error.message);
    }
  }

  async handleAnswer(answer) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.currentCall.status = 'connected';
      }
    } catch (error) {
      this.endCall();
      this.onCallError?.(error.message);
    }
  }

  declineCall() {
    if (!this.currentCall) return;
    if (this.currentCall.type === 'incoming') {
      // Notify caller and locally end with 'declined'
      const eventName = this.currentCall.isVideo ? 'decline_video_call' : 'decline_call';
      this.socket.emit(eventName, { to: this.currentCall.otherId });
      this._cleanup();
      this.onCallStateChange?.('declined');
    } else {
      // If somehow decline pressed on outgoing, treat as cancel
      this.endCall();
    }
  }

  endCall() {
    if (this.currentCall) {
      const eventName = this.currentCall.isVideo ? 'end_video_call' : 'end_call';
      this.socket.emit(eventName, { to: this.currentCall.otherId });
    }
    this._cleanup();
    this.onCallStateChange?.('ended');
  }

  _cleanup() {
    // Clean up streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    // Clean up peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.currentCall = null;
  }

  getRemoteAudioElement() {
    if (!this.remoteStream) return null;
    const audio = document.createElement('audio');
    audio.srcObject = this.remoteStream;
    audio.autoplay = true;
    return audio;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // return muted state
      }
    }
    return false;
  }
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // return videoOff state
      }
    }
    return false;
  }

  // Switch between front and rear camera on supported devices
  async toggleCamera() {
    if (!this.localStream) return false;
    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return false;

    // Flip desired facing mode
    this._facingMode = this._facingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this._facingMode } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return false;

      // Replace track in local stream
      this.localStream.removeTrack(currentVideoTrack);
      currentVideoTrack.stop();
      this.localStream.addTrack(newVideoTrack);

      // Replace track in sender
      const sender = this.peerConnection?.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) await sender.replaceTrack(newVideoTrack);

      return true;
    } catch (e) {
      //console.error('toggleCamera failed', e);
      // revert facing mode on failure
      this._facingMode = this._facingMode === 'user' ? 'environment' : 'user';
      this.onCallError?.('Unable to switch camera');
      return false;
    }
  }
}
