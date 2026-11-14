
/* ===================================
   AFTER DARK
   MAIN GAME SCRIPT
=================================== */

(() => {

/* ===================================
   PLAYER PROFILE
=================================== */

function getPlayerProfile() {
  try {
    return JSON.parse(
      localStorage.getItem("afterDarkProfile") || "{}"
    );
  } catch {
    return {};
  }
}

function savePlayerProfile(profile) {
  localStorage.setItem(
    "afterDarkProfile",
    JSON.stringify(profile)
  );
}

function getProfile() {
  return getPlayerProfile();
}

function getCredits() {
  return getPlayerProfile().credits || 0;
}

function addCredits(amount) {
  const profile = getPlayerProfile();

  profile.credits = (profile.credits || 0) + amount;

  savePlayerProfile(profile);
  updateRewardDisplay();
}

function getBadges() {
  try {
    return JSON.parse(
      localStorage.getItem("afterDarkBadges") || "[]"
    );
  } catch {
    return [];
  }
}

function awardBadge(badge) {
  const badges = getBadges();

  if (!badges.includes(badge)) {
    badges.push(badge);

    localStorage.setItem(
      "afterDarkBadges",
      JSON.stringify(badges)
    );
  }
}

function updateRewardDisplay() {
  const credits = document.getElementById("credits");

  if (credits) {
    credits.textContent = getCredits();
  }
}

/* ===================================
   AVATAR FUNCTIONS
=================================== */

function uploadAvatar() {
  const input = document.getElementById("avatar-upload");
  const file = input?.files?.[0];

  if (!file || !file.type.startsWith("image/")) {
    alert("PLEASE SELECT AN IMAGE.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("IMAGE MUST BE UNDER 2MB.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    const profile = getPlayerProfile();

    profile.avatarImage = event.target.result;

    savePlayerProfile(profile);
    loadProfile();
  };

  reader.readAsDataURL(file);
}

function removeAvatar() {
  const profile = getPlayerProfile();

  delete profile.avatarImage;

  savePlayerProfile(profile);
  loadProfile();
}

function loadProfile() {
  const profile = getPlayerProfile();

  const avatar = document.getElementById("avatar");
  const username = document.getElementById("display-name");
  const bio = document.getElementById("display-bio");

  if (avatar) {
    avatar.innerHTML = "";

    if (profile.avatarImage) {
      const image = document.createElement("img");

      image.src = profile.avatarImage;
      image.alt = "Player Avatar";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "cover";

      avatar.appendChild(image);
    } else {
      avatar.textContent = "👤";
    }
  }

  if (username) {
    username.textContent = profile.username || "PLAYER";
  }

  if (bio) {
    bio.textContent = profile.bio || "NO BIO YET";
  }

  updateRewardDisplay();
}

/* ===================================
   GUESS THE CHARACTER QUESTIONS
=================================== */

const questionBanks = {

  easy: [
    {
      category: "JUJUTSU KAISEN",
      clue: "I have black spiky hair and use the Ten Shadows Technique.",
      answers: ["Yuji", "Megumi", "Gojo", "Geto"],
      correct: 1
    },
    {
      category: "JUJUTSU KAISEN",
      clue: "I have white hair and wear a blindfold.",
      answers: ["Sukuna", "Toji", "Gojo", "Nanami"],
      correct: 2
    },
    {
      category: "FNAF",
      clue: "I am a brown bear animatronic and the face of the franchise.",
      answers: ["Bonnie", "Freddy", "Foxy", "Chica"],
      correct: 1
    },
    {
      category: "FNAF",
      clue: "I am a pirate fox animatronic.",
      answers: ["Foxy", "Freddy", "Bonnie", "Golden Freddy"],
      correct: 0
    }
  ],

  medium: [
    {
      category: "JUJUTSU KAISEN",
      clue: "I am known as the King of Curses.",
      answers: ["Mahito", "Sukuna", "Geto", "Jogo"],
      correct: 1
    },
    {
      category: "JUJUTSU KAISEN",
      clue: "My cursed technique involves manipulating blood.",
      answers: ["Choso", "Nanami", "Toji", "Gojo"],
      correct: 0
    },
    {
      category: "FNAF",
      clue: "I am a yellow chicken animatronic who carries a cupcake.",
      answers: ["Mangle", "Chica", "Bonnie", "Puppet"],
      correct: 1
    },
    {
      category: "FNAF",
      clue: "I am the mysterious puppet connected to the music box.",
      answers: ["Balloon Boy", "Springtrap", "The Puppet", "Foxy"],
      correct: 2
    }
  ],

  nightmare: [
    {
      category: "JUJUTSU KAISEN",
      question: "Which shikigami is summoned through Megumi's Chimera Shadow Garden?",
      clue: "Think about the domain's expanded shadow environment.",
      answers: ["Mahoraga", "Nue", "Multiple shadow shikigami", "Divine Dog"],
      correct: 2
    },
    {
      category: "JUJUTSU KAISEN",
      question: "What is the name of Yuta's innate cursed technique?",
      clue: "It allows him to reproduce other techniques.",
      answers: ["Copy", "Limitless", "Boogie Woogie", "Projection Sorcery"],
      correct: 0
    },
    {
      category: "JUJUTSU KAISEN",
      question: "Which clan is associated with the Ten Shadows Technique?",
      clue: "Megumi's family name gives it away.",
      answers: ["Gojo Clan", "Kamo Clan", "Zenin Clan", "Inumaki Clan"],
      correct: 2
    },
    {
      category: "FNAF",
      question: "What is the name of the underground location in Sister Location?",
      clue: "It is where the Funtime animatronics are kept.",
      answers: [
        "Freddy Fazbear's Pizza",
        "Circus Baby's Entertainment and Rental",
        "Fazbear's Fright",
        "Fredbear's Family Diner"
      ],
      correct: 1
    },
    {
      category: "FNAF",
      question: "Which animatronic is associated with the phrase 'I always come back'?",
      clue: "Think about the main antagonist.",
      answers: ["Freddy", "William Afton", "Henry Emily", "Phone Guy"],
      correct: 1
    }
  ]
};

/* ===================================
   WHO SAID IT QUESTIONS
=================================== */

const quoteQuestions = {

  easy: [
    {
      category: "JUJUTSU KAISEN",
      quote: "I'd rather stay quiet than explain myself again.",
      answers: ["Megumi", "Yuji", "Gojo", "Nobara"],
      correct: 0
    },
    {
      category: "JUJUTSU KAISEN",
      quote: "Being the strongest sounds exhausting.",
      answers: ["Nanami", "Gojo", "Geto", "Toji"],
      correct: 1
    },
    {
      category: "FNAF",
      quote: "This pizza place is definitely not creepy.",
      answers: ["Foxy", "Freddy", "Bonnie", "Chica"],
      correct: 1
    },
    {
      category: "FNAF",
      quote: "Arrr, the night shift is mine.",
      answers: ["Freddy", "Bonnie", "Foxy", "Chica"],
      correct: 2
    }
  ],

  medium: [
    {
      category: "JUJUTSU KAISEN",
      quote: "I don't need applause. Just let me finish my work.",
      answers: ["Gojo", "Nanami", "Yuji", "Sukuna"],
      correct: 1
    },
    {
      category: "JUJUTSU KAISEN",
      quote: "If you keep smiling, maybe things won't feel so bad.",
      answers: ["Yuji", "Megumi", "Toji", "Geto"],
      correct: 0
    },
    {
      category: "FNAF",
      quote: "I may look friendly, but this building has secrets.",
      answers: ["Bonnie", "Chica", "Puppet", "Golden Freddy"],
      correct: 2
    },
    {
      category: "FNAF",
      quote: "The show must go on, even after closing time.",
      answers: ["Freddy", "Foxy", "Mangle", "Springtrap"],
      correct: 0
    }
  ],

  nightmare: [
    {
      category: "JUJUTSU KAISEN",
      quote: "A technique is only as useful as the person controlling it.",
      answers: ["Sukuna", "Megumi", "Gojo", "Mahito"],
      correct: 1
    },
    {
      category: "JUJUTSU KAISEN",
      quote: "People are not so simple that you can save everyone.",
      answers: ["Yuji", "Geto", "Nobara", "Yuta"],
      correct: 1
    },
    {
      category: "FNAF",
      quote: "Some memories stay trapped inside these halls.",
      answers: ["Phone Guy", "Henry", "Puppet", "William Afton"],
      correct: 2
    },
    {
      category: "FNAF",
      quote: "A second chance does not mean a clean past.",
      answers: ["Michael Afton", "Freddy", "William Afton", "Phone Guy"],
      correct: 0
    }
  ]
};

/* ===================================
   GUESS THE CHARACTER GAME
=================================== */

let difficulty = "easy";
let gameQuestions = [];
let currentQuestion = 0;
let score = 0;
let streak = 0;
let answered = false;
let creditsEarnedThisGame = 0;

function shuffleQuestions(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function setDifficulty(level) {
  if (!questionBanks[level]) return;

  difficulty = level;
  restartGame();
}

function showQuestion() {
  const q = gameQuestions[currentQuestion];

  if (!q) {
    endGame();
    return;
  }

  const category = document.getElementById("category");
  const question = document.getElementById("question");
  const clue = document.getElementById("clue");
  const feedback = document.getElementById("feedback");

  if (!category || !question || !clue || !feedback) return;

  category.textContent = q.category;
  question.textContent = q.question || "WHO AM I?";
  clue.textContent = q.clue || q.question || "";

  feedback.textContent = "";

  const buttons = document.querySelectorAll("#answers .answer");

  buttons.forEach((button, index) => {
    button.textContent = q.answers[index] || "";
    button.disabled = false;
    button.style.display = q.answers[index] ? "block" : "none";
  });

  const next = document.getElementById("next-button");
  const restart = document.getElementById("restart-button");

  if (next) next.style.display = "none";
  if (restart) restart.style.display = "none";

  answered = false;
  updateGameDisplay();
}

function checkAnswer(index) {
  if (answered) return;

  const q = gameQuestions[currentQuestion];
  if (!q) return;

  answered = true;

  const buttons = document.querySelectorAll("#answers .answer");
  const feedback = document.getElementById("feedback");

  buttons.forEach(button => {
    button.disabled = true;
  });

  if (index === q.correct) {
    score++;
    streak++;
    creditsEarnedThisGame += 10;

    feedback.textContent = "CORRECT! +10 CREDITS";

    addCredits(10);

  } else {
    streak = 0;

    feedback.textContent =
      "INCORRECT! ANSWER: " + q.answers[q.correct];
  }

  updateGameDisplay();

  const next = document.getElementById("next-button");

  if (next) {
    next.style.display = "block";
  }
}

function nextQuestion() {
  currentQuestion++;

  if (currentQuestion >= gameQuestions.length) {
    endGame();
  } else {
    showQuestion();
  }
}

function endGame() {
  const question = document.getElementById("question");
  const clue = document.getElementById("clue");
  const category = document.getElementById("category");
  const answers = document.getElementById("answers");
  const feedback = document.getElementById("feedback");
  const next = document.getElementById("next-button");
  const restart = document.getElementById("restart-button");

  if (question) question.textContent = "GAME COMPLETE!";
  if (clue) clue.textContent = "YOU FINISHED THE ROUND.";
  if (category) category.textContent = "AFTER DARK ARCADE";
  if (answers) answers.innerHTML = "";

  if (feedback) {
    feedback.textContent =
      "FINAL SCORE: " + score + " / " + gameQuestions.length;
  }

  if (next) next.style.display = "none";
  if (restart) restart.style.display = "block";

  if (score === gameQuestions.length) {
    awardBadge("PERFECT ROUND");
  }
}

function restartGame() {
  score = 0;
  streak = 0;
  currentQuestion = 0;
  creditsEarnedThisGame = 0;

  gameQuestions = shuffleQuestions(questionBanks[difficulty]);

  const answers = document.getElementById("answers");

  if (!answers) return;

  answers.innerHTML = `
    <button class="answer" onclick="checkAnswer(0)">ANSWER 1</button>
    <button class="answer" onclick="checkAnswer(1)">ANSWER 2</button>
    <button class="answer" onclick="checkAnswer(2)">ANSWER 3</button>
    <button class="answer" onclick="checkAnswer(3)">ANSWER 4</button>
  `;

  showQuestion();
}

function updateGameDisplay() {
  const scoreDisplay = document.getElementById("score");
  const streakDisplay = document.getElementById("streak");
  const creditsDisplay = document.getElementById("credits-earned");

  if (scoreDisplay) {
    scoreDisplay.textContent = "SCORE: " + score;
  }

  if (streakDisplay) {
    streakDisplay.textContent = "STREAK: " + streak;
  }

  if (creditsDisplay) {
    creditsDisplay.textContent =
      "CREDITS EARNED: " + creditsEarnedThisGame;
  }
}

/* ===================================
   MAKE GAME FUNCTIONS AVAILABLE
=================================== */

window.setDifficulty = setDifficulty;
window.checkAnswer = checkAnswer;
window.nextQuestion = nextQuestion;
window.restartGame = restartGame;

window.getPlayerProfile = getPlayerProfile;
window.getProfile = getProfile;
window.getCredits = getCredits;
window.addCredits = addCredits;
window.getBadges = getBadges;
window.awardBadge = awardBadge;

window.uploadAvatar = uploadAvatar;
window.removeAvatar = removeAvatar;
window.loadProfile = loadProfile;

/* ===================================
   START THE CORRECT PAGE
=================================== */

document.addEventListener("DOMContentLoaded", function() {

  // Start Guess the Character only
  // on its actual game page.

  if (
    document.getElementById("question") &&
    document.getElementById("next-button") &&
    document.getElementById("answers")
  ) {
    restartGame();
  }

  // Load player profile only
  // on the profile page.

  if (document.getElementById("avatar")) {
    loadProfile();
  }

  updateRewardDisplay();

});

})();
