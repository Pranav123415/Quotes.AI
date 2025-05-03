// Firebase Authentication Module
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase.js";

// Initialize Firebase Auth
const auth = getAuth(app);

// State to track authentication status
let currentUser = null;

// Function to sign in with email and password
export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    return { success: true, user: currentUser };
  } catch (error) {
    console.error("Error signing in:", error);
    return { success: false, error: error.message };
  }
}

// Function to sign out
export async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error: error.message };
  }
}

// Function to get current user
export function getCurrentUser() {
  return currentUser;
}

// Function to check if user is authenticated
export function isAuthenticated() {
  return !!currentUser;
}

// Function to check if user is admin
export function isAdmin() {
  // You can implement more sophisticated role checking here
  // For now, we'll consider any authenticated user as admin
  return !!currentUser;
}

// Set up auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  // Dispatch custom event for auth state change
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
});

export { auth };