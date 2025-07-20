// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBWD1oHqjiLnqmN_z4eBqM2Rq3GR4kwsic",
  authDomain: "jlsapp2-50806.firebaseapp.com",
  projectId: "jlsapp2-50806",
  storageBucket: "jlsapp2-50806.firebasestorage.app",
  messagingSenderId: "666239194147",
  appId: "1:666239194147:web:04ebdf1774dc98c7440d96",
  measurementId: "G-7NM5Q0E5DK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
