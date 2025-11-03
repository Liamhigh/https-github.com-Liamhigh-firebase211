import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCJPR9FS2sjg3ykRDRJfEVo9MCq3jHFeF4",
    authDomain: "verum-omnis-v2.firebaseapp.com",
    projectId: "verum-omnis-v2",
    storageBucket: "verum-omnis-v2.firebasestorage.app",
    messagingSenderId: "310016281459",
    appId: "1:310016281459:web:658c99ca93996e19839306",
    measurementId: "G-59SKZ5NBT5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db_firestore = getFirestore(app);
export const storage = getStorage(app);

let authReadyPromise: Promise<User | null>;

authReadyPromise = new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        resolve(user);
        unsubscribe(); // Unsubscribe after the first auth state is determined
    });
});

export const getCurrentUser = async (): Promise<User> => {
    let user = await authReadyPromise;
    if (user) {
        return user;
    }
    
    // User is not signed in, sign in anonymously.
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
};
