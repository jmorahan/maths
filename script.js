function random(min, max) {
  return min + Math.floor(Math.random() * (max + 1 - min));
}

document.addEventListener('DOMContentLoaded', () => {
  const questionContainer = document.getElementById('question');
  const answerBox = document.getElementById('answer');
  const answerForm = document.getElementById('answerForm');
  const startOver = document.getElementById('startOver');
  const levelContainer = document.getElementById('level');
  const scoreContainer = document.getElementById('score');
  const totalContainer = document.getElementById('total');
  const emoji = document.getElementById('emoji');

  let answer = null;
  let score = 0;
  let level = 0;
  let total = 0;
  let done = false;

  let emojiOpacity = 0;

  answerForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (done) {
      location.reload();
      return;
    }

    const response = Number(answerBox.value);
    if (response === answer) {
      score++;
      scoreContainer.innerText = score;
      setEmoji('✔', 'green');
    } else {
      setEmoji(`${answer}`, 'red');
    }

    total++;
    totalContainer.innerText = level * 10 + total;

    if (total >= 10) {
      level++;
      if (score === level * 10) {
        total = 0;
        levelContainer.innerText = level + 1;
        setEmoji('🎉', 'green');
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
    () => { // multiplication
      const num1 = random(1, 9);
      const num2 = random(1, 9);
      return {
        question: `${num1} × ${num2} = ?`,
        answer: num1 * num2,
      };
    },
  ];

  const finished = () => {
    done = true;
    questionContainer.innerText = score === level * 10 + total ? '🌟 PERFECT! 🌟' : 'GAME OVER';
    levelContainer.innerText = level;
    startOver.classList.remove('hidden');
    answerBox.classList.add('hidden');
  };

  const newQuestion = () => {
    if (level >= problems.length) {
      finished();
      return;
    }
    const problem = (problems[total % 10 ? random(0, level) : level])();
    questionContainer.innerText = problem.question;
    answer = problem.answer;
    answerBox.value = '';
    answerBox.focus();
  };

  const setEmoji = (character, className) => {
    emoji.innerText = character;
    emoji.className = className;
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

  newQuestion();
});
