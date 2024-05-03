(function (fn) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // call on next available tick
    setTimeout(fn, 0);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
})(main);

function random(min, max) {
  return min + Math.floor(Math.random() * (max + 1 - min));
}

function loadSound(url, context) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {
      context.decodeAudioData(request.response,
      onBuffer = resolve,
      onDecodeBufferError = reject);
    };
    request.onerror = reject;
    request.send();
  });
}

function formatInterval(t) {
  const intervals = [
    [1000, 'second', 'seconds'],
    [60, 'minute', 'minutes'],
    [60, 'hour', 'hours'],
    [24, 'day', 'days'],
  ];
  const split = [];
  for (let i = 0; i < intervals.length; ++i) {
    const [factor] = intervals[i];
    const mod = t % factor;
    split.push(mod);
    t = (t - mod) / factor;
    if (!t) break;
  }
  if (t) split.push(t);
  split.shift(); // remove milliseconds
  if (!split.length) split.push(0);
  const strings = [];
  for (let i = 0; i < split.length; ++i) {
    const [, singular, plural] = intervals[i];
    const num = split[i];
    if (split.length === 1 || num) {
      const unit = split[i] === 1 ? singular : plural;
      strings.push(`${num} ${unit}`);
    }
  }
  return strings.reverse().slice(0, 2).join(' ');
}

async function main() {
  const questionContainer = document.getElementById('question');
  const answerBox = document.getElementById('answer');
  const answerForm = document.getElementById('answerForm');
  const startOver = document.getElementById('startOver');
  const levelContainer = document.getElementById('level');
  const scoreContainer = document.getElementById('score');
  const totalContainer = document.getElementById('total');
  const statsContainer = document.getElementById('stats');
  const statusContainer = document.getElementById('status');
  const emoji = document.getElementById('emoji');
  const lastTime = document.getElementById('last-time');
  const best = document.getElementById('best');
  const context = new AudioContext();
  const sounds = ['correct', 'wrong', 'levelup', 'record'];
  const audio = await (async () => {
    try {
      const buffers = await Promise.all(sounds.map((name) => loadSound(`${name}.opus`, context)));
      return sounds.reduce((acc, name, idx) => {
        return {
          ...acc,
          [name]: buffers[idx],
        };
      }, {});
    } catch (e) {
      return sounds.reduce((acc, name) => ({ ...acc, [name]: null }));
    }
  })();

  const record = {
    score: Number(localStorage.getItem('score') || '0'),
    total: Number(localStorage.getItem('total') || '0'),
    time: Number(localStorage.getItem('time') || '0'),
  };

  best.innerText = record.time ? `Best: ${record.score} / ${record.total} in ${formatInterval(record.time)}` : '';

  let answer = null;
  let score = 0;
  let level = 0;
  let total = 0;
  let done = true; // force initial restart

  let emojiOpacity = 0;

  let startTime = 0;

  const restart = () => {
    answer = null;
    score = 0;
    level = 0;
    total = 0;
    done = false;
    emojiOpacity = 0;
    startOver.classList.add('hidden');
    answerBox.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    statusContainer.classList.remove('hidden');
    startOver.innerText = 'Play again';
    scoreContainer.innerText = score;
    totalContainer.innerText = total;
    levelContainer.innerText = level + 1;
    startTime = Date.now();
    newQuestion();
  };

  answerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (done) {
      restart();
      return;
    }

    const response = Number(answerBox.value);
    if (response === answer) {
      score++;
      scoreContainer.innerText = score;
      setEmoji('✔', 'green', 'correct');
    } else {
      setEmoji(`${answer}`, 'red', 'wrong');
    }

    total++;
    totalContainer.innerText = level * 10 + total;

    if (total >= 10) {
      level++;
      if (score === level * 10) {
        total = 0;
        levelContainer.innerText = level + 1;
        setEmoji('🎉', 'green', 'levelup');
      } else {
        finished();
        return;
      }
    }

    newQuestion();
  });

  const problems = [
    () => { // addition
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      return {
        question: `${num1} + ${num2} = ?`,
        answer: num1 + num2,
      };
    },
    () => { // subtraction
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      return {
        question: `${num1 + num2} - ${num2} = ?`,
        answer: num1,
      };
    },
    () => { // addition with 3 operands
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      const num3 = random(1, 9);
      return {
        question: `${num1} + ${num2} + ${num3} = ?`,
        answer: num1 + num2 + num3,
      };
    },
    // TODO: addition and subtraction (a + b - c)
/*
    () => { // multiplication
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      return {
        question: `${num1} × ${num2} = ?`,
        answer: num1 * num2,
      };
    },
    () => { // division
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      return {
        question: `${num1 * num2} ÷ ${num1} = ?`,
        answer: num2,
      };
    },
    () => { // fractions
      // NOTE: these don't look great in Patrick Hand
      const fractions = [
        ['¼', 1, 4],
        ['½', 1, 2],
        ['¾', 3, 4],
        ['⅐', 1, 7],
        ['⅑', 1, 9],
        ['⅒', 1, 10],
        ['⅓', 1, 3],
        ['⅔', 2, 3],
        ['⅕', 1, 5],
        ['⅖', 2, 5],
        ['⅗', 3, 5],
        ['⅘', 4, 5],
        ['⅙', 1, 6],
        ['⅚', 5, 6],
        ['⅛', 1, 8],
        ['⅜', 3, 8],
        ['⅝', 5, 8],
        ['⅞', 7, 8],
      ];
      const [fraction, numerator, denominator] = fractions[random(0, fractions.length - 1)];
      const integer = random(1, 9);
      return {
        question: `${fraction} of ${integer * denominator} = ?`,
        answer: integer * numerator,
      };
    },
*/
  ];

  const finished = () => {
    const timeTaken = Date.now() - startTime;
    done = true;
    questionContainer.innerText = score === problems.length * 10 ? '🌟 PERFECT! 🌟' : 'GAME OVER';
    levelContainer.innerText = level;
    lastTime.innerText = formatInterval(timeTaken);
    if (score > record.score || score === record.score && timeTaken < record.time) {
      record.score = score;
      record.total = level * 10;
      record.time = timeTaken;
      localStorage.setItem('score', `${record.score}`);
      localStorage.setItem('total', `${record.total}`);
      localStorage.setItem('time', `${record.time}`);
      best.innerText = '🏆 NEW RECORD! 🏆';
      setEmoji('🏆', 'green', 'record');
    } else if (record.total > 0) {
      best.innerText = `Best: ${record.score} / ${record.total} in ${formatInterval(record.time)}`;
    } else {
      best.innerText = '🦆';
    }
    statsContainer.classList.remove('hidden');
    startOver.classList.remove('hidden');
    answerBox.classList.add('hidden');
  };

  const newQuestion = () => {
    if (level >= problems.length) {
      finished();
      return;
    }
    const problem = (problems[(total % 10 && random(0, 2)) ? random(0, level) : level])();
    questionContainer.innerText = problem.question;
    answer = problem.answer;
    answerBox.value = '';
    answerBox.focus();
  };

  const setEmoji = (character, className, sound) => {
    emoji.innerText = character;
    emoji.className = className;

    if (audio[sound]) {
      const source = context.createBufferSource();
      source.buffer = audio[sound];
      source.connect(context.destination);
      source.start();
    }

    restartEmojiFader();
  };

  const restartEmojiFader = () => {
    const prev = emojiOpacity;
    emojiOpacity = 2;
    if (prev <= 0) {
      emojiAnimate();
    }
  };

  const emojiAnimate = () => {
    const fadeDelay = 500;
    const fps = 30;
    const frameDelay = 1000 / fps;
    emoji.style.opacity = Math.min(1, emojiOpacity);
    emojiOpacity -= frameDelay / fadeDelay;
    if (emojiOpacity > 0) {
      setTimeout(emojiAnimate, frameDelay);
    } else {
      emojiOpacity = 0;
      emoji.style.opacity = 0;
    }
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/maths/sw.js', {scope: '/maths/'})
  .then((reg) => {
    // registration worked
    console.log('Registration succeeded. Scope is ' + reg.scope);
  }).catch((error) => {
    // registration failed
    console.log('Registration failed', error);
  });
}
