export class AudioCore {
  constructor(audio1, audio2) {
    this.audioElements = { 1: audio1, 2: audio2 };
    this.activeIdx = 1;
    this.initialized = false;
    this.nodes = {};
    this.buffers = {};
    this.ctx = null;
  }

  async init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.nodes.source1 = this.ctx.createMediaElementSource(this.audioElements[1]);
    this.nodes.gain1 = this.ctx.createGain();
    this.nodes.gain1.gain.value = 1; 
    this.nodes.source1.connect(this.nodes.gain1);

    this.nodes.source2 = this.ctx.createMediaElementSource(this.audioElements[2]);
    this.nodes.gain2 = this.ctx.createGain();
    this.nodes.gain2.gain.value = 0; 
    this.nodes.source2.connect(this.nodes.gain2);

    this.nodes.bandpass = this.ctx.createBiquadFilter();
    this.nodes.distortion = this.ctx.createWaveShaper();
    this.nodes.ducking = this.ctx.createGain(); 
    
    // Reverb
    this.nodes.reverbDelayA = this.ctx.createDelay();
    this.nodes.reverbFeedbackA = this.ctx.createGain();
    this.nodes.reverbDelayB = this.ctx.createDelay();
    this.nodes.reverbFeedbackB = this.ctx.createGain();
    this.nodes.reverbFilter = this.ctx.createBiquadFilter();

    this.nodes.reverbFeedbackA.gain.value = 0; 
    this.nodes.reverbFeedbackB.gain.value = 0; 
    this.nodes.reverbFilter.type = "highpass";
    this.nodes.reverbFilter.frequency.value = 150; 
    
    this.nodes.analyser = this.ctx.createAnalyser();
    this.nodes.analyser.fftSize = 64;
    this.nodes.mainGain = this.ctx.createGain();

    // Enrutamiento
    this.nodes.gain1.connect(this.nodes.bandpass);
    this.nodes.gain2.connect(this.nodes.bandpass);
    
    this.nodes.bandpass.connect(this.nodes.distortion);
    
    this.nodes.distortion.connect(this.nodes.ducking);
    this.nodes.distortion.connect(this.nodes.reverbDelayA);
    this.nodes.distortion.connect(this.nodes.reverbDelayB);

    this.nodes.reverbDelayA.connect(this.nodes.reverbFeedbackA);
    this.nodes.reverbFeedbackA.connect(this.nodes.reverbDelayA);
    this.nodes.reverbFeedbackA.connect(this.nodes.reverbFilter);

    this.nodes.reverbDelayB.connect(this.nodes.reverbFeedbackB);
    this.nodes.reverbFeedbackB.connect(this.nodes.reverbDelayB);
    this.nodes.reverbFeedbackB.connect(this.nodes.reverbFilter);

    this.nodes.reverbFilter.connect(this.nodes.ducking);

    this.nodes.ducking.connect(this.nodes.analyser);
    this.nodes.analyser.connect(this.nodes.mainGain);
    this.nodes.mainGain.connect(this.ctx.destination); 

    this._generateNoiseBuffers();
    this.nodes.staticGain = this.ctx.createGain();
    this.nodes.staticGain.gain.value = 0;
    this.nodes.staticGain.connect(this.ctx.destination);

    this.initialized = true;
  }

  _generateNoiseBuffers() {
    const bufferSize = this.ctx.sampleRate * 2.0; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    this.buffers.estatica = buffer;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  getAnalyser() { return this.nodes.analyser; }

  // 🔥 VOLUMEN INMEDIATO (sin rampa)
  setVolume(value) {
    if (!this.initialized) return;
    this.nodes.mainGain.gain.setValueAtTime(Math.pow(value, 2), this.ctx.currentTime);
  }

  setFilterStyle(style) {
    if (!this.initialized) return;
    if (style === "radio") {
      this.nodes.bandpass.type = "bandpass";
      this.nodes.bandpass.frequency.value = 1200;
      this.nodes.distortion.curve = this._makeDistortionCurve(5);
    } else if (style === "afuera") {
      this.nodes.bandpass.type = "lowpass";
      this.nodes.bandpass.frequency.value = 350;
      this.nodes.distortion.curve = this._makeBypassCurve();
    } else {
      this.nodes.bandpass.type = "allpass";
      this.nodes.distortion.curve = this._makeBypassCurve();
    }
  }

  setEnvStyle(style) {
    if (!this.initialized) return;
    if (style === "dry") {
      this.nodes.reverbFeedbackA.gain.value = 0; 
      this.nodes.reverbFeedbackB.gain.value = 0; 
    } else if (style === "entorno") {
      this.nodes.reverbDelayA.delayTime.value = 0.089; 
      this.nodes.reverbDelayB.delayTime.value = 0.113; 
      this.nodes.reverbFeedbackA.gain.value = 0.42; 
      this.nodes.reverbFeedbackB.gain.value = 0.42; 
    }
  }

  crossfade(newIdx) {
    if (!this.initialized || newIdx === this.activeIdx) return;
    const now = this.ctx.currentTime;
    const currentGain = this.nodes[`gain${this.activeIdx}`];
    const nextGain = this.nodes[`gain${newIdx}`];

    nextGain.gain.cancelScheduledValues(now);
    nextGain.gain.setValueAtTime(0, now);
    nextGain.gain.linearRampToValueAtTime(1, now + 1.2);

    currentGain.gain.cancelScheduledValues(now);
    currentGain.gain.setValueAtTime(currentGain.gain.value, now);
    currentGain.gain.linearRampToValueAtTime(0, now + 1.2);

    this.activeIdx = newIdx;
  }

  startTuning() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    
    this.nodes.ducking.gain.cancelScheduledValues(now);
    this.nodes.ducking.gain.setValueAtTime(0.01, now);
    
    if (this.nodes.staticSource) {
       try { this.nodes.staticSource.stop(); } catch(e){}
    }
    
    this.nodes.staticSource = this.ctx.createBufferSource();
    this.nodes.staticSource.buffer = this.buffers.estatica;
    this.nodes.staticSource.loop = true;
    
    this.nodes.staticFilter = this.ctx.createBiquadFilter();
    this.nodes.staticFilter.type = "bandpass";
    this.nodes.staticFilter.frequency.value = 1100;
    
    this.nodes.staticSource.connect(this.nodes.staticFilter);
    this.nodes.staticFilter.connect(this.nodes.staticGain);
    
    this.nodes.staticGain.gain.cancelScheduledValues(now);
    this.nodes.staticGain.gain.setValueAtTime(0.18, now);
    
    this.nodes.staticSource.start();
  }

  stopTuning() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    
    this.nodes.staticGain.gain.cancelScheduledValues(now);
    this.nodes.staticGain.gain.setValueAtTime(this.nodes.staticGain.gain.value, now);
    this.nodes.staticGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    this.nodes.ducking.gain.cancelScheduledValues(now);
    this.nodes.ducking.gain.setValueAtTime(this.nodes.ducking.gain.value, now);
    this.nodes.ducking.gain.linearRampToValueAtTime(1.0, now + 0.45);
    
    setTimeout(() => {
      if (this.nodes.staticSource) {
         try { this.nodes.staticSource.stop(); } catch(e){}
      }
    }, 450);
  }

  // 🔥 NUEVO: Detener completamente el motor (para apagar)
  stop() {
    if (!this.initialized) return;
    // Detener ruido de sintonía
    if (this.nodes.staticSource) {
      try { this.nodes.staticSource.stop(); } catch(e) {}
      this.nodes.staticSource = null;
    }
    this.nodes.staticGain.gain.setValueAtTime(0, this.ctx.currentTime);
    // Restaurar ducking a 1
    this.nodes.ducking.gain.setValueAtTime(1, this.ctx.currentTime);
    // Restaurar ganancia principal a 1 (por si acaso)
    this.nodes.mainGain.gain.setValueAtTime(1, this.ctx.currentTime);
    // Resetear ganancias de los canales de audio (por si quedan)
    this.nodes.gain1.gain.setValueAtTime(1, this.ctx.currentTime);
    this.nodes.gain2.gain.setValueAtTime(0, this.ctx.currentTime);
    // Nota: no suspendemos el contexto porque puede ser reusado, pero limpiamos estados
  }

  _makeBypassCurve() {
    const curve = new Float32Array(44100);
    for (let i = 0; i < 44100; ++i) curve[i] = i * 2 / 44100 - 1; 
    return curve;
  }

  _makeDistortionCurve(amount) {
    const curve = new Float32Array(44100);
    const deg = Math.PI / 180;
    for (let i = 0; i < 44100; ++i) {
      let x = i * 2 / 44100 - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}