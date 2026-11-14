const survivalQuestions = [
  {
    night: 1,
    question: "Who is the main mascot of Freddy Fazbear's Pizza?",
    answers: ["Bonnie", "Freddy", "Foxy", "Chica"],
    correct: 1
  },
  {
    night: 1,
    question: "Which animatronic is known as the pirate fox?",
    answers: ["Foxy", "Freddy", "Golden Freddy", "Bonnie"],
    correct: 0
  },
  {
    night: 1,
    question: "What is the name of the security guard's office?",
    answers: ["Control room", "Security office", "Parts room", "Kitchen"],
    correct: 1
  },
  {
    night: 2,
    question: "Which animatronic hides in the Pirate Cove?",
    answers: ["Chica", "Foxy", "Bonnie", "Freddy"],
    correct: 1
  },
  {
    night: 2,
    question: "What is the name of the puppet-like character?",
    answers: ["Balloon Boy", "The Puppet", "Mangle", "Springtrap"],
    correct: 1
  },
  {
    night: 2,
    question: "Which animatronic is associated with the kitchen?",
    answers: ["Chica", "Foxy", "Bonnie", "Freddy"],
    correct: 0
  },
  {
    night: 3,
    question: "What year did the first FNAF game release?",
    answers: ["2012", "2013", "2014", "2015"],
    correct: 2
  },
  {
    night: 3,
    question: "What is Springtrap associated with?",
    answers: ["William Afton", "Henry Emily", "Michael Afton", "Phone Guy"],
    correct: 0
  },
  {
    night: 3,
    question: "Who is the creator of the animatronics?",
    answers: ["Freddy", "Henry Emily", "Foxy", "Phone Guy"],
    correct: 1
  },
  {
    night: 4,
    question: "What is the name of the purple-suited killer?",
    answers: ["Henry Emily", "William Afton", "Michael Afton", "Jeremy"],
    correct: 1
  },
  {
    night: 4,
    question: "Which animatronic is associated with the Bite of 87?",
    answers: ["Toy Bonnie", "Mangle", "Freddy", "Foxy"],
    correct: 1
  },
  {
    night: 5,
    question: "What is the name of the underground facility in Sister Location?",
    answers: [
      "Freddy Fazbear's Pizza",
      "Circus Baby's Entertainment and Rental",
      "Fazbear's Fright",
      "Fredbear's Family Diner"
    ],
    correct: 1
  }
];

let currentNight = 1;
let currentQuestion = 0;
let score = 0;
let gameOver = false;

const questionElement = document.getElementById("question");
const answersElement = document.getElementById("answers");
const nightElement = document.getElementById("night");
const scoreElement = document.getElementById("score");
const messageElement = document.getElementById("message");

function loadQuestion() {
  if (gameOver) return;

  const nightQuestions = survivalQuestions.filter(
    q => q.night === currentNight
  );

  if (currentQuestion >= nightQuestions.length) {
    if (currentNight === 5) {
      winGame();
      return;
    }

    currentNight++;
    currentQuestion = 0;
    showMessage("NIGHT " + currentNight + " STARTING...");
    setTimeout(loadQuestion, 1200);
    return;
  }

  const question = nightQuestions[currentQuestion];

  nightElement.textContent = "NIGHT " + currentNight;
  scoreElement.textContent = "SCORE: " + score;
  questionElement.textContent = question.question;
  answersElement.innerHTML = "";

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");

    button.textContent = answer;
    button.className = "answer-btn";

    button.addEventListener("click", () => {
      checkAnswer(index, question.correct);
    });

    answersElement.appendChild(button);
  });
}

function checkAnswer(selected, correct) {
  if (gameOver) return;

  const buttons = answersElement.querySelectorAll("button");

  buttons.forEach(button => button.disabled = true);

  if (selected === correct) {
    score += 100;
    scoreElement.textContent = "SCORE: " + score;
    showMessage("CORRECT! +100 POINTS");
  } else {
    gameOver = true;
    showMessage("GAME OVER! THE ANIMATRONICS GOT YOU.");

    setTimeout(showGameOver, 1200);
    return;
  }
