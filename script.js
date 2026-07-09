const stories = [
  {
    title: 'The Lost Kite',
    text: 'Maya saw a red kite stuck in an oak tree after the windy picnic. She asked her older brother to hold the ladder while she carefully untangled the string. The owner smiled when Maya returned it.',
    question: 'Why was the kite in the tree?',
    choices: ['The wind blew it there.', 'Maya hid it there.', 'The owner threw it away.'],
    answer: 0,
  },
  {
    title: 'A Rainy Shortcut',
    text: 'Noah usually walked by the pond, but dark clouds rolled in after school. He chose the covered sidewalk beside the library and reached home with dry books.',
    question: 'What can you infer about Noah?',
    choices: ['He wanted to keep his books dry.', 'He forgot where he lived.', 'He dislikes libraries.'],
    answer: 0,
  },
  {
    title: 'The Quiet Bell',
    text: 'The class bell did not ring at noon because the power was out. Ms. Chen clapped three times, and everyone lined up for lunch anyway.',
    question: 'How did Ms. Chen solve the problem?',
    choices: ['She used claps as a signal.', 'She canceled lunch.', 'She fixed the power.'],
    answer: 0,
  },
];

let current = 0;
let score = 0;
let streak = 0;

const title = document.querySelector('#passage-title');
const text = document.querySelector('#passage-text');
const question = document.querySelector('#question');
const choices = document.querySelector('#choices');
const feedback = document.querySelector('#feedback');
const form = document.querySelector('#answer-form');
const nextButton = document.querySelector('#next-button');
const scoreDisplay = document.querySelector('#score');
const streakDisplay = document.querySelector('#streak');
const roundDisplay = document.querySelector('#round');

function renderStory() {
  const story = stories[current];
  title.textContent = story.title;
  text.textContent = story.text;
  question.textContent = story.question;
  choices.innerHTML = '';
  feedback.textContent = '';
  feedback.className = 'feedback';
  nextButton.hidden = true;

  story.choices.forEach((choice, index) => {
    const label = document.createElement('label');
    label.className = 'choice';
    label.innerHTML = `<input type="radio" name="answer" value="${index}" required> ${choice}`;
    choices.append(label);
  });

  roundDisplay.textContent = String(current + 1);
}

function updateScoreboard() {
  scoreDisplay.textContent = String(score);
  streakDisplay.textContent = String(streak);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const selected = Number(new FormData(form).get('answer'));
  const isCorrect = selected === stories[current].answer;

  if (isCorrect) {
    score += 10 + streak * 2;
    streak += 1;
    feedback.textContent = 'Correct! Great reading detective work.';
    feedback.classList.add('correct');
  } else {
    streak = 0;
    feedback.textContent = 'Not quite. Reread the story and try the next one.';
    feedback.classList.add('incorrect');
  }

  updateScoreboard();
  nextButton.hidden = false;
});

nextButton.addEventListener('click', () => {
  current = (current + 1) % stories.length;
  form.reset();
  renderStory();
});

renderStory();
updateScoreboard();
