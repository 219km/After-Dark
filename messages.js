
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
// HELPERS
// =====================================

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

function stopMessageListeners() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  if (unsubscribeTyping) {
    unsubscribeTyping();
    unsubscribeTyping = null;
  }
}

function showSearchMessage(message) {
  searchResults.textContent = message;
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
  if (!currentUser) return;

  showSearchMessage("Searching...");

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
      item => item.id !== currentUser.uid
    );

    if (users.length === 0) {
      showSearchMessage("No players found.");
      return;
    }

    users.forEach(userDoc => {
      const user = userDoc.data();

      const button = document.createElement("button");
      button.type = "button";

      const name = document.createElement("strong");
      name.textContent =
        user.displayName || user.username || "Player";

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
    showSearchMessage("Couldn't search players.");
  }
}

// =====================================
// OPEN OR CREATE CONVERSATION
// =====================================

async function openConversation(userId, userData) {
  if (!currentUser || userId === currentUser.uid) return;

  try {
    const existingQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const existing = await getDocs(existingQuery);

    const match = existing.docs.find(item => {
      const data = item.data();

      return data.participants &&
        data.participants.includes(userId);
    });

    let conversationId;

    if (match) {
      conversationId = match.id;
    } else {
      conversationId = [currentUser.uid, userId]
        .sort()
        .join("_");

      const conversationRef = doc(
        db,
        "conversations",
        conversationId
      );

      await setDoc(conversationRef, {
        participants: [currentUser.uid, userId],

        participantNames: {
          [currentUser.uid]:
            currentUser.displayName ||
            currentUser.email ||
            "Player",

          [userId]:
            userData.displayName ||
            userData.username ||
            "Player"
        },

        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    currentConversation = conversationId;
    otherUser = userId;

    chatLayout.classList.add("dm-open");

    chatTitle.textContent =
      userData.displayName ||
      userData.username ||
      "Player";

    const avatar = document.querySelector(".chat-avatar");
    avatar.textContent = getInitial(chatTitle.textContent);

    emptyChat.style.display = "none";
    activeChat.style.display = "flex";

    userSearch.value = "";
    searchResults.innerHTML = "";

    listenForMessages();
    listenForTyping();

    messageInput.focus();

  } catch (error) {
    console.error("Conversation error:", error);
    showSearchMessage("Couldn't open conversation.");
  }
}

// =====================================
// CONVERSATION LIST
// =====================================

function listenForConversations() {
  if (unsubscribeConversations) {
    unsubscribeConversations();
  }

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
        const otherId = conversation.participants.find(
          uid => uid !== currentUser.uid
        );

        if (!otherId) return;

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

            await openConversation(
              otherId,
              publicUser.exists()
                ? publicUser.data()
                : { displayName: name }
            );

          } catch (error) {
            console.error("Open conversation error:", error);
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
    unsubscribeMessages = null;
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
        "Couldn't load messages.";
    }
  );
}

// =====================================
// DISPLAY MESSAGES
// =====================================

function renderMessage(message) {
  const mine = message.senderId === currentUser.uid;

  const row = document.createElement("div");
  row.className = mine
    ? "message-row mine"
    : "message-row";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const sender = document.createElement("span");
  sender.className = "message-sender";
  sender.textContent = mine
    ? "YOU"
    : chatTitle.textContent;

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = message.text || "";

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = formatTime(message.createdAt);

  bubble.append(sender, text, time);
  row.appendChild(bubble);

  messagesList.appendChild(row);
}

// =====================================
// SEND MESSAGES
// =====================================

messageForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (
    isSending ||
    !currentUser ||
    !currentConversation
  ) {
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
// TYPING STATUS
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

// =====================================
// LISTEN FOR TYPING
// =====================================

function listenForTyping() {
  if (unsubscribeTyping) {
    unsubscribeTyping();
    unsubscribeTyping = null;
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
      typingIndicator.textContent =
        snapshot.exists() && snapshot.data().isTyping
          ? "Typing..."
          : "";
    },

    error => {
      console.error("Typing listener:", error);
    }
  );
}

// =====================================
// BACK TO CONVERSATIONS
// =====================================

backToMessages.addEventListener("click", async () => {
  clearTimeout(typingTimeout);

  await setTypingStatus(false);

  stopMessageListeners();

  chatLayout.classList.remove("dm-open");

  activeChat.style.display = "none";
  emptyChat.style.display = "block";

  currentConversation = null;
  otherUser = null;

  messagesList.innerHTML = "";
  typingIndicator.textContent = "";
});

// =====================================
// LOGIN CHECK
// =====================================

onAuthStateChanged(auth, user => {
  stopMessageListeners();

  if (unsubscribeConversations) {
    unsubscribeConversations();
    unsubscribeConversations = null;
  }

  currentUser = user;

  currentConversation = null;
  otherUser = null;

  chatLayout.classList.remove("dm-open");

  activeChat.style.display = "none";
  emptyChat.style.display = "block";

  messagesList.innerHTML = "";
  typingIndicator.textContent = "";

  if (!user) {
    conversationList.textContent =
      "Log in to view conversations.";

    return;
  }

  listenForConversations();
});
