// WebRTC Voice Call Manager
export class CallManager {
  constructor(socket, userId, accessToken) {
    this.socket = socket;
    this.userId = userId;
    this.accessToken = accessToken;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null; // { type: 'outgoing'|'incoming', otherId, status }
    this.callStartTime = null;
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
        this.callStartTime = new Date();
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
        this.callStartTime = new Date();
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

  async declineCall() {
    if (!this.currentCall) return;
    if (this.currentCall.type === 'incoming') {
      // Notify caller and locally end with 'declined'
      this.socket.emit('decline_call', { to: this.currentCall.otherId });
      
      // Create call record for declined call
      await this._createCallRecord('declined');
      
      this._cleanup();
      this.onCallStateChange?.('declined');
    } else {
      // If somehow decline pressed on outgoing, treat as cancel
      this.endCall();
    }
  }

  async endCall() {
    if (this.currentCall) {
      this.socket.emit('end_call', { to: this.currentCall.otherId });
      
      // Create call record
      await this._createCallRecord('ended');
    }
    this._cleanup();
    this.onCallStateChange?.('ended');
  }

  async _createCallRecord(status) {
    if (!this.currentCall || !this.accessToken) return;
    
    try {
      const duration = this.callStartTime ? Math.floor((new Date() - this.callStartTime) / 1000) : 0;
      
      const { api } = await import('./api.js');
      await api.createCall(this.accessToken, {
        recipient: this.currentCall.otherId,
        type: 'voice',
        status,
        duration,
        startedAt: this.callStartTime?.toISOString(),
        endedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create call record:', error);
    }
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
    this.callStartTime = null;
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

// WebRTC Video Call Manager
export class VideoCallManager {
  constructor(socket, userId, accessToken) {
    this.socket = socket;
    this.userId = userId;
    this.accessToken = accessToken;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null; // { type: 'outgoing'|'incoming', otherId, status }
    this.callStartTime = null;
    this.onCallStateChange = null;
    this.onIncomingCall = null;
    this.onCallError = null;
    this.isMuted = false;
    this.isCameraOff = false;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('incoming_video_call', ({ from, offer }) => {
      this.currentCall = { type: 'incoming', otherId: from, status: 'ringing' };
      this.onIncomingCall?.(from, offer);
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

    this.socket.on('video_ice_candidate', ({ from, candidate }) => {
      if (this.currentCall?.otherId === from && this.peerConnection) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    this.socket.on('video_mute_toggled', ({ from, isMuted }) => {
      // Handle remote user mute toggle if needed
    });

    this.socket.on('video_camera_toggled', ({ from, isCameraOff }) => {
      // Handle remote user camera toggle if needed
    });
  }

  async startVideoCall(otherId) {
    try {
      if (this.currentCall) throw new Error('Already in a call');
      
      this.currentCall = { type: 'outgoing', otherId, status: 'calling' };
      this.onCallStateChange?.('calling');

      // Get user media with video and audio
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
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
        this.callStartTime = new Date();
        this.onCallStateChange?.('connected');
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('video_ice_candidate', { to: otherId, candidate: event.candidate });
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('video_call_user', { to: otherId, offer });

    } catch (error) {
      this.endCall();
      this.onCallError?.(error.message);
    }
  }

  async answerVideoCall(offer) {
    try {
      if (!this.currentCall || this.currentCall.type !== 'incoming') return;

      // Get user media with video and audio
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
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
        this.callStartTime = new Date();
        this.onCallStateChange?.('connected');
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('video_ice_candidate', { to: this.currentCall.otherId, candidate: event.candidate });
        }
      };

      // Set remote description and create answer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer_video_call', { to: this.currentCall.otherId, answer });
      this.currentCall.status = 'connected';

    } catch (error) {
      this.declineVideoCall();
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

  async declineVideoCall() {
    if (!this.currentCall) return;
    if (this.currentCall.type === 'incoming') {
      this.socket.emit('decline_video_call', { to: this.currentCall.otherId });
      
      // Create call record for declined call
      await this._createCallRecord('declined');
      
      this._cleanup();
      this.onCallStateChange?.('declined');
    } else {
      this.endCall();
    }
  }

  async endCall() {
    if (this.currentCall) {
      this.socket.emit('end_video_call', { to: this.currentCall.otherId });
      
      // Create call record
      await this._createCallRecord('ended');
    }
    this._cleanup();
    this.onCallStateChange?.('ended');
  }

  async _createCallRecord(status) {
    if (!this.currentCall || !this.accessToken) return;
    
    try {
      const duration = this.callStartTime ? Math.floor((new Date() - this.callStartTime) / 1000) : 0;
      
      const { api } = await import('./api.js');
      await api.createCall(this.accessToken, {
        recipient: this.currentCall.otherId,
        type: 'video',
        status,
        duration,
        startedAt: this.callStartTime?.toISOString(),
        endedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create call record:', error);
    }
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
    this.callStartTime = null;
    this.isMuted = false;
    this.isCameraOff = false;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        // Notify remote user
        if (this.currentCall) {
          this.socket.emit('toggle_video_mute', { 
            to: this.currentCall.otherId, 
            isMuted: this.isMuted 
          });
        }
        return this.isMuted;
      }
    }
    return false;
  }

  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isCameraOff = !videoTrack.enabled;
        // Notify remote user
        if (this.currentCall) {
          this.socket.emit('toggle_video_camera', { 
            to: this.currentCall.otherId, 
            isCameraOff: this.isCameraOff 
          });
        }
        return this.isCameraOff;
      }
    }
    return false;
  }

  getLocalVideoElement() {
    if (!this.localStream) return null;
    const video = document.createElement('video');
    video.srcObject = this.localStream;
    video.autoplay = true;
    video.muted = true; // Always mute local video to prevent feedback
    return video;
  }

  getRemoteVideoElement() {
    if (!this.remoteStream) return null;
    const video = document.createElement('video');
    video.srcObject = this.remoteStream;
    video.autoplay = true;
    return video;
  }
}
