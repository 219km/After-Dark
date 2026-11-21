
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const userSearch = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");
const conversationList = document.getElementById("conversationList");

const emptyChat = document.getElementById("emptyChat");
const activeChat = document.getElementById("activeChat");
const chatTitle = document.getElementById("chatTitle");
const messagesList = document.getElementById("messagesList");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

let currentUser = null;
let activeConversationId = null;
let unsubscribeMessages = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "account.html";
    return;
  }

  currentUser = user;
  loadConversations();
});

userSearch.addEventListener("input", async () => {
  const term = userSearch.value.trim().toLowerCase();

  searchResults.innerHTML = "";

  if (term.length < 2) {
    searchResults.textContent = "Type at least 2 characters.";
    return;
  }

  searchResults.textContent = "Searching...";

  try {
    const usersQuery = query(
      collection(db, "publicUsers"),
      where("username", ">=", term),
      where("username", "<=", term + "\uf8ff"),
      orderBy("username"),
      limit(10)
    );

    const snapshot = await getDocs(usersQuery);

    searchResults.innerHTML = "";

    if (snapshot.empty) {
      searchResults.textContent = "No players found.";
      return;
    }

    snapshot.forEach((userDoc) => {
      const user = {
        uid: userDoc.id,
        ...userDoc.data()
      };

      if (user.uid === currentUser.uid) return;

      const button = document.createElement("button");
      button.className = "conversation";

      button.textContent =
        (user.displayName || "Player") + " @" + user.username;

      button.addEventListener("click", () => {
        openConversation(user);
      });

      searchResults.appendChild(button);
    });

  } catch (error) {
    searchResults.textContent = error.message;
  }
});

async function loadConversations() {
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  onSnapshot(conversationsQuery, (snapshot) => {
    conversationList.innerHTML = "";

    if (snapshot.empty) {
      conversationList.textContent = "No conversations yet.";
      return;
    }

    snapshot.forEach((conversationDoc) => {
      const data = conversationDoc.data();

      const otherUid = data.participants.find(
        id => id !== currentUser.uid
      );

      const otherName =
        data.participantNames?.[otherUid] || "Player";

      const button = document.createElement("button");
      button.className = "conversation";
      button.textContent = otherName;

      button.addEventListener("click", () => {
        openConversation({
          uid: otherUid,
          displayName: otherName
        }, conversationDoc.id);
      });

      conversationList.appendChild(button);
    });

  }, (error) => {
    conversationList.textContent = error.message;
  });
}

async function openConversation(targetUser, existingId = null) {
  try {
    let conversationId = existingId;

    if (!conversationId) {
      const conversationsQuery = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid)
      );

      const snapshot = await getDocs(conversationsQuery);

      const existing = snapshot.docs.find((item) =>
        item.data().participants.includes(targetUser.uid)
      );

      if (existing) {
        conversationId = existing.id;
      } else {
        const newConversation = await addDoc(
          collection(db, "conversations"),
          {
            participants: [
              currentUser.uid,
              targetUser.uid
            ],
            participantNames: {
              [currentUser.uid]:
                currentUser.displayName || "Player",
              [targetUser.uid]:
                targetUser.displayName || "Player"
            },
            lastMessage: "",
            lastMessageAt: serverTimestamp()
          }
        );

        conversationId = newConversation.id;
      }
    }

    activeConversationId = conversationId;

    emptyChat.style.display = "none";
    activeChat.style.display = "block";

    chatTitle.textContent =
      targetUser.displayName || "Player";

    if (unsubscribeMessages) {
      unsubscribeMessages();
    }

    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      messagesList.innerHTML = "";

      snapshot.forEach((messageDoc) => {
        const data = messageDoc.data();

        const bubble = document.createElement("div");

        bubble.style.padding = "12px";
        bubble.style.margin = "8px 0";
        bubble.style.background =
          data.senderId === currentUser.uid
            ? "#54213e"
            : "#24162d";
        bubble.style.borderRadius = "8px";
        bubble.style.textAlign =
          data.senderId === currentUser.uid
            ? "right"
            : "left";

        const sender = document.createElement("strong");
        sender.textContent =
          data.senderId === currentUser.uid
            ? "You"
            : targetUser.displayName || "Player";

        const content = document.createElement("p");
        content.textContent = data.text;

        bubble.appendChild(sender);
        bubble.appendChild(content);

        messagesList.appendChild(bubble);
      });

      messagesList.scrollTop = messagesList.scrollHeight;

    }, (error) => {
      messagesList.textContent = error.message;
    });

  } catch (error) {
    alert("Couldn't open conversation: " + error.message);
  }
}

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !activeConversationId) return;

  const sendButton = messageForm.querySelector("button");
  sendButton.disabled = true;

  try {
    await addDoc(
      collection(
        db,
        "conversations",
        activeConversationId,
        "messages"
      ),
      {
        senderId: currentUser.uid,
        text: text,
        createdAt: serverTimestamp()
      }
    );

    await updateDoc(
      doc(db, "conversations", activeConversationId),
      {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      }
    );

    messageInput.value = "";

  } catch (error) {
    alert("Message failed: " + error.message);
  }

  sendButton.disabled = false;
});
