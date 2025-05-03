// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, setDoc, query, where } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALQJ2OXxTriAWkIz9mE3Y3vCciPmFZdus",
  authDomain: "quotesapp-f7f13.firebaseapp.com",
  projectId: "quotesapp-f7f13",
  storageBucket: "quotesapp-f7f13.firebasestorage.app",
  messagingSenderId: "888847498487",
  appId: "1:888847498487:web:f225e87cb966a8c0c9a7f2",
  measurementId: "G-6XWHWSQ3MS"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection reference
const quotesCollection = collection(db, "quotes");

// Function to get all quotes from Firestore
export async function getQuotesFromFirebase() {
  try {
    const querySnapshot = await getDocs(quotesCollection);
    const quotes = [];
    querySnapshot.forEach((doc) => {
      quotes.push({ id: doc.id, ...doc.data() });
    });
    return quotes;
  } catch (error) {
    console.error("Error getting quotes from Firebase:", error);
    throw error;
  }
}

// Function to add a new quote to Firestore
export async function addQuoteToFirebase(quote) {
  try {
    const docRef = await addDoc(quotesCollection, quote);
    return { id: docRef.id, ...quote };
  } catch (error) {
    console.error("Error adding quote to Firebase:", error);
    throw error;
  }
}

// Function to delete a quote from Firestore
export async function deleteQuoteFromFirebase(quoteId) {
  try {
    await deleteDoc(doc(db, "quotes", quoteId));
    return true;
  } catch (error) {
    console.error("Error deleting quote from Firebase:", error);
    throw error;
  }
}

// Function to update all quotes in Firestore
export async function updateAllQuotesInFirebase(quotes) {
  try {
    // This is a simple implementation - in a production app, you might want to use batched writes
    for (const quote of quotes) {
      const { id, ...quoteData } = quote;
      if (id) {
        await setDoc(doc(db, "quotes", id), quoteData);
      } else {
        await addDoc(quotesCollection, quote);
      }
    }
    return true;
  } catch (error) {
    console.error("Error updating quotes in Firebase:", error);
    throw error;
  }
}

// Function to migrate quotes from JSON to Firebase
export async function migrateQuotesToFirebase(quotes) {
  try {
    // Check if migration has already been done
    const querySnapshot = await getDocs(quotesCollection);
    if (querySnapshot.size > 0) {
      console.log("Migration already completed. Quotes already exist in Firebase.");
      return false;
    }
    
    // Perform migration
    for (const quote of quotes) {
      await addDoc(quotesCollection, quote);
    }
    console.log(`Successfully migrated ${quotes.length} quotes to Firebase`);
    return true;
  } catch (error) {
    console.error("Error migrating quotes to Firebase:", error);
    throw error;
  }
}

export { db };