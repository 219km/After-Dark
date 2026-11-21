
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const conversationList =
  document.getElementById("conversationList");
const userSearch = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");
const chatArea =
  document.getElementById("chatArea");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "account.html";
    return;
  }

  currentUser = user;
  loadConversations();
});

function loadConversations() {
  const conversationsRef = collection(db, "conversations");

  const q = query(
    conversationsRef,
    where("participants", "array-contains", currentUser.uid)
  );

  onSnapshot(q, (snapshot) => {
    conversationList.innerHTML = "";

    if (snapshot.empty) {
      conversationList.textContent = "No conversations yet.";
      return;
    }

    snapshot.forEach((document) => {
      const data = document.data();

      const item = document.createElement("div");
      item.className = "conversation";
      item.textContent = data.participantNames?.[
        data.participants.find(id => id !== currentUser.uid)
      ] || "Conversation";

      conversationList.appendChild(item);
    });
  }, (error) => {
    conversationList.textContent = error.message;
  });
}

userSearch.addEventListener("input", async () => {
  const term = userSearch.value.trim().toLowerCase();

  searchResults.innerHTML = "";

  if (term.length < 2) return;

  searchResults.textContent = "Searching...";

  try {
    const usersQuery = query(
      collection(db, "publicUsers"),
      orderBy("username"),
      where("username", ">=", term),
      where("username", "<=", term + "\uf8ff"),
      limit(10)
    );

    const snapshot = await getDocs(usersQuery);

    searchResults.innerHTML = "";

    if (snapshot.empty) {
      searchResults.textContent = "No players found.";
      return;
    }

    snapshot.forEach((userDoc) => {
      const user = userDoc.data();

      if (userDoc.id === currentUser.uid) return;

      const button = document.createElement("button");

      button.textContent =
        (user.displayName || "Player") + " @" + user.username;

      searchResults.appendChild(button);
    });

  } catch (error) {
    searchResults.textContent = "Search error: " + error.message;
  }
});
