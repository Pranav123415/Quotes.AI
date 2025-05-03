import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from 'fs';

// Import Firebase admin for server-side authentication
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// Import Firebase functions
import { getQuotesFromFirebase, addQuoteToFirebase, deleteQuoteFromFirebase, updateAllQuotesInFirebase, migrateQuotesToFirebase } from './firebase.js';
import { readFile } from 'fs/promises';

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Use dynamic import for JSON in ES modules
  const serviceAccountData = await readFile('./firebase-service-account.json', 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
} catch (error) {
  console.error('Error loading service account:', error);
  serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : null;
}

if (!serviceAccount) {
  console.warn('No service account found. Authentication will not work.');
}

const adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const adminAuth = getAuth(adminApp);

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Path to the local quotes.json file (for migration purposes)
const quotesFilePath = path.join(__dirname, 'quotes.json');

// Helper function to read quotes from local file (only used for migration)
const readQuotesFile = () => {
    try {
        const data = fs.readFileSync(quotesFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading quotes file:', error);
        return [];
    }
};

// Migrate quotes from JSON to Firebase on server start
async function migrateQuotes() {
    try {
        const localQuotes = readQuotesFile();
        if (localQuotes.length > 0) {
            const migrationResult = await migrateQuotesToFirebase(localQuotes);
            if (migrationResult) {
                console.log('Successfully migrated quotes from JSON to Firebase');
            } else {
                console.log('Quotes already exist in Firebase, skipping migration');
            }
        }
    } catch (error) {
        console.error('Error during migration:', error);
    }
}

// Route to get all quotes from Firebase
app.get('/api/quotes', async (req, res) => {
    try {
        const quotes = await getQuotesFromFirebase();
        res.status(200).json(quotes);
    } catch (error) {
        console.error('Error getting quotes:', error);
        res.status(500).json({ success: false, message: 'Failed to get quotes', error: error.message });
    }
});

// Middleware to verify Firebase authentication
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token', error: error.message });
    }
};

// Route to handle adding a new quote (requires authentication)
app.post('/api/quotes', authenticateUser, async (req, res) => {
    try {
        const newQuote = req.body;
        const addedQuote = await addQuoteToFirebase(newQuote);
        res.status(200).json({ success: true, message: 'Quote added successfully', quote: addedQuote });
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ success: false, message: 'Failed to add quote', error: error.message });
    }
});

// Route to handle deleting a quote (requires authentication)
app.delete('/api/quotes/:quoteId', authenticateUser, async (req, res) => {
    try {
        const quoteId = req.params.quoteId;
        await deleteQuoteFromFirebase(quoteId);
        res.status(200).json({ success: true, message: 'Quote deleted successfully' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ success: false, message: 'Failed to delete quote', error: error.message });
    }
});

// Route to handle updating all quotes (requires authentication)
app.post('/api/quotes/update', authenticateUser, async (req, res) => {
    try {
        const updatedQuotes = req.body;
        
        // Validate that we received an array
        if (!Array.isArray(updatedQuotes)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of quotes.' });
        }
        
        await updateAllQuotesInFirebase(updatedQuotes);
        res.status(200).json({ success: true, message: 'Quotes updated successfully' });
    } catch (error) {
        console.error('Error updating quotes:', error);
        res.status(500).json({ success: false, message: 'Failed to update quotes', error: error.message });
    }
});

// Start the server and migrate quotes
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Quotes file location (for migration): ${quotesFilePath}`);
    
    // Migrate quotes from JSON to Firebase
    await migrateQuotes();
});