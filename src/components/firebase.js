import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
const firebaseConfig = {
    apiKey: "AIzaSyDH8du-Pdl5OshdUpJP2U-J-yfeUQMfbWE",
    authDomain: "gruas-d5b00.firebaseapp.com",
    projectId: "gruas-d5b00",
    storageBucket: "gruas-d5b00.appspot.com",
    messagingSenderId: "790191029265",
    appId: "1:790191029265:web:567c266f135ee20b6ec5b0",
    measurementId: "G-BCWQKC6ZRV"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;