
import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const CLOUD_NAME = "lyewttef";
const UPLOAD_PRESET = "afterdark_profiles";

// PROFILE ELEMENTS

const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");

const editName = document.getElementById("editName");
const editUsername = document.getElementById("editUsername");
const editBio = document.getElementById("editBio");

const profileImage = document.getElementById("profileImage");
const profileBanner = document.getElementById("profileBanner");

const pictureInput = document.getElementById("pictureInput");
const bannerInput = document.getElementById("bannerInput");

const saveButton = document.getElementById("saveProfile");
const message = document.getElementById("profileMessage");

// SETTINGS ELEMENTS

const logoutButton = document.getElementById("logoutButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const accountInfo = document.getElementById("accountInfo");

// VARIABLES

let currentUser = null;
let profileData = {};

// LOGIN CHECK

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "account.html";
    return;
  }

  currentUser = user;

  try {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      message.textContent = "Profile not found.";
      return;
    }

    profileData = snapshot.data();

    await setDoc(doc(db, "publicUsers", user.uid), {
      displayName: profileData.displayName || "Player",
      username: profileData.username || "",
      profilePicture: profileData.profilePicture || ""
    });

    showProfile();
    showAccountInfo();

  } catch (error) {
    message.textContent = error.message;
  }
});

// SHOW PROFILE

function showProfile() {
  profileName.textContent = profileData.displayName || "Player";

  profileUsername.textContent =
    "@" + (profileData.username || "");

  profileBio.textContent = profileData.bio || "";

  editName.value = profileData.displayName || "";
  editUsername.value = profileData.username || "";
  editBio.value = profileData.bio || "";

  if (profileData.profilePicture) {
    profileImage.src = profileData.profilePicture;
  }

  if (profileData.banner) {
    profileBanner.style.backgroundImage =
      `url("${profileData.banner}")`;
  }
}

// SHOW ACCOUNT INFORMATION

function showAccountInfo() {
  if (!currentUser || !accountInfo) return;

  accountInfo.textContent =
    "Email: " + (currentUser.email || "Not available");
}

// SAVE PROFILE

saveButton.addEventListener("click", async () => {
  if (!currentUser) return;

  const displayName = editName.value.trim();

  const username = editUsername.value.trim()
    .toLowerCase()
    .replace(/^@/, "");

  const bio = editBio.value.trim();

  if (!displayName || !username) {
    message.textContent = "Name and username are required.";
    return;
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    message.textContent =
      "Username must be 3-20 characters.";
    return;
  }

  if (bio.length > 250) {
    message.textContent =
      "Bio must be under 250 characters.";
    return;
  }

  saveButton.disabled = true;
  message.textContent = "Saving...";

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      displayName,
      username,
      bio
    });

    await updateProfile(currentUser, {
      displayName
    });

    await setDoc(doc(db, "publicUsers", currentUser.uid), {
      displayName,
      username,
      profilePicture: profileData.profilePicture || ""
    });

    profileData = {
      ...profileData,
      displayName,
      username,
      bio
    };

    showProfile();
    message.textContent = "Profile saved!";

  } catch (error) {
    message.textContent = error.message;
  }

  saveButton.disabled = false;
});

// UPLOAD PROFILE PICTURE OR BANNER

async function uploadImage(file, field) {
  if (!currentUser || !file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    message.textContent = "Use JPG, PNG or WEBP images.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    message.textContent = "Images must be under 5 MB.";
    return;
  }

  message.textContent = "Uploading image...";

  try {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message || "Upload failed."
      );
    }

    const imageUrl = result.secure_url;

    await updateDoc(doc(db, "users", currentUser.uid), {
      [field]: imageUrl
    });

    if (field === "profilePicture") {
      await setDoc(doc(db, "publicUsers", currentUser.uid), {
        displayName: profileData.displayName || "Player",
        username: profileData.username || "",
        profilePicture: imageUrl
      });
    }

    profileData[field] = imageUrl;

    showProfile();

    message.textContent = "Image uploaded successfully!";

  } catch (error) {
    message.textContent = error.message;
  }
}

pictureInput.addEventListener("change", () => {
  uploadImage(pictureInput.files[0], "profilePicture");
});

bannerInput.addEventListener("change", () => {
  uploadImage(bannerInput.files[0], "banner");
});

// LOG OUT

logoutButton.addEventListener("click", async () => {
  const confirmed = confirm(
    "Are you sure you want to log out?"
  );

  if (!confirmed) return;

  try {
    await signOut(auth);
    window.location.href = "account.html";
  } catch (error) {
    alert("Could not log out: " + error.message);
  }
});

// DELETE ACCOUNT

deleteAccountButton.addEventListener("click", () => {
  const confirmed = confirm(
    "Account deletion needs secure server-side cleanup. " +
    "This button will not delete your account or data yet. " +
    "Would you like to continue to the account page?"
  );

  if (confirmed) {
    alert(
      "Your account has NOT been deleted. " +
      "A secure deletion system still needs to be set up."
    );
  }
});

console.log("AFTER DARK PROFILE JS LOADED");
