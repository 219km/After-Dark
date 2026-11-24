
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
  onSnapshot,
  addDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const userSearch = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");
const conversationList = document.getElementById("conversationList");

const emptyChat = document.getElementById("emptyChat");
const activeChat = document.getElementById("activeChat");
const chatTitle = document.getElementById("chatTitle");
const messagesList = document.getElementById("messagesList");
const chatAvatar = document.querySelector(".chat-avatar");

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

// SEARCH PLAYERS

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

// LOAD CONVERSATIONS

function loadConversations() {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  onSnapshot(q, (snapshot) => {
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

// OPEN CONVERSATION

async function openConversation(targetUser, existingId = null) {
  try {
    let conversationId = existingId;

    if (!conversationId) {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", currentUser.uid)
      );

      const snapshot = await getDocs(q);

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
    activeChat.style.display = "flex";

    const otherName = targetUser.displayName || "Player";

    chatTitle.textContent = otherName;

    chatAvatar.textContent =
      otherName.charAt(0).toUpperCase();

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

        const isMine = data.senderId === currentUser.uid;

        // MESSAGE ROW

        const row = document.createElement("div");
        row.className = "message-row";

        if (isMine) {
          row.classList.add("mine");
        } else {
          const avatar = document.createElement("div");
          avatar.className = "message-avatar";
          avatar.textContent =
            otherName.charAt(0).toUpperCase();

          row.appendChild(avatar);
        }

        // MESSAGE BUBBLE

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        // SENDER NAME

        const sender = document.createElement("span");
        sender.className = "message-sender";
        sender.textContent = isMine ? "You" : otherName;

        // MESSAGE TEXT

        const content = document.createElement("p");
        content.className = "message-text";
        content.textContent = data.text || "";

        bubble.appendChild(sender);
        bubble.appendChild(content);

        row.appendChild(bubble);

        messagesList.appendChild(row);
      });

      messagesList.scrollTop = messagesList.scrollHeight;

    }, (error) => {
      messagesList.textContent = error.message;
    });

  } catch (error) {
    alert("Couldn't open conversation: " + error.message);
  }
}

// SEND MESSAGE

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
