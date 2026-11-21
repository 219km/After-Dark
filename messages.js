
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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const conversationList =
  document.getElementById("conversationList");

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

