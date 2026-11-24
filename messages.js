
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
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
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

let currentUser = null;
let currentConversation = null;
let messagesUnsubscribe = null;
let conversationsUnsubscribe = null;

let publicUserData = {};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getInitial(name) {
  return (name || "P").charAt(0).toUpperCase();
}

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "";

  return timestamp.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// LOAD CURRENT USER

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    return;
  }

  currentUser = user;

  const userDoc = await getDoc(doc(db, "publicUsers", user.uid));

  publicUserData = userDoc.exists()
    ? userDoc.data()
    : {};

  loadConversations();
});

// SEARCH USERS

userSearch.addEventListener("input", async () => {
  const term = userSearch.value.trim().toLowerCase();

  searchResults.innerHTML = "";

  if (term.length < 2 || !currentUser) return;

  try {
    const usersQuery = query(
      collection(db, "publicUsers"),
      orderBy("username"),
      where("username", ">=", term),
      where("username", "<=", term + "\uf8ff"),
      limit(10)
    );

    const snapshot = await getDocs(usersQuery);

    snapshot.forEach(userDoc => {
      if (userDoc.id === currentUser.uid) return;

      const user = userDoc.data();

      const button = document.createElement("button");

      button.textContent =
        `${user.displayName || "Player"} / @${user.username}`;

      button.addEventListener("click", () => {
        startConversation(userDoc.id, user);
      });

      searchResults.appendChild(button);
    });

  } catch (error) {
    console.error("User search error:", error);
    searchResults.textContent = "Unable to search users.";
  }
});

// START OR OPEN CONVERSATION

async function startConversation(targetId, targetUser) {
  try {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const snapshot = await getDocs(conversationsQuery);

    let conversationId = null;

    snapshot.forEach(conversationDoc => {
      const participants = conversationDoc.data().participants || [];

      if (participants.includes(targetId)) {
        conversationId = conversationDoc.id;
      }
    });

    if (!conversationId) {
      const currentName =
        publicUserData.displayName ||
        currentUser.displayName ||
        "Player";

      const targetName = targetUser.displayName || "Player";

      const newConversation = await addDoc(
        collection(db, "conversations"),
        {
          participants: [currentUser.uid, targetId],

          participantNames: {
            [currentUser.uid]: currentName,
            [targetId]: targetName
          },

          lastMessage: "",
          lastMessageAt: serverTimestamp()
        }
      );

      conversationId = newConversation.id;
    }

    userSearch.value = "";
    searchResults.innerHTML = "";

    openConversation(conversationId, targetUser.displayName || "Player");

  } catch (error) {
    console.error("Conversation error:", error);
    alert("Could not open conversation.");
  }
}

// LOAD CONVERSATIONS

function loadConversations() {
  if (conversationsUnsubscribe) {
    conversationsUnsubscribe();
  }

  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  conversationsUnsubscribe = onSnapshot(
    conversationsQuery,
    snapshot => {
      conversationList.innerHTML = "";

      const conversations = [];

      snapshot.forEach(conversationDoc => {
        conversations.push({
          id: conversationDoc.id,
          ...conversationDoc.data()
        });
      });

      conversations.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis?.() || 0;
        const timeB = b.lastMessageAt?.toMillis?.() || 0;

        return timeB - timeA;
      });

      if (conversations.length === 0) {
        conversationList.textContent = "No conversations yet.";
        return;
      }

      conversations.forEach(conversation => {
        const otherId = conversation.participants.find(
          id => id !== currentUser.uid
        );

        const otherName =
          conversation.participantNames?.[otherId] || "Player";

        const button = document.createElement("button");

        button.innerHTML = `
          <strong>${escapeHTML(otherName)}</strong>
          <div>${escapeHTML(conversation.lastMessage || "Start chatting")}</div>
        `;

        button.addEventListener("click", () => {
          openConversation(conversation.id, otherName);
        });

        conversationList.appendChild(button);
      });
    },
    error => console.error("Conversation list error:", error)
  );
}

// OPEN CONVERSATION

function openConversation(conversationId, name) {
  currentConversation = conversationId;

  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }

  chatTitle.textContent = name;

  emptyChat.style.display = "none";
  activeChat.style.display = "block";

  messagesList.innerHTML = "";

  const messagesQuery = query(
    collection(
      db,
      "conversations",
      conversationId,
      "messages"
    ),
    orderBy("createdAt", "asc")
  );

  messagesUnsubscribe = onSnapshot(
    messagesQuery,
    snapshot => {
      messagesList.innerHTML = "";

      snapshot.forEach(messageDoc => {
        const message = messageDoc.data();

        const isMine = message.senderId === currentUser.uid;

        const senderName = isMine
          ? publicUserData.displayName || currentUser.displayName || "You"
          : name;

        const row = document.createElement("div");

        row.className = isMine
          ? "message-row own-message"
          : "message-row";

        row.innerHTML = `
          <div class="message-avatar">
            ${escapeHTML(getInitial(senderName))}
          </div>

          <div class="message-content">
            <div class="message-sender">
              ${escapeHTML(senderName)}
            </div>

            <div class="message-bubble">
              ${escapeHTML(message.text)}
            </div>

            <div class="message-time">
              ${escapeHTML(formatTime(message.createdAt))}
            </div>
          </div>
        `;

        messagesList.appendChild(row);
      });

      messagesList.scrollTop = messagesList.scrollHeight;
    },
    error => console.error("Message loading error:", error)
  );
}

// SEND MESSAGE

messageForm.addEventListener("submit", async event => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !currentConversation || !currentUser) return;

  messageInput.value = "";

  try {
    const conversationRef = doc(
      db,
      "conversations",
      currentConversation
    );

    await addDoc(
      collection(
        db,
        "conversations",
        currentConversation,
        "messages"
      ),
      {
        senderId: currentUser.uid,
        text: text,
        createdAt: serverTimestamp()
      }
    );

    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp()
    });

  } catch (error) {
    console.error("Message sending error:", error);
    messageInput.value = text;
    alert("Message could not be sent.");
  }
});
