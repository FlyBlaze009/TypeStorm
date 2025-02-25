const startScreen = document.querySelector('#start-screen');
const gameScreen = document.querySelector('#game-screen');
const startButton = document.querySelector('#start-btn');
const displayText = document.querySelector('#display-text');
const timerElement = document.querySelector('#timer');
const correctSound = new Audio('./assets/sounds/correct.wav');
const incorrectSound = new Audio('./assets/sounds/incorrect.wav');
const backspaceSound = new Audio('./assets/sounds/backspace.wav');

correctSound.preload = 'auto';
incorrectSound.preload = 'auto';
backspaceSound.preload = 'auto';

let timeLeft = 60;
let currentWordIndex = 0;
let currentCharIndex = 0;
let correctChars = 0;
let totalChars = 0;
let words = [];
let bestWPM = Number(localStorage.getItem('bestWPM')) || 0;
let batchSize = 25;
let currentBatchStart = 0;
let timerInterval;

async function fetchWords() {
  try {
    const response = await fetch(
      'https://random-word-api.herokuapp.com/word?number=300'
    );
    words = await response.json();
  } catch (error) {
    console.log('Error fetching quote : ' + error);
    words = ['error', 'loading', 'words', 'please', 'retry'];
  }
}

async function setupWords() {
  displayText.innerHTML = '';

  let wordBatch = words.slice(currentBatchStart, currentBatchStart + batchSize);

  wordBatch.forEach((word) => {
    const wordSpan = document.createElement('span');
    wordSpan.classList.add('word');

    word.split('').forEach((char) => {
      const spanElement = document.createElement('span');
      spanElement.innerText = char;
      wordSpan.appendChild(spanElement);
    });

    displayText.appendChild(wordSpan);

    const space = document.createElement('span');
    space.innerText = ' ';
    displayText.appendChild(space);
  });

  currentWordIndex = 0;
  currentCharIndex = 0;
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 5;
  timerElement.innerText = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerElement.innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      displayStats();
      timerElement.innerText = '';
    }
  }, 1000);
}

function displayStats() {
  let WPM = Math.floor(correctChars / 5);
  if (WPM > bestWPM) {
    bestWPM = WPM;
    localStorage.setItem('bestWPM', bestWPM);
  }
  let accuracy =
    totalChars > 0 ? ((correctChars / totalChars) * 100).toFixed(2) : '0.00';

  document.getElementById('wpm-result').innerText = WPM;
  document.getElementById('accuracy-result').innerText = accuracy + '%';
  document.getElementById('high-score').innerText = bestWPM;

  gameScreen.style.display = 'none';
  document.getElementById('results-screen').style.display = 'block';
}

async function startGame() {
  timeLeft = 60;
  currentWordIndex = 0;
  currentCharIndex = 0;
  correctChars = 0;
  totalChars = 0;
  currentBatchStart = 0;
  displayText.innerHTML = '';

  await fetchWords();
  await setupWords();
  timerElement.innerText = timeLeft;
  startTimer();
}

function playSound(sound) {
  const clone = sound.cloneNode();
  clone.volume = 1.0;
  clone.play().catch((err) => console.log('Audio playback error:', err));
}

document.addEventListener('keydown', async (event) => {
  if (timeLeft <= 0) return;
  if (event.key.length > 1 && event.key !== 'Backspace' && event.key !== ' ')
    return;

  const wordSpans = displayText.querySelectorAll('.word');
  const currentWordSpan = wordSpans[currentWordIndex];
  const charElements = currentWordSpan.querySelectorAll('span');

  if (event.key === 'Backspace') {
    playSound(backspaceSound);
    if (currentCharIndex > 0) {
      currentCharIndex--;
      charElements[currentCharIndex].classList.remove('correct', 'incorrect');
    } else if (currentWordIndex > 0) {
      currentWordIndex--;
      currentCharIndex = words[currentWordIndex].length;
      const prevWordChars =
        wordSpans[currentWordIndex].querySelectorAll('span');
      prevWordChars[currentCharIndex - 1].classList.remove(
        'correct',
        'incorrect'
      );
    }
    return;
  }

  if (event.key === ' ') {
    if (currentCharIndex === words[currentWordIndex].length) {
      currentWordIndex++;
      currentCharIndex = 0;
    }
    return;
  }
  totalChars++;

  if (event.key === words[currentWordIndex][currentCharIndex]) {
    correctChars++;
    playSound(correctSound);
    charElements[currentCharIndex].classList.add('correct');
  } else {
    charElements[currentCharIndex].classList.add('incorrect');
    playSound(incorrectSound);
  }

  currentCharIndex++;

  if (currentCharIndex === words[currentWordIndex].length) {
    currentWordIndex++;
    currentCharIndex = 0;

    //user finishes a batch
    if (currentWordIndex >= currentBatchStart + batchSize) {
      currentBatchStart += batchSize; //moving to the next batch

      if (currentBatchStart < words.length) {
        setupWords(); // Load next batch
      } else {
        // this condition will almost never occur
        await fetchWords();
        currentBatchStart = 0;
        currentWordIndex = 0;
        setupWords();
      }
    }
  }
});

startButton.addEventListener('click', async () => {
  startScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  startGame();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && timeLeft <= 0) {
    document.getElementById('results-screen').style.display = 'none';
    gameScreen.style.display = 'block';
    startGame();
  }
});
