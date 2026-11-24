
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
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =====================================
// AFTER DARK MESSAGING SYSTEM
// =====================================

const userSearch = document.getElementById("userSearch");
const searchResults = document.getElementById("searchResults");
const conversationList = document.getElementById("conversationList");

const emptyChat = document.getElementById("emptyChat");
const activeChat = document.getElementById("activeChat");

const chatTitle = document.getElementById("chatTitle");
const messagesList = document.getElementById("messagesList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const typingIndicator = document.getElementById("typingIndicator");
const chatLayout = document.querySelector(".chat-layout");
const backToMessages = document.getElementById("backToMessages");

let currentUser = null;
let currentConversation = null;
let otherUser = null;

let unsubscribeMessages = null;
let unsubscribeTyping = null;
let unsubscribeConversations = null;

let searchTimeout = null;
let typingTimeout = null;
let isSending = false;

// =====================================
// EXTRA STYLING
// =====================================

const extraStyles = document.createElement("style");

extraStyles.textContent = `
  #messagesList {
    display: flex;
    flex-direction: column;
    gap: 5px;
    scroll-behavior: smooth;
  }

  .message-row {
    width: 100%;
    display: flex;
    align-items: flex-end;
    gap: 9px;
    margin-bottom: 8px;
  }

  .message-row.mine {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: min(78%, 520px);
    width: fit-content;
    min-width: 45px;
    padding: 11px 15px;
    font-size: 14px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .message-text {
    white-space: pre-wrap;
  }

  .message-time {
    display: block;
    font-size: 9px;
    opacity: 0.65;
    margin-top: 6px;
    text-align: right;
  }

  .message-avatar {
    flex-shrink: 0;
  }

  .conversation {
    display: block;
    width: 100%;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .conversation small {
    display: block;
    margin-top: 5px;
    color: #81798d;
    font-size: 10px;
  }

  #typingIndicator {
    min-height: 13px;
    color: #c49be6;
    font-size: 10px;
    margin-bottom: 3px;
  }

  #searchResults button {
    display: block;
    text-align: left;
  }

  .message-date {
    text-align: center;
    color: #81798d;
    font-size: 10px;
    margin: 14px 0;
  }

  @media(max-width: 700px) {
    .message-bubble {
      max-width: 84%;
      padding: 10px 13px;
    }

    #messagesList {
      padding: 13px;
    }
  }
`;

document.head.appendChild(extraStyles);

// =====================================
// HELPERS
// =====================================

function showError(message) {
  searchResults.textContent = message;
}

function getInitial(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "Just now";
  }

  return timestamp.toDate().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "";
  }

  return timestamp.toDate().toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getOtherParticipant(participants) {
  return participants.find(uid => uid !== currentUser.uid);
}

// =====================================
// USER SEARCH
// =====================================

userSearch.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  const search = userSearch.value.trim().toLowerCase();

  if (search.length < 2) {
    searchResults.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(() => {
    searchUsers(search);
  }, 350);
});

async function searchUsers(search) {
  searchResults.textContent = "Searching...";

  try {
    const usersQuery = query(
      collection(db, "publicUsers"),
      where("username", ">=", search),
      where("username", "<=", search + "\uf8ff"),
      orderBy("username"),
      limit(15)
    );

    const snapshot = await getDocs(usersQuery);

    searchResults.innerHTML = "";

    const users = snapshot.docs.filter(
      userDoc => userDoc.id !== currentUser.uid
    );

    if (users.length === 0) {
      searchResults.textContent = "No players found.";
      return;
    }

    users.forEach(userDoc => {
      const user = userDoc.data();

      const button = document.createElement("button");

      button.type = "button";
      button.innerHTML = "";

      const name = document.createElement("strong");
      name.textContent = user.displayName || user.username || "Player";

      const username = document.createElement("small");
      username.textContent = "@" + (user.username || "player");

      button.append(name, username);

      button.addEventListener("click", () => {
        openConversation(userDoc.id, user);
      });

      searchResults.appendChild(button);
    });

  } catch (error) {
    console.error("Search error:", error);
    searchResults.textContent = "Couldn't search players. Check Firestore rules.";
  }
}

// =====================================
// OPEN OR CREATE CONVERSATION
// =====================================

async function openConversation(userId, userData) {
  if (!currentUser || userId === currentUser.uid) return;

  try {
    const participants = [currentUser.uid, userId];

    const existingQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const existing = await getDocs(existingQuery);

    const match = existing.docs.find(conversation => {
      const data = conversation.data();

      return data.participants &&
        data.participants.includes(userId);
    });

    let conversationId;

    if (match) {
      conversationId = match.id;
    } else {
      conversationId = [currentUser.uid, userId].sort().join("_");

      const conversationRef = doc(
        db,
        "conversations",
        conversationId
      );

      await setDoc(conversationRef, {
        participants,
        participantNames: {
          [currentUser.uid]:
            currentUser.displayName || currentUser.email || "Player",

          [userId]:
            userData.displayName || userData.username || "Player"
        },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    currentConversation = conversationId;
    otherUser = userId;
chatLayout.classList.add("dm-open");
    const displayName =
      userData.displayName ||
      userData.username ||
      "Player";

    chatTitle.textContent = displayName;

    emptyChat.style.display = "none";
    activeChat.style.display = "flex";

    userSearch.value = "";
    searchResults.innerHTML = "";

    listenForMessages();
    listenForTyping();

    messageInput.focus();

  } catch (error) {
    console.error("Conversation error:", error);
    showError("Couldn't open conversation. Check Firestore rules.");
  }
}

// =====================================
// CONVERSATION LIST
// =====================================

function listenForConversations() {
  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participants", "array-contains", currentUser.uid)
  );

  unsubscribeConversations = onSnapshot(
    conversationsQuery,
    snapshot => {
      conversationList.innerHTML = "";

      if (snapshot.empty) {
        conversationList.textContent = "No conversations yet.";
        return;
      }

      const conversations = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      conversations.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis?.() || 0;
        const timeB = b.lastMessageAt?.toMillis?.() || 0;

        return timeB - timeA;
      });

      conversations.forEach(conversation => {
        const otherId = getOtherParticipant(
          conversation.participants || []
        );

        const name =
          conversation.participantNames?.[otherId] || "Player";

        const button = document.createElement("button");

        button.className = "conversation";
        button.type = "button";

        const title = document.createElement("strong");
        title.textContent = name;

        const preview = document.createElement("small");
        preview.textContent =
          conversation.lastMessage || "Start chatting...";

        button.append(title, preview);

        button.addEventListener("click", async () => {
          try {
            const publicUser = await getDoc(
              doc(db, "publicUsers", otherId)
            );

            openConversation(
              otherId,
              publicUser.exists()
                ? publicUser.data()
                : { displayName: name }
            );

          } catch (error) {
            console.error(error);
          }
        });

        conversationList.appendChild(button);
      });
    },
    error => {
      console.error("Conversation listener:", error);
      conversationList.textContent =
        "Couldn't load conversations.";
    }
  );
}

// =====================================
// LOAD MESSAGES
// =====================================

function listenForMessages() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  messagesList.innerHTML = "";

  const messagesQuery = query(
    collection(
      db,
      "conversations",
      currentConversation,
      "messages"
    ),
    orderBy("createdAt", "asc")
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    snapshot => {
      messagesList.innerHTML = "";

      snapshot.forEach(messageDoc => {
        renderMessage(messageDoc.data());
      });

      messagesList.scrollTop = messagesList.scrollHeight;
    },
    error => {
      console.error("Messages listener:", error);
      messagesList.textContent =
        "Couldn't load messages. Check Firestore rules.";
    }
  );
}

// =====================================
// DISPLAY MESSAGE
// =====================================


function renderMessage(message) {
  const mine = message.senderId === currentUser.uid;

  const row = document.createElement("div");
  row.className = mine ? "message-row mine" : "message-row";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const sender = document.createElement("span");
  sender.className = "message-sender";
  sender.textContent = mine ? "YOU" : chatTitle.textContent;

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message.text || "";

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatTime(message.createdAt);

  bubble.appendChild(sender);
  bubble.appendChild(text);
  bubble.appendChild(time);

  row.appendChild(bubble);
  messagesList.appendChild(row);
}


// =====================================
// SEND MESSAGE
// =====================================


messageForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (isSending || !currentUser || !currentConversation) {
    console.error("No active conversation or user.");
    return;
  }

  const text = messageInput.value.trim();

  if (!text) return;

  isSending = true;

  const sendButton = messageForm.querySelector("button");
  sendButton.disabled = true;

  try {
    const conversationRef = doc(
      db,
      "conversations",
      currentConversation
    );

    const messagesRef = collection(
      db,
      "conversations",
      currentConversation,
      "messages"
    );

    await addDoc(messagesRef, {
      senderId: currentUser.uid,
      text: text,
      createdAt: serverTimestamp()
    });

    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp()
    });

    messageInput.value = "";
    setTypingStatus(false);

  } catch (error) {
    console.error("SEND ERROR:", error);
    alert("Message failed: " + error.message);

  } finally {
    isSending = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
});


// =====================================
// TYPING INDICATOR
// =====================================

async function setTypingStatus(status) {
  if (!currentConversation || !currentUser) return;

  const typingRef = doc(
    db,
    "conversations",
    currentConversation,
    "typing",
    currentUser.uid
  );

  try {
    if (status) {
      await setDoc(typingRef, {
        isTyping: true,
        updatedAt: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (error) {
    console.error("Typing status error:", error);
  }
}

messageInput.addEventListener("input", () => {
  if (!currentConversation) return;

  setTypingStatus(true);

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    setTypingStatus(false);
  }, 1800);
});

messageInput.addEventListener("blur", () => {
  clearTimeout(typingTimeout);
  setTypingStatus(false);
});

function listenForTyping() {
  if (unsubscribeTyping) {
    unsubscribeTyping();
  }

  typingIndicator.textContent = "";

  const typingRef = doc(
    db,
    "conversations",
    currentConversation,
    "typing",
    otherUser
  );

  unsubscribeTyping = onSnapshot(
    typingRef,
    snapshot => {
      if (snapshot.exists() && snapshot.data().isTyping) {
        typingIndicator.textContent = "Typing...";
      } else {
        typingIndicator.textContent = "";
      }
    },
    error => {
      console.error("Typing listener:", error);
    }
  );
}

// =====================================
// LOGIN CHECK
// =====================================

onAuthStateChanged(auth, user => {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeTyping) unsubscribeTyping();
  if (unsubscribeConversations) unsubscribeConversations();

  currentUser = user;

  if (!user) {
    emptyChat.style.display = "block";
    activeChat.style.display = "none";
    conversationList.textContent = "Log in to view conversations.";
    return;
  }

  listenForConversations();
});
backToMessages.addEventListener("click", () => {
  chatLayout.classList.remove("dm-open");

  activeChat.style.display = "none";
  emptyChat.style.display = "block";

  currentConversation = null;
  otherUser = null;

  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeTyping) unsubscribeTyping();

  messagesList.innerHTML = "";
  typingIndicator.textContent = "";
});
