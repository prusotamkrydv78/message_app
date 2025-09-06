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

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('incoming_call', ({ from, offer }) => {
      this.currentCall = { type: 'incoming', otherId: from, status: 'ringing' };
      this.onIncomingCall?.(from, offer);
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

    this.socket.on('ice_candidate', ({ from, candidate }) => {
      if (this.currentCall?.otherId === from && this.peerConnection) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  async startCall(otherId) {
    try {
      if (this.currentCall) throw new Error('Already in a call');
      
      this.currentCall = { type: 'outgoing', otherId, status: 'calling' };
      this.onCallStateChange?.('calling');

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
          this.socket.emit('ice_candidate', { to: otherId, candidate: event.candidate });
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('call_user', { to: otherId, offer });

    } catch (error) {
      this.endCall();
      this.onCallError?.(error.message);
    }
  }

  async answerCall(offer) {
    try {
      if (!this.currentCall || this.currentCall.type !== 'incoming') return;

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
          this.socket.emit('ice_candidate', { to: this.currentCall.otherId, candidate: event.candidate });
        }
      };

      // Set remote description and create answer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer_call', { to: this.currentCall.otherId, answer });
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
      this.socket.emit('decline_call', { to: this.currentCall.otherId });
      this._cleanup();
      this.onCallStateChange?.('declined');
    } else {
      // If somehow decline pressed on outgoing, treat as cancel
      this.endCall();
    }
  }

  endCall() {
    if (this.currentCall) {
      this.socket.emit('end_call', { to: this.currentCall.otherId });
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
}
