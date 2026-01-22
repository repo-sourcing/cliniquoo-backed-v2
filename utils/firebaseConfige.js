const firebase = require("firebase-admin");

// Mock Firebase initialization (credentials not provided in this environment)
// In production, use actual service account JSON file
if (process.env.FIREBASE_CONFIG) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.warn("Firebase initialization failed - using mock mode");
  }
} else {
  // Mock mode for local development and testing
  if (firebase.apps.length === 0) {
    try {
      firebase.initializeApp({
        projectId: "mock-project-id",
      });
    } catch (error) {
      // Firebase app already initialized
    }
  }
}

module.exports = firebase;
