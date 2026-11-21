
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
window.addEventListener("error", (event) => {
  document.getElementById("message").textContent =
    "ERROR: " + event.message;
});
const form = document.getElementById("accountForm");
const message = document.getElementById("message");
const switchMode = document.getElementById("switchMode");

let isLogin = false;

switchMode.addEventListener("click", (e) => {
  e.preventDefault();

  isLogin = !isLogin;

  document.getElementById("formTitle").textContent =
    isLogin ? "WELCOME BACK" : "CREATE ACCOUNT";

  document.getElementById("submitButton").textContent =
    isLogin ? "LOG IN" : "CREATE ACCOUNT";

  document.getElementById("switchText").textContent =
    isLogin ? "Need an account?" : "Already have an account?";

  switchMode.textContent = isLogin ? "SIGN UP" : "LOG IN";

  document.getElementById("nameField").style.display =
    isLogin ? "none" : "block";

  document.getElementById("usernameField").style.display =
    isLogin ? "none" : "block";

  message.textContent = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Please wait...";

  try {

    if (isLogin) {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      message.textContent = "Login successful!";

      window.location.href = "profile.html";

    } else {

      const displayName =
        document.getElementById("displayName").value.trim();

      const username =
        document.getElementById("username").value
          .trim()
          .toLowerCase()
          .replace(/^@/, "");

      if (!displayName || !username) {
        throw new Error("Please fill in your name and username.");
      }

      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        throw new Error(
          "Username must be 3-20 characters using letters, numbers or underscores."
        );
      }

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: displayName
      });

      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName,
        username: username,
        bio: "Welcome to AFTER DARK.",
        profilePicture: "",
        banner: "",
        createdAt: serverTimestamp()
      });

      message.textContent = "Account created!";

      window.location.href = "profile.html";
    }

  } catch (error) {

    message.textContent = "ERROR: " + error.code + " | " + error.message;

  }
});
