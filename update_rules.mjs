import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const securityRules = getSecurityRules();

const source = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Function to check if the user is an Admin
    function isAdmin() {
      return request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        request.auth.token.email == 'admin@nolavisualarts.org' ||
        request.auth.token.email == 'shimeong@gmail.com'
      );
    }

    // ------------------------------------------------------------------------
    // USER PROFILES & REGISTRATIONS
    // ------------------------------------------------------------------------
    match /users/{userId} {
      // Users can read/write their own profiles; Admins have full access
      allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
      
      match /registrations/{registrationId} {
        allow read, write: if request.auth != null && (request.auth.uid == userId || isAdmin());
      }
    }

    // ------------------------------------------------------------------------
    // PUBLIC READ, ADMIN WRITE
    // ------------------------------------------------------------------------
    match /courses/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /newsletters/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /calendar_events/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /news_feed/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /labor_directory/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /gig_alerts/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // NEW COLLECTIONS
    match /av_news/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /av_gigs/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /av_training/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ------------------------------------------------------------------------
    // PUBLIC CREATE, ADMIN READ/WRITE (Forms)
    // ------------------------------------------------------------------------
    match /contact_submissions/{document} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /enrollment_requests/{document} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /instructor_applications/{document} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /subscribers/{document} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    match /push_tokens/{document} {
      allow write: if true;
    }

    // ------------------------------------------------------------------------
    // ADMIN ONLY
    // ------------------------------------------------------------------------
    match /broadcast_history/{document} {
      allow read, write: if isAdmin();
    }
    
    // Explicitly deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

async function updateRules() {
  try {
    const ruleset = await securityRules.createRuleset({
      source: { files: [{ name: 'firestore.rules', content: source }] }
    });
    console.log('Created new ruleset:', ruleset.name);
    await securityRules.releaseFirestoreRuleset(ruleset.name);
    console.log('Rules released successfully!');
  } catch (err) {
    console.error('Error updating rules:', err);
  }
}

updateRules();
