
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const accountForm = document.getElementById("accountForm");
const displayName = document.getElementById("displayName");
const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");

const nameField = document.getElementById("nameField");
const usernameField = document.getElementById("usernameField");

const formTitle = document.getElementById("formTitle");
const submitButton = document.getElementById("submitButton");
const switchText = document.getElementById("switchText");
const switchMode = document.getElementById("switchMode");
const message = document.getElementById("message");

let isLogin = false;

switchMode.addEventListener("click", (event) => {
  event.preventDefault();

  isLogin = !isLogin;

  formTitle.textContent = isLogin
    ? "LOG IN"
    : "CREATE ACCOUNT";

  submitButton.textContent = isLogin
    ? "LOG IN"
    : "CREATE ACCOUNT";

  switchText.textContent = isLogin
    ? "Don't have an account?"
    : "Already have an account?";

  switchMode.textContent = isLogin
    ? "CREATE ACCOUNT"
    : "LOG IN";

  nameField.style.display = isLogin ? "none" : "block";
  usernameField.style.display = isLogin ? "none" : "block";
console.log("ACCOUNT DATA SAVED");
  message.textContent = "SUCCESS";
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "PLEASE WAIT...";
  submitButton.disabled = true;

  const userEmail = email.value.trim();
  const userPassword = password.value;

  try {

    if (isLogin) {

      await signInWithEmailAndPassword(
        auth,
        userEmail,
        userPassword
      );

    } else {

      const name = displayName.value.trim();
      const user = username.value.trim().toLowerCase();

      if (!name || !user) {
        throw new Error("Please enter your display name and username.");
      }

      if (!/^[a-z0-9_]{3,20}$/.test(user)) {
        throw new Error("Username must be 3 to 20 characters. Use letters, numbers, and underscores.");
      }

      const newAccount = await createUserWithEmailAndPassword(
        auth,
        userEmail,
        userPassword
      );

      const existingUsername = await getDocs(
        query(
          collection(db, "publicUsers"),
          where("username", "==", user)
        )
      );

      if (!existingUsername.empty) {
        throw new Error("That username is already taken. Please choose another.");
      }

      await updateProfile(newAccount.user, {
        displayName: name
      });

      await setDoc(doc(db, "users", newAccount.user.uid), {
        displayName: name,
        username: user,
        bio: "Welcome to AFTER DARK.",
        profilePicture: "",
        banner: "",
        createdAt: new Date()
      });

      await setDoc(doc(db, "publicUsers", newAccount.user.uid), {
        displayName: name,
        username: user,
        profilePicture: ""
      });

    }

    message.textContent = "SUCCESS!";

    window.location.href = "profile.html";

  } catch (error) {

    message.textContent =
      "ERROR: " + error.code + " | " + error.message;

  } finally {
    submitButton.disabled = false;
  }
});
