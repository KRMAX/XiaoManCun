const DURATION = 94;
const FADE = 1.4;

const scenes = Array.from(document.querySelectorAll(".scene")).map((node) => ({
  node,
  media: node.querySelector(".scene-media"),
  start: Number(node.dataset.start),
  end: Number(node.dataset.end),
  marker: node.dataset.marker,
  x0: Number(node.dataset.x0),
  y0: Number(node.dataset.y0),
  x1: Number(node.dataset.x1),
  y1: Number(node.dataset.y1),
  s0: Number(node.dataset.s0),
  s1: Number(node.dataset.s1),
}));

const lines = [
  {
    start: 1,
    end: 5,
    speaker: "系统",
    text: "凌晨的城市还亮着，只有你的工位也还亮着。",
    tone: "pressure",
  },
  {
    start: 5.4,
    end: 9.7,
    speaker: "主角",
    text: "房租、绩效、消息提醒，一样都没停。",
    tone: "pressure",
  },
  {
    start: 10.2,
    end: 14.4,
    speaker: "外婆 · 语音",
    text: "院子的钥匙，我放在门槛下了。累了，就回来看看。",
    tone: "phone",
  },
  {
    start: 15.5,
    end: 20.6,
    speaker: "系统",
    text: "电梯下行，雨声涌上来。你第一次没有回头。",
    tone: "caption",
  },
  {
    start: 22.4,
    end: 27,
    speaker: "系统",
    text: "第二天清晨，长途车驶出高架，山路把城市慢慢留在身后。",
    tone: "caption",
  },
  {
    start: 30.2,
    end: 34.6,
    speaker: "系统",
    text: "车门打开，潮湿的风和稻田的味道一起涌过来。",
    tone: "caption",
  },
  {
    start: 35.2,
    end: 40.5,
    speaker: "主角",
    text: "原来脚踩到这条路上，才知道自己真的回来了。",
    tone: "memory",
  },
  {
    start: 44,
    end: 49.5,
    speaker: "主角",
    text: "离家越近，手机信号越弱，心里反而越安静。",
    tone: "memory",
  },
  {
    start: 50.5,
    end: 55.5,
    speaker: "司机师傅",
    text: "前面拐过竹林就是村口。赶集日可热闹，别睡过站了。",
    tone: "dialogue",
  },
  {
    start: 58,
    end: 63.8,
    speaker: "村广播",
    text: "小满村春耕互助登记今天开始，县城周六集市摊位同步开放。",
    tone: "phone",
  },
  {
    start: 68,
    end: 73.4,
    speaker: "系统",
    text: "旧院子比记忆里小，却把春天装得满满当当。",
    tone: "caption",
  },
  {
    start: 75,
    end: 80.5,
    speaker: "邻居 · 刘婶",
    text: "你外婆说过，这块地不急。先把屋里灯点上，人回来了就好。",
    tone: "dialogue",
  },
  {
    start: 82,
    end: 87,
    speaker: "系统",
    text: "灶台、旧账本、半袋稻种，都在等一个新的开始。",
    tone: "memory",
  },
  {
    start: 89,
    end: 92.8,
    speaker: "系统",
    text: "春一日，天气晴。今天的任务：翻土、播种，去村委会报到。",
    tone: "caption",
  },
];

const chapterLabel = document.getElementById("chapterLabel");
const timecode = document.getElementById("timecode");
const speaker = document.getElementById("speaker");
const lineText = document.getElementById("lineText");
const messageCard = document.getElementById("messageCard");
const progressFill = document.getElementById("progressFill");
const playButton = document.getElementById("playButton");
const replayButton = document.getElementById("replayButton");
const soundButton = document.getElementById("soundButton");
const skipButton = document.getElementById("skipButton");
const enterButton = document.getElementById("enterButton");
const titleCard = document.getElementById("titleCard");
const sceneStack = document.getElementById("sceneStack");
const previewParams = new URLSearchParams(window.location.search);
const previewTime = Number(previewParams.get("t"));

let current = Number.isFinite(previewTime)
  ? Math.max(0, Math.min(DURATION, previewTime))
  : 0;
let playing = previewParams.get("paused") !== "1";
let lastTick = performance.now();
let audioEnabled = false;
let audioReady = false;
let audioCtx;
let audioGraph;
let spokenLineKey = "";
let selectedVoice = null;
let nextBirdAt = 0;
let nextMusicAt = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function setGain(gainNode, value) {
  if (!audioCtx || !gainNode) return;
  gainNode.gain.setTargetAtTime(value, audioCtx.currentTime, 0.18);
}

function makeNoiseSource(filterType, frequency) {
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  source.buffer = buffer;
  source.loop = true;
  filter.type = filterType;
  filter.frequency.value = frequency;
  gain.gain.value = 0;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioGraph.master);
  source.start();

  return gain;
}

function makeOscillator(type, frequency) {
  const oscillator = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  filter.type = "lowpass";
  filter.frequency.value = 220;
  gain.gain.value = 0;

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioGraph.master);
  oscillator.start();

  return gain;
}

function createAudioGraph() {
  audioGraph = {};
  audioGraph.master = audioCtx.createGain();
  audioGraph.master.gain.value = 0;
  audioGraph.master.connect(audioCtx.destination);

  audioGraph.rain = makeNoiseSource("highpass", 950);
  audioGraph.city = makeOscillator("sine", 54);
  audioGraph.engine = makeOscillator("sawtooth", 72);
  audioGraph.river = makeNoiseSource("bandpass", 720);
  audioGraph.wind = makeNoiseSource("lowpass", 1800);
  audioReady = true;
}

async function enableAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    audioCtx = new AudioContext();
    createAudioGraph();
  }

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  audioEnabled = true;
  spokenLineKey = "";
  updateSoundButton();
  return true;
}

function disableAudio() {
  audioEnabled = false;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (audioGraph) setGain(audioGraph.master, 0);
  updateSoundButton();
}

function updateSoundButton() {
  if (!soundButton) return;
  soundButton.textContent = audioEnabled ? "声音开" : "声音关";
  soundButton.classList.toggle("is-on", audioEnabled);
  soundButton.setAttribute("aria-pressed", String(audioEnabled));
}

function loadVoices() {
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  selectedVoice =
    voices.find((voice) => voice.lang === "zh-CN") ||
    voices.find((voice) => voice.lang.startsWith("zh")) ||
    voices[0] ||
    null;
}

function speakLine(line) {
  if (!audioEnabled || !playing || !window.speechSynthesis || !line) return;

  const key = `${line.start}-${line.text}`;
  if (spokenLineKey === key) return;
  spokenLineKey = key;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(line.text);
  utterance.lang = "zh-CN";
  utterance.voice = selectedVoice;
  utterance.rate = line.speaker.includes("外婆") ? 0.84 : 0.92;
  utterance.pitch = line.speaker.includes("外婆")
    ? 1.08
    : line.speaker.includes("司机") || line.speaker.includes("刘婶")
      ? 0.9
      : 1;
  utterance.volume = 0.92;
  window.speechSynthesis.speak(utterance);
}

function playChirp() {
  if (!audioReady || !playing) return;
  const now = audioCtx.currentTime;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1200 + Math.random() * 360, now);
  oscillator.frequency.exponentialRampToValueAtTime(1900 + Math.random() * 400, now + 0.12);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(audioGraph.master);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function playMusicPluck() {
  if (!audioReady || !playing) return;
  const now = audioCtx.currentTime;
  const notes = [261.63, 293.66, 329.63, 392, 440];
  const note = notes[Math.floor(Math.random() * notes.length)];
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(note, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  oscillator.connect(gain);
  gain.connect(audioGraph.master);
  oscillator.start(now);
  oscillator.stop(now + 1.25);
}

function updateAmbientAudio(t) {
  if (!audioEnabled || !audioReady || !audioCtx) return;

  const active = playing ? 1 : 0;
  setGain(audioGraph.master, active * 0.74);
  setGain(audioGraph.rain, active * (t < 22 ? (t < 11 ? 0.045 : 0.11) : 0));
  setGain(audioGraph.city, active * (t < 22 ? 0.045 : 0));
  setGain(audioGraph.engine, active * (t >= 20 && t < 31 ? 0.06 : 0));
  setGain(audioGraph.river, active * (t >= 43 && t < 66 ? 0.055 : 0));
  setGain(audioGraph.wind, active * (t >= 29 ? 0.035 : 0));

  if (t >= 29 && t < 86 && audioCtx.currentTime > nextBirdAt) {
    playChirp();
    nextBirdAt = audioCtx.currentTime + 2.2 + Math.random() * 2.1;
  }

  if (t >= 30 && t < 93 && audioCtx.currentTime > nextMusicAt) {
    playMusicPluck();
    nextMusicAt = audioCtx.currentTime + 3.1 + Math.random() * 1.8;
  }
}

function sceneOpacity(scene, t) {
  if (t < scene.start || t > scene.end) return 0;
  const fadeIn = smoothstep(scene.start, scene.start + FADE, t);
  const fadeOut = 1 - smoothstep(scene.end - FADE, scene.end, t);
  return Math.min(fadeIn, fadeOut);
}

function clockFor(t) {
  if (t < 11) return "00:43";
  if (t < 22) return "01:18";
  if (t < 31) return "06:12";
  if (t < 45) return "07:12";
  if (t < 56) return "07:28";
  if (t < 78) return "08:05";
  if (t < 86) return "08:32";
  return "春 1 日";
}

function setMessage(t) {
  const activeLine = lines.find((line) => t >= line.start && t <= line.end);

  if (!activeLine || t >= DURATION - 1.4) {
    messageCard.className = "message-card";
    spokenLineKey = "";
    return;
  }

  speaker.textContent = activeLine.speaker;
  lineText.textContent = activeLine.text;
  messageCard.className = `message-card is-visible is-${activeLine.tone}`;
  speakLine(activeLine);
}

function render(t) {
  const progress = clamp(t / DURATION, 0, 1);
  progressFill.style.width = `${progress * 100}%`;
  timecode.textContent = clockFor(t);

  let visibleMarker = scenes[0].marker;
  let strongestOpacity = 0;

  scenes.forEach((scene) => {
    const opacity = sceneOpacity(scene, t);
    scene.node.style.opacity = opacity.toFixed(3);

    if (opacity > strongestOpacity) {
      strongestOpacity = opacity;
      visibleMarker = scene.marker;
    }

    const local = clamp((t - scene.start) / (scene.end - scene.start), 0, 1);
    const eased = smoothstep(0, 1, local);
    const x = lerp(scene.x0, scene.x1, eased);
    const y = lerp(scene.y0, scene.y1, eased);
    const scale = lerp(scene.s0, scene.s1, eased);
    scene.media.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale})`;
  });

  chapterLabel.textContent = visibleMarker;
  sceneStack.style.setProperty(
    "--rain-opacity",
    t < 22 ? (t < 11 ? "0.18" : "0.34") : "0"
  );
  sceneStack.style.setProperty(
    "--pressure-opacity",
    t < 10.8 ? "0.92" : "0"
  );

  setMessage(t);
  updateAmbientAudio(t);
  titleCard.classList.toggle("is-visible", t >= DURATION - 1.5);
  playButton.textContent = playing ? "暂停" : "播放";
}

function tick(now) {
  const delta = (now - lastTick) / 1000;
  lastTick = now;

  if (playing) {
    current = Math.min(DURATION, current + delta);
    if (current >= DURATION) {
      playing = false;
    }
  }

  render(current);
  requestAnimationFrame(tick);
}

function restart() {
  current = 0;
  playing = true;
  spokenLineKey = "";
  lastTick = performance.now();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  render(current);
}

playButton.addEventListener("click", () => {
  playing = !playing;
  lastTick = performance.now();
  if (!playing && window.speechSynthesis) window.speechSynthesis.pause();
  if (playing && window.speechSynthesis) window.speechSynthesis.resume();
  render(current);
});

replayButton.addEventListener("click", restart);
enterButton.addEventListener("click", restart);
soundButton.addEventListener("click", async () => {
  if (audioEnabled) {
    disableAudio();
    return;
  }

  const enabled = await enableAudio();
  if (enabled) render(current);
});

skipButton.addEventListener("click", () => {
  current = DURATION;
  playing = false;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  render(current);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) playing = false;
  if (document.hidden && window.speechSynthesis) window.speechSynthesis.cancel();
  lastTick = performance.now();
  render(current);
});

if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

updateSoundButton();
render(current);
requestAnimationFrame(tick);
