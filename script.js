(function (fn) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // call on next available tick
    setTimeout(fn, 0);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
})(main);

class TalkBox {
  constructor(el) {
    this.container = el;
    this.queue = [];
  }

  say(message) {
    if (!this.queue.length) {
      setTimeout(this.flush.bind(this), 0);
    }
    this.queue.push(message);
  }

  flush() {
    if (this.queue.length) {
      this.container.innerText = this.queue.join("\n");
      this.queue = [];
    }
  }
}

class UI {
  constructor(audio) {
    this.elements = new Map();
    this.emojiOpacity = 0;

    this.audio = audio;

    this.talk = new TalkBox(this.get('accessibleMessage'));
  }

  init(record) {
    this.setBestTime(record);
    this.emojiOpacity = 0;
  }

  setGame(game) {
    this.game = game;
  }

  start() {
    this.get('answerForm').addEventListener('submit', this.onSubmit.bind(this));
  }

  onSubmit(event) {
    event.preventDefault();

    if (!this.game.isStarted()) {
      this.restart();
      return;
    }

    const response = this.getAnswer();
    this.game.onAnswer(response);

    if (this.game.isStarted()) {
      this.setScore(this.game.getScore());
      this.setTotal(this.game.getTotal());

      this.game.newQuestion();
    }
  };

  setText(id, text) {
    const el = this.get(id);
    el.innerText = text;
    return el;
  }

  setTotal(total) {
    return this.setText('total', total);
  }

  get(id) {
    if (this.elements.has(id)) {
      return this.elements.get(id);
    }
    const el = document.getElementById(id);
    this.elements.set(id, el);
    return el;
  }

  formatInterval(t) {
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

  setGameOver(text, accessible) {
    const el = this.setText('question', text);
    this.talk.say(accessible);
    return el;
  }

  addClass(id, cl) {
    const el = this.get(id);
    el.classList.add(cl);
    return el;
  }

  removeClass(id, cl) {
    const el = this.get(id);
    el.classList.remove(cl);
    return el;
  }

  restart() {
    this.emojiOpacity = 0;
    this.hide('startOver');
    const answerBox = this.show('answer');
    setTimeout(() => answerBox.focus(), 0);
    this.hide('stats');
    this.show('status');
    this.setText('startOver', 'Play again');
    this.setText('score', '0');
    this.setText('total', '0');
    this.setText('level', '1🔸');

    this.game.restart();
  }

  setBestTime(record) {
    const interval = this.formatInterval(record.time);
    return this.setText('best', record.time ? `Best: ${record.score} / ${record.total} in ${interval}` : '');
  }

  setEmoji(character, className, sound) {
    const el = this.setText('emoji', character);
    el.className = className;

    this.audio.play(sound);

    this.restartEmojiFader();
  };

  restartEmojiFader() {
    const prev = this.emojiOpacity;
    this.emojiOpacity = 2;
    if (prev <= 0) {
      this.emojiAnimate();
    }
  };

  emojiAnimate() {
    const fadeDelay = 500;
    const fps = 30;
    const frameDelay = 1000 / fps;
    this.get('emoji').style.opacity = Math.min(1, this.emojiOpacity);
    this.emojiOpacity -= frameDelay / fadeDelay;
    if (this.emojiOpacity > 0) {
      setTimeout(this.emojiAnimate.bind(this), frameDelay);
    } else {
      this.emojiOpacity = 0;
      this.get('emoji').style.opacity = 0;
    }
  };

  getAnswer() {
    return Number(this.get('answer').value);
  }

  setScore(score) {
    return this.setText('score', score);
  }

  updateScore() {
    return this.setScore(this.game.getScore());
  }

  updateTotal() {
    return this.setTotal(this.game.getTotal());
  }

  updateLevel(emoji) {
    return this.setText('level', `${this.game.getLevel()}${emoji}`);
  }

  levelUpUnlock() {
    this.updateLevel('🔺');
    return this.setEmoji('🥳', 'green', 'unlock');
  }

  levelUpNormal() {
    this.updateLevel('🔸');
    return this.setEmoji('🎉', 'green', 'levelup');
  }

  finishLastLevel() {
    return this.setEmoji('🎉', 'green', 'levelup');
  }

  setNewQuestion(visible, accessible) {
    this.setText('question', visible);
    this.talk.say(accessible);
    this.get('answer').value = '';
  }

  show(id) {
    return this.removeClass(id, 'hidden');
  }

  hide(id) {
    return this.addClass(id, 'hidden');
  }
}

class Game {
  constructor(ui) {
    this.ui = ui;
    this.ui.setGame(this);
    this.answer = null;
    this.score = 0;
    this.level = 0;
    this.total = 0;
    this.done = true;
    this.used = new Set();
    this.startTime = 0;
    this.problems = this.getProblems();
    this.record = this.loadRecord();

    this.questionsPerLevel = 10;
  }

  isStarted() {
    return !this.done;
  }

  onAnswer(response) {
    if (response === this.answer) {
      this.score++;
      this.ui.setEmoji('✔', 'green', 'correct');
    } else {
      this.ui.setEmoji(`${this.answer}`, 'red', 'wrong');
    }

    this.incrementTotal();

    return response === this.answer;
  }

  getAnswer() {
    return this.answer;
  }

  getLevel() {
    return this.level + 1;
  }

  maxLevel() {
    return this.problems.length - 1;
  }

  maxScore() {
    return (this.maxLevel() + 1) * this.questionsPerLevel;
  }

  maxLevelScore() {
    return (this.level + 1) * this.questionsPerLevel;
  }

  incrementTotal() {
    this.total += 1;
    if (this.total >= this.questionsPerLevel) { // we have completed this level
      this.onCompleteLevel();
    }
  }

  onCompleteLevel() {
    if (this.level < this.maxLevel() && (
      this.level < this.record.level // always go to the next level if we've already been there
      || this.score == this.maxLevelScore() // otherwise, require a perfect score to advance
    )) {
      this.total = 0;
      this.level += 1;
      if (this.level > this.record.level) {
        this.record.level = this.level;
        this.ui.levelUpUnlock();
      } else {
        this.ui.levelUpNormal();
      }
    } else {
      // We completed a level but didn't get to the next one.
      if (this.level === this.maxLevel()) {
        this.ui.finishLastLevel();
      }
      this.finished();
    }
  }

  getTotal() {
    return this.level * this.questionsPerLevel + this.total; // compute the overall total answers so far
  }

  loadRecord() {
    return {
      score: Number(localStorage?.getItem('score') || '0'),
      total: Number(localStorage?.getItem('total') || '0'),
      time: Number(localStorage?.getItem('time') || '0'),
      level: Number(localStorage?.getItem('level') || '0'),
    };
  }

  getProblems() {
    return [
      () => { // addition
        const num1 = random(0, 10, (num) => num === 0, 1);
        const num2 = random(0, 10, (num) => num === 0, 1);
        return {
          question: `${num1} + ${num2} = ?`,
          accessibleQuestion: `${num1} plus ${num2}`,
          answer: num1 + num2,
        };
      },
      () => { // subtraction
        const num1 = random(0, 10, (num) => num === 0, 1);
        const num2 = random(0, 10, (num) => num === 0, 1);
        return {
          question: `${num1 + num2} - ${num2} = ?`,
          accessibleQuestion: `${num1 + num2} minus ${num2}`,
          answer: num1,
        };
      },
      () => { // addition with 3 operands
        const num1 = random(0, 10, (num) => num === 0, 1);
        const num2 = random(0, 10, (num) => num === 0, (num1 === 0 ? 2 : 1));
        const num3 = random(0, 10, (num) => num === 0, (num1 * num2 === 0 ? 2 : 1));
        return {
          question: `${num1} + ${num2} + ${num3} = ?`,
          accessibleQuestion: `${num1} plus ${num2} plus ${num3}`,
          answer: num1 + num2 + num3,
        };
      },
      () => { // addition and subtraction (a + b - c)
        // This is the simplest way I could think of to avoid negative answers without
        // overly biasing towards smaller numbers:
        let num1, num2, num3;

        // Maximum retries:
        let retry = 5;
        do {
          num1 = random(0, 10, (num) => num === 0);
          num2 = random(0, 10, (num) => num === 0);
          num3 = random(0, 10, (num) => [0, num1, num2].includes(num), 1);
        } while(num1 + num2 < num3 && --retry);
        if (retry === 0) {
          // We failed to get a suitable question in 5 retries; at this point we accept
          // a small bias rather than risk further running down the timer:
          num1 = random(0, 10);
          num2 = random(0, 10);
          num3 = random(0, Math.min(10, num1 + num2));
        }
        return {
          question: `${num1} + ${num2} - ${num3} = ?`,
          accessibleQuestion: `${num1} plus ${num2} minus ${num3}`,
          answer: num1 + num2 - num3,
        };
      },
      () => { // multiplication
        const num1 = random(0, 10, (num) => num <= 1 || num === 10, 2);
        const num2 = random(0, 10, (num) => num <= 1 || num === 10, 2);
        return {
          question: `${num1} × ${num2} = ?`,
          accessibleQuestion: `${num1} times ${num2}`,
          answer: num1 * num2,
        };
      },
      () => { // division
        const num1 = random(1, 10, (num) => num === 1); // can't divide by zero
        const num2 = random(0, 10, (num) => num <= 1);
        return {
          question: `${num1 * num2} ÷ ${num1} = ?`,
          accessibleQuestion: `${num1 * num2} divided by ${num1}`,
          answer: num2,
        };
      },
    ];
  }

  restart() {
    this.answer = null;
    this.score = 0;
    this.level = 0;
    this.total = 0;
    this.used.clear();
    this.done = false;
    this.startTime = Date.now();
    this.newQuestion();
  };

  getScore() {
    return this.score;
  }

  async start() {
    this.ui.init(this.record);
    this.ui.start();
  }

  newQuestion() {
    let problem;
    let tries = 6;
    do {
      problem = (this.problems[(this.total % this.questionsPerLevel && random(0, 2)) ? random(0, this.level) : this.level])();
    } while (this.used.has(problem.question) && --tries);
    this.used.add(problem.question);
    this.answer = problem.answer;

    this.ui.setNewQuestion(problem.question, problem.accessibleQuestion);
  };

  finished() {
    localStorage.setItem('level', `${this.record.level}`);
    const timeTaken = Date.now() - this.startTime;
    this.done = true;
    if (this.score === this.maxScore()) {
      this.ui.setGameOver('🌟 PERFECT! 🌟', 'Perfect!');
    } else {
      this.ui.setGameOver('GAME OVER', 'Game over.');
    }
    this.ui.updateLevel('🔹');
    this.ui.updateScore();
    this.ui.updateTotal();
    this.ui.talk.say(`Level ${this.getLevel()}.`);
    const interval = this.ui.formatInterval(timeTaken);
    this.ui.setText('last-time', interval);
    this.ui.talk.say(`${this.score} out of ${this.maxLevelScore()} in ${interval}.`);
    if (this.score > this.record.score || this.score === this.record.score && timeTaken < this.record.time) {
      this.record.score = this.getScore();
      this.record.total = this.getTotal();
      this.record.time = timeTaken;
      localStorage.setItem('score', `${this.record.score}`);
      localStorage.setItem('total', `${this.record.total}`);
      localStorage.setItem('time', `${this.record.time}`);
      this.ui.setText('best', '🏆 NEW RECORD! 🏆');
      this.ui.talk.say('New record!');
      this.ui.setEmoji('🏆', 'green', 'record');
    } else if (this.record.total > 0) {
      const bestInterval = this.ui.formatInterval(this.record.time);
      this.ui.setText('best', `Best: ${this.record.score} / ${this.record.total} in ${bestInterval}`);
      this.ui.talk.say(`Best: ${this.record.score} out of ${this.record.total} in ${bestInterval}.`);
    } else {
      this.ui.setText('best', '🦆');
    }
    this.ui.show('stats');
    this.ui.show('startOver');
    this.ui.hide('answer');

    setTimeout(() => this.ui.get('startOver').focus(), 0);
  };
}

function random(min, max, reject = null, retry = 0) {
  const num = min + Math.floor(Math.random() * (max + 1 - min));
  if (retry && reject && reject(num)) {
    return random(min, max, reject, retry - 1);
  }
  return num;
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

class AudioHandler {
  // TODO (TypeScript): private constructor, force factory
  constructor(audio, context) {
    this.audio = audio;
    this.context = context;
  }

  static async factory(sounds) {
    const context = new AudioContext();
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
        console.error(e);
        return sounds.reduce((acc, name) => ({ ...acc, [name]: null }), {});
      }
    })();
    return new this(audio, context);
  }

  play(sound) {
    if (this.audio[sound]) {
      const source = this.context.createBufferSource();
      source.buffer = this.audio[sound];
      source.connect(this.context.destination);
      source.start();
    }
  }
}

async function main() {
  const sounds = ['correct', 'wrong', 'levelup', 'record', 'unlock'];
  const audio = await AudioHandler.factory(sounds);

  const ui = new UI(audio);
  const game = new Game(ui);
  return game.start();
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
