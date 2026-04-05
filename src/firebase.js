// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// As suas chaves reais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBktZnq5jSKDveqs1AWj2bjB_HEP_oIzB4",
  authDomain: "opuria-75208.firebaseapp.com",
  projectId: "opuria-75208",
  storageBucket: "opuria-75208.firebasestorage.app",
  messagingSenderId: "303794766312",
  appId: "1:303794766312:web:808d3c3d76426c8724a45d"
};

// Inicializa o Firebase e o Banco de Dados
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);