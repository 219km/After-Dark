const defaultPlayerData = {
  credits: 500,
  gamesPlayed: 0,
  ownedItems: [],
  badges: []
};

function getPlayerData() {
  const saved = localStorage.getItem("afterDarkPlayerData");

  if (!saved) {
    localStorage.setItem(
      "afterDarkPlayerData",
      JSON.stringify(defaultPlayerData)
    );

    return { ...defaultPlayerData };
  }

  return {
    ...defaultPlayerData,
    ...JSON.parse(saved)
  };
}

function savePlayerData(data) {
  localStorage.setItem(
    "afterDarkPlayerData",
    JSON.stringify(data)
  );
}

function addCredits(amount) {
  const data = getPlayerData();
  data.credits += amount;
  savePlayerData(data);
}

function spendCredits(amount) {
  const data = getPlayerData();

  if (data.credits < amount) {
    return false;
  }

  data.credits -= amount;
  savePlayerData(data);
  return true;
}
