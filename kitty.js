// ========================
// kitty.js (Enhanced)
// ========================
//
// External definitions in kitty_txt.js:
//   let project = 'AioLinguaEnglish';
//   let firstAudio = 'https://aiopop.com/KittyCoach/C/AioLinguaEnglish001.mp3';
//   let availableLanguages = [...];
//   let lessons = [...];
//   let snippetDataMap = {...};
//   let professionalLanguages = [...];
//   let mp3Menus = {...};

// DOM Elements
const audioElement = document.getElementById('audio');
const snippetCounterButton = document.getElementById('snippet-counter-button');
const playPauseButton = document.getElementById('play-pause');
const nightModeToggle = document.getElementById('night-mode-toggle');
const audioFileNameDisplay = document.getElementById('audio-file-name');
const titleElement = document.getElementById('title');

const speedToggleButton = document.getElementById('speed-toggle');
const speedSliderContainer = document.getElementById('new-speed-slider-container');
const speedSlider = document.getElementById('new-speed-slider');
const speedDisplay = document.getElementById('new-speed-display');

const pauseToggleButton = document.getElementById('pause-toggle');
const contLoopToggle = document.getElementById('cont-loop-toggle');
const modeIndicator = document.getElementById('mode-indicator');
const nextSnippetButton = document.getElementById('next-snippet');
const lastSnippetButton = document.getElementById('last-snippet');
const rewind3Button = document.getElementById('rewind-3');
const forward3Button = document.getElementById('forward-3');
const snippetCounter = document.getElementById('snippet-counter-button');
const fontToggleButton = document.getElementById('font-toggle');

const lessonDisplay = document.getElementById('lesson-display');

const initialModal = document.getElementById('initial-file-modal');
const closeInitialModalButton = document.getElementById('close-initial-modal');
const initialFileInput = document.getElementById('initial-audio-file');
const serverMp3List = document.getElementById('server-mp3-list');
const loadSelectedMp3Button = document.getElementById('load-selected-mp3');
const audioFileButton = document.getElementById('open-modal-button');

// Possibly unused
const landscapeControls = document.getElementById('landscape-controls');
const speedToggleLandscapeButton = document.getElementById('speed-toggle-landscape');
const nextSnippetLandscape = document.getElementById('next-snippet-landscape');
const lastSnippetLandscape = document.getElementById('last-snippet-landscape');

// Global Variables
let currentAudioFile = null;
let snippets = [];
let isPlaying = false;
let playbackSpeed = 1.0;
let currentLesson = null;
let isLoopMode = false;
let currentLoopSnippet = null;

// Dual-language columns
let language1 = 'English'; // left column
let language2 = 'French';  // right column

// Speech Synthesis
let speechSynthesisUtterance = null;

// Speed array (for short-press cycle)
const playbackSpeeds = [1.0, 0.75, 0.5];
let currentSpeedIndex = 0;

// Font toggles
const fontSizes = ['18px', '21px', '24px', '27px', '12px', '15px'];
let currentFontSizeIndex = 0;
const rtlLanguages = ["Arabic", "Hebrew", "Persian", "Urdu", "Yiddish"];

const fontFamilies = [
  'Courier New, Courier, monospace',
  'Arial, sans-serif',
  'Times New Roman, Times, serif',
  'Verdana, Geneva, sans-serif',
  'Georgia, serif'
];
let currentFontFamilyIndex = 0;

// Pause durations
const pauseDurations = [0, 1000, 2000, 3000, 4000];
let currentPauseIndex = 0;

// For speed slider (long press)
let longPressTimer = null;
const longPressDuration = 500;
let isSliderVisible = false;

// We'll track if a "long press" actually occurred to avoid double-trigger (short-press).
let didLongPress = false;

/** =============================================
 *  1) Utility / Data-Handling
 * ===========================================**/
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function saveSnippetsToLocalStorage(fileName, snippetsArray) {
  let allSnippets = JSON.parse(localStorage.getItem('kittycoach_snippets')) || {};
  allSnippets[fileName] = snippetsArray;
  localStorage.setItem('kittycoach_snippets', JSON.stringify(allSnippets));
}

function loadSnippetsFromLocalStorage(fileName) {
  let allSnippets = JSON.parse(localStorage.getItem('kittycoach_snippets')) || {};
  return allSnippets[fileName] || [];
}

/**
 * Extract trailing digits from file name
 * e.g. "AioLinguaChinese001.mp3" => "AioLinguaChinese001" => "001".
 */
function extractBaseName(fileNameOrUrl) {
  let fileName;
  try {
    const url = new URL(fileNameOrUrl);
    fileName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
  } catch (e) {
    // If it's not a valid URL, we treat fileNameOrUrl as just a string:
    fileName = fileNameOrUrl;
  }

  // remove extension
  let withoutExt = fileName.replace(/\.[^/.]+$/, '');
  let fullBaseName = withoutExt;

  // get trailing digits
  const match = withoutExt.match(/(\d+)$/);
  let baseName = match ? match[1] : null;

  return { fullBaseName, baseName };
}


function findLessonByIdentifier(identifier) {
  const lessonId = parseInt(identifier, 10);
  if (isNaN(lessonId)) {
    console.error('Invalid lesson identifier:', identifier);
    return null;
  }
  const lesson = lessons.find(lesson => lesson.id === lessonId) || null;
  return lesson;
}

/** Check if the language has professional audio for lessons 1-20. */
function hasProfessionalAudio(lang, lessonId) {
  return (
    professionalLanguages.includes(lang) &&
    lessonId > 0 &&
    lessonId <= 20
  );
}

function loadSnippetsForLanguage(lang, baseName) {
  const dataArray = snippetDataMap[lang];
  if (!dataArray) return [];
  const filtered = dataArray.filter(entry => entry[0] === baseName);
  return filtered.map(entry => ({
    start: entry[1] / 1000.0,
    end: entry[2] / 1000.0
  }));
}

/** =============================================
 *  2) Local Storage for Settings
 * ===========================================**/
function saveCurrentSettings() {
  const settings = {
    language1: language1,
    language2: language2,
    fontSizeIndex: currentFontSizeIndex,
    fontFamilyIndex: currentFontFamilyIndex,
    playbackSpeed: playbackSpeed
  };
  localStorage.setItem('kittycoach_settings', JSON.stringify(settings));
}

function loadSettingsFromLocalStorage() {
  return JSON.parse(localStorage.getItem('kittycoach_settings')) || {};
}

function applySettings() {
  const settings = loadSettingsFromLocalStorage();
  if (settings.language1 && availableLanguages.some(l => l.label === settings.language1)) {
    language1 = settings.language1;
  }
  if (settings.language2 && availableLanguages.some(l => l.label === settings.language2)) {
    language2 = settings.language2;
  }

  if (typeof settings.fontSizeIndex === 'number' && settings.fontSizeIndex < fontSizes.length) {
    currentFontSizeIndex = settings.fontSizeIndex;
  } else {
    currentFontSizeIndex = 0;
  }

  if (typeof settings.fontFamilyIndex === 'number' && settings.fontFamilyIndex < fontFamilies.length) {
    currentFontFamilyIndex = settings.fontFamilyIndex;
  } else {
    currentFontFamilyIndex = 0;
  }

  if (typeof settings.playbackSpeed === 'number') {
    playbackSpeed = settings.playbackSpeed;
    audioElement.playbackRate = playbackSpeed;
  }

  document.body.style.fontSize = fontSizes[currentFontSizeIndex];
  document.body.style.fontFamily = fontFamilies[currentFontFamilyIndex];
}

/** =============================================
 *  3) Speech Synthesis
 * ===========================================**/
function speakText(text, langCode) {
  if (!('speechSynthesis' in window)) {
    alert('Sorry, your browser does not support speech synthesis.');
    return;
  }
  window.speechSynthesis.cancel();
  speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
  speechSynthesisUtterance.lang = langCode;
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(voice => voice.lang === langCode);
  if (selectedVoice) {
    speechSynthesisUtterance.voice = selectedVoice;
  }
  window.speechSynthesis.speak(speechSynthesisUtterance);
}

window.speechSynthesis.onvoiceschanged = () => {
  window.voices = window.speechSynthesis.getVoices();
};

/** =============================================
 *  4) Lesson Display (Two Columns)
 * ===========================================**/
function displayLesson() {
  if (!currentLesson) {
    console.error('No lesson loaded to display.');
    return;
  }
  lessonDisplay.innerHTML = '';

  const table = document.createElement('table');
  table.id = 'lesson-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const th1 = document.createElement('th');
  th1.textContent = language1;
  headerRow.appendChild(th1);

  const th2 = document.createElement('th');
  th2.textContent = language2;
  headerRow.appendChild(th2);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const l1Obj = availableLanguages.find(l => l.label === language1);
  const l2Obj = availableLanguages.find(l => l.label === language2);
  const l1Code = l1Obj ? l1Obj.code : 'en-US';
  const l2Code = l2Obj ? l2Obj.code : 'en-US';

  currentLesson.sentences.forEach(sentence => {
    const row = document.createElement('tr');

    // Left col => language1
    const cellL1 = document.createElement('td');
    cellL1.style.padding = '8px';
    cellL1.style.border = '1px solid #ccc';
    if (sentence.translations && sentence.translations[language1]) {
      cellL1.textContent = sentence.translations[language1];
      cellL1.addEventListener('click', () => {
        speakText(sentence.translations[language1], l1Code);
      });
    } else if (language1 === 'original' && sentence.original) {
      cellL1.textContent = sentence.original;
    } else {
      cellL1.textContent = 'N/A';
    }
    row.appendChild(cellL1);

    // Right col => language2
    const cellL2 = document.createElement('td');
    cellL2.style.padding = '8px';
    cellL2.style.border = '1px solid #ccc';
    if (sentence.translations && sentence.translations[language2]) {
      cellL2.textContent = sentence.translations[language2];
      cellL2.style.cursor = 'pointer';
      cellL2.addEventListener('click', () => {
        speakText(sentence.translations[language2], l2Code);
      });
    } else {
      cellL2.textContent = 'N/A';
    }

    // if language2 is e.g. Arabic => RTL
    if (rtlLanguages.includes(language2)) {
      cellL2.setAttribute('dir', 'rtl');
      cellL2.style.textAlign = 'right';
    } else {
      cellL2.setAttribute('dir', 'ltr');
      cellL2.style.textAlign = 'left';
    }

    row.appendChild(cellL2);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  // Wrap table
  const tableContainer = document.createElement('div');
  tableContainer.style.width = '90%';
  tableContainer.style.maxHeight = '80vh';
  tableContainer.style.overflowY = 'auto';
  tableContainer.style.margin = '0 auto';

  // style headers
  const ths = table.querySelectorAll('th');
  ths.forEach(th => {
    th.style.border = '1px solid #ccc';
    th.style.padding = '8px';
    th.style.backgroundColor = '#f2f2f2';
  });
  // style cells
  const tds = table.querySelectorAll('td');
  tds.forEach(td => {
    td.style.border = '1px solid #ccc';
    td.style.padding = '8px';
  });

  tableContainer.appendChild(table);
  lessonDisplay.appendChild(tableContainer);

  // apply font/size
  table.style.fontSize = fontSizes[currentFontSizeIndex];
  table.style.fontFamily = fontFamilies[currentFontFamilyIndex];
}

/** =============================================
 *  5) Initialize Language Selectors
 * ===========================================**/
function initializeLanguageSelectors() {
  const lang1Select = document.getElementById('language1-selector');
  const lang2Select = document.getElementById('language2-selector');
  if (!lang1Select || !lang2Select) {
    console.warn('Language selectors not found in HTML.');
    return;
  }

  // Populate both L1 and L2 selects:
  availableLanguages.forEach(lang => {
    const opt1 = document.createElement('option');
    opt1.value = lang.label;
    opt1.textContent = lang.label;
    if (lang.label === language1) opt1.selected = true;
    lang1Select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = lang.label;
    opt2.textContent = lang.label;
    if (lang.label === language2) opt2.selected = true;
    lang2Select.appendChild(opt2);
  });

  // Helper to build the typical audio file name, e.g. "AioLinguaFrench005.mp3"
  function zeroPad(num, digits) {
    return String(num).padStart(digits, '0');
  }

  // L1 change => stop audio, then check if new L1 has professional audio
  lang1Select.addEventListener('change', () => {
    // Stop old audio
    audioElement.pause();
    audioElement.currentTime = 0;
    isPlaying = false;
    playPauseButton.textContent = '▶';

    // Update global language1
    language1 = lang1Select.value;
    saveCurrentSettings();

    // Figure out which lesson ID we’re on (fallback to lesson 1)
    const lessonId = currentLesson?.id || 1;

    // Check if new L1 has pro audio for the current lesson
    if (hasProfessionalAudio(language1, lessonId)) {
      // Build the new audio filename & URL
      const newAudioFile = `AioLingua${language1}${zeroPad(lessonId, 3)}.mp3`;
      const newAudioUrl = `https://aiopop.com/KittyCoach/C/${newAudioFile}`;
      // Load the matching audio & snippets
      loadAudioFile(newAudioUrl, newAudioUrl);
    } else {
      // If not pro audio, just reload the lesson text
      loadLessonAndDisplay(lessonId);
    }
  });

  // L2 change => just reload text (no special audio logic)
  lang2Select.addEventListener('change', () => {
    language2 = lang2Select.value;
    saveCurrentSettings();
    loadLessonAndDisplay(currentLesson?.id || 1);
  });
}


/** =============================================
 *  6) Show/Hide Snippet Controls
 * ===========================================**/
function updateUIForSnippet() {
  if (!currentLesson) return;
  const lessonId = currentLesson.id;
  const canHaveSnippets = hasProfessionalAudio(language1, lessonId);

  const snippetControls = [
    playPauseButton,
    contLoopToggle,
    modeIndicator,
    nextSnippetButton,
    lastSnippetButton,
    speedToggleButton,
    speedToggleLandscapeButton,
    pauseToggleButton,
    snippetCounterButton,
    rewind3Button,
    forward3Button
  ];

  snippetControls.forEach(ctrl => {
    if (!ctrl) return;
    ctrl.style.display = canHaveSnippets ? 'inline-block' : 'none';
  });

  if (snippetCounter) {
    snippetCounter.style.display = canHaveSnippets ? 'inline-block' : 'none';
  }

  // font toggle + night mode always visible
  if (fontToggleButton) fontToggleButton.style.display = 'inline-block';
  if (nightModeToggle) nightModeToggle.style.display = 'inline-block';
}

/** =============================================
 *  7) Load a Lesson & Display
 * ===========================================**/
function loadLessonAndDisplay(lessonId) {
  currentLesson = lessons.find(lesson => lesson.id === lessonId);
  if (!currentLesson) {
    console.error('Lesson not found:', lessonId);
    return;
  }
  displayLesson();
  updateUIForSnippet();
}

/** =============================================
 *  8) loadAudioFile
 *  (FORCE snippet data from snippetDataMap, ignoring localStorage)
 * ===========================================**/
function loadAudioFile(src, name) {
  audioElement.src = src;
  currentAudioFile = name;
  audioElement.loop = true;

  const { fullBaseName, baseName } = extractBaseName(name);
  audioFileNameDisplay.textContent = fullBaseName;

  if (!baseName) {
    alert('Audio file is incorrect. Use format like "English001.mp3".');
    audioFileNameDisplay.textContent = 'No audio file loaded.';
    snippets = [];
    audioElement.loop = false;
    saveSnippetsToLocalStorage(currentAudioFile, snippets);
    updateSnippetCounterDisplay();  // just to reset "0/0"
    lessonDisplay.innerHTML = '';
    return;
  }

  currentLesson = findLessonByIdentifier(baseName);
  if (!currentLesson) {
    alert('No matching lesson found for: ' + baseName);
    console.error('Invalid lesson identifier:', baseName);
    audioFileNameDisplay.textContent = 'No audio file loaded.';
    snippets = [];
    audioElement.loop = false;
    saveSnippetsToLocalStorage(currentAudioFile, snippets);
    updateSnippetCounterDisplay();  // just to reset "0/0"
    lessonDisplay.innerHTML = '';
    return;
  }

  // If pro-audio is available, load snippet data:
  if (hasProfessionalAudio(language1, currentLesson.id)) {
    snippets = loadSnippetsForLanguage(language1, baseName);
  } else {
    // No snippet data
    snippets = [];
  }

  // Sort & save
  snippets.sort((a, b) => a.start - b.start);
  saveSnippetsToLocalStorage(currentAudioFile, snippets);

  // Display the lesson + snippet controls
  loadLessonAndDisplay(currentLesson.id);

  // Right after loading snippet data, show how many we have
  updateSnippetCounterDisplay();

  applySettings();

  localStorage.setItem('kitty_lastPlayedAudio', src);

  audioElement.play()
    .then(() => {
      isPlaying = true;
      playPauseButton.textContent = '⏸';
    })
    .catch(() => {
      playPauseButton.textContent = '▶';
    });

  hideInitialModal();
}

/** =============================================
 *  9) Snippet Event Logic
 * ===========================================**/
function updateSnippetCounterDisplay() {
  if (!snippetCounterButton) return;
  const total = snippets.length;
  if (total === 0) {
    snippetCounterButton.textContent = "0/0";
    return;
  }
  if (!isLoopMode || !currentLoopSnippet) {
    snippetCounterButton.textContent = `0/${total}`;
  } else {
    const currentIndex = snippets.indexOf(currentLoopSnippet);
    const snippetNumber = (currentIndex === -1) ? 1 : (currentIndex + 1);
    snippetCounterButton.textContent = `${snippetNumber}/${total}`;
  }
}

function findSnippetIndexByTime(time) {
  for (let i = 0; i < snippets.length; i++) {
    if (time >= snippets[i].start && time <= snippets[i].end) return i;
  }
  return -1;
}

function setCurrentLoopSnippet(index) {
  if (index < 0 || index >= snippets.length) return;
  currentLoopSnippet = snippets[index];
  audioElement.currentTime = currentLoopSnippet.start;
  audioElement.play();
  isPlaying = true;
  playPauseButton.textContent = '⏸';
  updateSnippetCounterDisplay();
}

function handleLooping() {
  if (!currentLoopSnippet) return;
  if (audioElement.currentTime >= currentLoopSnippet.end) {
    audioElement.pause();
    const pauseDuration = pauseDurations[currentPauseIndex];
    if (pauseDuration > 0) {
      setTimeout(() => {
        audioElement.currentTime = currentLoopSnippet.start;
        audioElement.play();
      }, pauseDuration);
    } else {
      audioElement.currentTime = currentLoopSnippet.start;
      audioElement.play();
    }
    updateSnippetCounterDisplay();
  }
}

function enterLoopMode() {
  if (snippets.length === 0 || !currentLesson) {
    alert('No snippets available to loop.');
    contLoopToggle.disabled = true;
    return;
  }
  const currentTime = audioElement.currentTime;
  let snippetIndex = findSnippetIndexByTime(currentTime);
  if (snippetIndex === -1) {
    let closestSnippet = snippets.reduce((prev, curr) => {
      return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
    }, snippets[0]);
    currentLoopSnippet = closestSnippet;
  } else {
    currentLoopSnippet = snippets[snippetIndex];
  }
  modeIndicator.classList.remove('continuous');
  modeIndicator.classList.add('loop');
  contLoopToggle.textContent = 'Loop';

  audioElement.removeEventListener('timeupdate', handleLooping);
  audioElement.addEventListener('timeupdate', handleLooping);

  updateSnippetCounterDisplay();
}

function exitLoopMode() {
  currentLoopSnippet = null;
  modeIndicator.classList.remove('loop');
  modeIndicator.classList.add('continuous');
  contLoopToggle.textContent = 'Cont.';
  audioElement.removeEventListener('timeupdate', handleLooping);
  updateSnippetCounterDisplay();
}

/** =============================================
 * 10) Button Event Listeners
 * ===========================================**/
function showInitialModal() {
  if (initialModal) {
    initialModal.style.display = 'block';
  }
  fillMp3Menu(); // DYNAMIC MP3 MENU based on language1
}
function hideInitialModal() {
  if (initialModal) initialModal.style.display = 'none';
}
if (audioFileButton) {
  audioFileButton.addEventListener('click', function(event) {
    event.preventDefault();
    showInitialModal();
  });
}
if (closeInitialModalButton) {
  closeInitialModalButton.addEventListener('click', hideInitialModal);
}
window.addEventListener('click', function(event) {
  if (event.target === initialModal) {
    hideInitialModal();
  }
});
window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && initialModal && initialModal.style.display === 'block') {
    hideInitialModal();
  }
});

/** The function that populates serverMp3List dynamically */
function fillMp3Menu() {
  let menuArray = mp3Menus[language1]; // e.g. "English", "Chinese", ...
  if (!menuArray) {
    // fallback if no professional audio set for that language
    menuArray = mp3Menus.noProfessional;
  }

  // Clear existing options
  serverMp3List.innerHTML = "";

  // Always add a blank top option
  const blankOpt = document.createElement('option');
  blankOpt.value = "";
  blankOpt.textContent = "Select a chapter";
  serverMp3List.appendChild(blankOpt);

  // Populate from the chosen array
  menuArray.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    serverMp3List.appendChild(opt);
  });
}

// =========================
// MODIFIED LOAD LOGIC BELOW
// =========================
if (loadSelectedMp3Button) {
  loadSelectedMp3Button.addEventListener('click', function() {

    // 1) If user chose a local file
    if (initialFileInput?.files && initialFileInput.files[0]) {
      const file = initialFileInput.files[0];
      const fileURL = URL.createObjectURL(file);
      loadAudioFile(fileURL, file.name);
      return;
    }

    // 2) Otherwise, user selected something from the dropdown
    const selectedUrl = serverMp3List?.value;

    // If user did NOT pick anything at all, let's just load text from baseName=1 or do nothing
    // (No more alerts - we do not bug them about picking an MP3)
    if (!selectedUrl) {
      // If they literally didn't pick anything, you can simply return or load a default:
      // e.g. loadLessonAndDisplay(1);
      // or do nothing at all. We'll just do nothing:
      hideInitialModal();
      return;
    }

    // Try parsing the lesson ID from selectedUrl
    const { baseName } = extractBaseName(selectedUrl);
    if (!baseName) {
      // If we can't parse digits from the selection, fallback to do nothing or default lesson
      hideInitialModal();
      return;
    }

    // Find the lesson by that ID
    const candidateLesson = findLessonByIdentifier(baseName);
    if (!candidateLesson) {
      // If there's no matching lesson, do nothing or default
      hideInitialModal();
      return;
    }

    // If we have professional audio => load audio + text
    if (hasProfessionalAudio(language1, candidateLesson.id)) {
      loadAudioFile(selectedUrl, selectedUrl);
    } else {
      // Otherwise, load text ONLY
      hideInitialModal();

      // Clear old audio state
      audioElement.src = '';
      currentAudioFile = null;
      isPlaying = false;

      // Load the new lesson
      currentLesson = candidateLesson;
      loadLessonAndDisplay(candidateLesson.id);

      // Clear old snippet data
      snippets = [];
      saveSnippetsToLocalStorage('kitty_NoAudio_' + candidateLesson.id, snippets);
      updateSnippetCounterDisplay();
      applySettings();
    }
  });
}

// Snippet Buttons
if (playPauseButton) {
  playPauseButton.addEventListener('click', function() {
    if (!currentAudioFile) {
      alert('Please load an audio file first.');
      return;
    }
    if (isPlaying) {
      audioElement.pause();
      playPauseButton.textContent = '▶';
      isPlaying = false;
    } else {
      audioElement.play().then(() => {
        isPlaying = true;
        playPauseButton.textContent = '⏸';
      }).catch(error => {
        alert('Unable to play audio. Please try again.');
        console.error(error);
      });
    }
  });
}

if (contLoopToggle) {
  contLoopToggle.addEventListener('click', function() {
    if (!isLoopMode) {
      isLoopMode = true;
      enterLoopMode();
    } else {
      isLoopMode = false;
      exitLoopMode();
    }
    saveCurrentSettings();
  });
}

if (nextSnippetButton) {
  nextSnippetButton.addEventListener('click', function() {
    if (snippets.length === 0) {
      alert('No snippets available.');
      return;
    }
    if (isLoopMode && currentLoopSnippet) {
      let currentIndex = snippets.indexOf(currentLoopSnippet);
      if (currentIndex === -1) currentIndex = 0;
      let nextIndex = (currentIndex + 1) % snippets.length;
      setCurrentLoopSnippet(nextIndex);
    } else {
      let snippetIndex = findSnippetIndexByTime(audioElement.currentTime);
      if (snippetIndex === -1) {
        let currentTime = audioElement.currentTime;
        let closestSnippet = snippets.reduce((prev, curr) => {
          return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
        }, snippets[0]);
        currentLoopSnippet = closestSnippet;
      } else {
        currentLoopSnippet = snippets[snippetIndex];
      }
      isLoopMode = true;
      modeIndicator.classList.remove('continuous');
      modeIndicator.classList.add('loop');
      contLoopToggle.textContent = 'Loop';
      audioElement.removeEventListener('timeupdate', handleLooping);
      audioElement.addEventListener('timeupdate', handleLooping);

      audioElement.currentTime = currentLoopSnippet.start;
      audioElement.play();
      isPlaying = true;
      playPauseButton.textContent = '⏸';
      updateSnippetCounterDisplay();
    }
    saveCurrentSettings();
  });
}

if (lastSnippetButton) {
  lastSnippetButton.addEventListener('click', function() {
    if (snippets.length === 0) {
      alert('No snippets available.');
      return;
    }
    if (isLoopMode && currentLoopSnippet) {
      let currentIndex = snippets.indexOf(currentLoopSnippet);
      if (currentIndex === -1) currentIndex = 0;
      let prevIndex = (currentIndex - 1 + snippets.length) % snippets.length;
      setCurrentLoopSnippet(prevIndex);
    } else {
      let snippetIndex = findSnippetIndexByTime(audioElement.currentTime);
      if (snippetIndex === -1) {
        let currentTime = audioElement.currentTime;
        let closestSnippet = snippets.reduce((prev, curr) => {
          return (Math.abs(curr.start - currentTime) < Math.abs(prev.start - currentTime)) ? curr : prev;
        }, snippets[0]);
        currentLoopSnippet = closestSnippet;
      } else {
        currentLoopSnippet = snippets[snippetIndex];
      }
      isLoopMode = true;
      modeIndicator.classList.remove('continuous');
      modeIndicator.classList.add('loop');
      contLoopToggle.textContent = 'Loop';
      audioElement.removeEventListener('timeupdate', handleLooping);
      audioElement.addEventListener('timeupdate', handleLooping);

      audioElement.currentTime = currentLoopSnippet.start;
      audioElement.play();
      isPlaying = true;
      playPauseButton.textContent = '⏸';
      updateSnippetCounterDisplay();
    }
    saveCurrentSettings();
  });
}

if (rewind3Button) {
  rewind3Button.addEventListener('click', function() {
    if (audioElement.duration && !isNaN(audioElement.duration)) {
      audioElement.currentTime = Math.max(audioElement.currentTime - 3, 0);
    }
  });
}

if (forward3Button) {
  forward3Button.addEventListener('click', function() {
    if (audioElement.duration && !isNaN(audioElement.duration)) {
      audioElement.currentTime = Math.min(audioElement.currentTime + 3, audioElement.duration);
    }
  });
}

if (pauseToggleButton) {
  pauseToggleButton.addEventListener('click', function() {
    currentPauseIndex = (currentPauseIndex + 1) % pauseDurations.length;
    const duration = pauseDurations[currentPauseIndex];
    let displayText;
    switch (duration) {
      case 0: displayText = 'P0'; break;
      case 1000: displayText = 'P1'; break;
      case 2000: displayText = 'P2'; break;
      case 3000: displayText = 'P3'; break;
      case 4000: displayText = 'P4'; break;
      default: displayText = `P${currentPauseIndex}`;
    }
    pauseToggleButton.textContent = displayText;
  });
}

/** =============================================
 * 11) Font Toggles
 * ===========================================**/
if (fontToggleButton) {
  fontToggleButton.addEventListener('click', () => {
    currentFontSizeIndex = (currentFontSizeIndex + 1) % fontSizes.length;
    const selectedFontSize = fontSizes[currentFontSizeIndex];
    document.body.style.fontSize = selectedFontSize;
    const lessonTable = document.getElementById('lesson-table');
    if (lessonTable) {
      lessonTable.style.fontSize = selectedFontSize;
    }
    saveCurrentSettings();
  });

  const styleToggleButton = document.createElement('button');
  styleToggleButton.className = 'button';
  styleToggleButton.id = 'style-toggle';
  styleToggleButton.title = 'Toggle Font Family';
  styleToggleButton.setAttribute('aria-label', 'Toggle Font Family');
  styleToggleButton.textContent = 'F';
  fontToggleButton.parentNode.insertBefore(styleToggleButton, fontToggleButton.nextSibling);

  styleToggleButton.addEventListener('click', () => {
    if (toggleFontFamily.isDebouncing) return;
    toggleFontFamily.isDebouncing = true;
    setTimeout(() => { toggleFontFamily.isDebouncing = false; }, 300);

    currentFontFamilyIndex = (currentFontFamilyIndex + 1) % fontFamilies.length;
    const selectedFontFamily = fontFamilies[currentFontFamilyIndex];
    document.body.style.fontFamily = selectedFontFamily;
    const lessonTable = document.getElementById('lesson-table');
    if (lessonTable) {
      lessonTable.style.fontFamily = selectedFontFamily;
    }
    saveCurrentSettings();
  });

  function toggleFontFamily() {
    // empty
  }
}

/** =============================================
 * 12) Night Mode Toggle
 * ===========================================**/
if (nightModeToggle) {
  nightModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('night-mode');
    if (document.body.classList.contains('night-mode')) {
      nightModeToggle.textContent = '☀️';
    } else {
      nightModeToggle.textContent = '🌙';
    }
  });
}

/** =============================================
 * 13) Window OnLoad
 * ===========================================**/
window.addEventListener('load', function() {
  applySettings();
  initializeLanguageSelectors();
  updateUIForSnippet();

  let lastPlayedAudio = localStorage.getItem('kitty_lastPlayedAudio');
  if (lastPlayedAudio) {
    loadAudioFile(lastPlayedAudio, lastPlayedAudio);
  } else {
    loadAudioFile(firstAudio, firstAudio);
  }
});

/** =============================================
 * 14) Speed Slider (Long Press)
 * ===========================================**/
document.addEventListener('DOMContentLoaded', function() {
  loadSpeedSetting();

  if (speedToggleButton) {
    // For the short-press toggle (1.0 -> 0.75 -> 0.5 -> back to 1.0)
    speedToggleButton.addEventListener('click', function(evt) {
      // If we just performed a long press, ignore the short press
      if (didLongPress) {
        // Reset the flag and skip short press logic
        didLongPress = false;
        return;
      }
      // Otherwise, cycle playback speeds:
      cycleSpeedQuickToggle();
    });

    speedToggleButton.addEventListener('mousedown', handleLongPressStart);
    speedToggleButton.addEventListener('mouseup', handleLongPressEnd);
    speedToggleButton.addEventListener('mouseleave', handleLongPressEnd);
    speedToggleButton.addEventListener('touchstart', handleLongPressStart);
    speedToggleButton.addEventListener('touchend', handleLongPressEnd);
    speedToggleButton.addEventListener('touchcancel', handleLongPressEnd);
  }

  if (speedSlider) {
    speedSlider.addEventListener('input', function() {
      const speed = parseFloat(this.value).toFixed(2);
      speedDisplay.textContent = `${speed}x`;
      audioElement.playbackRate = speed;
      if (speedToggleButton) speedToggleButton.textContent = `${speed}x`;
      saveSpeedSetting(parseFloat(speed));
    });
    speedSlider.addEventListener('change', function() {
      hideSpeedSlider();
    });
  }

  document.addEventListener('click', function(event) {
    if (!speedSliderContainer.contains(event.target) && event.target !== speedToggleButton) {
      hideSpeedSlider();
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      hideSpeedSlider();
    }
  });
});

/** For short-press: cycle speeds 1.0->0.75->0.5->back to 1.0 */
function cycleSpeedQuickToggle() {
  currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
  const newSpeed = playbackSpeeds[currentSpeedIndex];
  audioElement.playbackRate = newSpeed;
  if (speedToggleButton) speedToggleButton.textContent = `${newSpeed.toFixed(2)}x`;
  saveSpeedSetting(newSpeed);
}

function loadSpeedSetting() {
  const settings = loadSettingsFromLocalStorage();
  if (settings.playbackSpeed) {
    speedSlider.value = settings.playbackSpeed.toFixed(2);
    speedDisplay.textContent = `${settings.playbackSpeed}x`;
    audioElement.playbackRate = parseFloat(settings.playbackSpeed);
    if (speedToggleButton) {
      speedToggleButton.textContent = `${settings.playbackSpeed}x`;
    }
  }
}

function saveSpeedSetting(speed) {
  const settings = loadSettingsFromLocalStorage();
  settings.playbackSpeed = speed;
  localStorage.setItem('kittycoach_settings', JSON.stringify(settings));
}

function showSpeedSlider() {
  if (isSliderVisible) return;
  isSliderVisible = true;
  speedSliderContainer.classList.add('show');
  speedSliderContainer.setAttribute('aria-hidden', 'false');

  speedSlider.value = audioElement.playbackRate.toFixed(2);
  speedDisplay.textContent = `${speedSlider.value}x`;
  if (speedToggleButton) {
    speedToggleButton.textContent = `${speedSlider.value}x`;
  }
}

function hideSpeedSlider() {
  speedSliderContainer.classList.remove('show');
  speedSliderContainer.setAttribute('aria-hidden', 'true');
  isSliderVisible = false;
}

/** On long-press, show the slider. */
function handleLongPressStart(event) {
  event.preventDefault();
  didLongPress = false; // reset
  longPressTimer = setTimeout(() => {
    // The user performed a real long press
    didLongPress = true;
    showSpeedSlider();
  }, longPressDuration);
}

function handleLongPressEnd() {
  clearTimeout(longPressTimer);
}


// Image Enlarger Functionality
(function() {
    const headerContainer = document.getElementById('headerImageContainer');
    const headerImage = document.getElementById('headerImage');
    const imageOverlay = document.getElementById('imageOverlay');
    const enlargedImage = document.getElementById('enlargedImage');

    function openOverlay(src, alt) {
        enlargedImage.src = src;
        enlargedImage.alt = alt || 'Enlarged Image';
        imageOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
        imageOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    headerContainer.addEventListener('click', () => {
        openOverlay(headerImage.src, headerImage.alt);
    });

    imageOverlay.addEventListener('click', (e) => {
        if (e.target === imageOverlay || e.target === enlargedImage) {
            closeOverlay();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageOverlay.classList.contains('active')) {
            closeOverlay();
        }
    });
})();


// Function to check if the user has already consented
function checkBanner() {
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) {
    document.getElementById('cookie-banner').classList.remove('hidden');
  }
}

// Function to close the banner and store consent
function closeBanner() {
  document.getElementById('cookie-banner').classList.add('hidden');
  localStorage.setItem('cookieConsent', 'true');
}

// Ensure the functions are available globally
window.checkBanner = checkBanner;
window.closeBanner = closeBanner;

// Attach functions to window onload
window.onload = function() {
  checkBanner();
};
