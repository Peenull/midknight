"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBs11DuIwOeEcezsUbkdrX6rVZ2t_1J64U",
  authDomain: "midknight-9e9b4.firebaseapp.com",
  projectId: "midknight-9e9b4",
  storageBucket: "midknight-9e9b4.firebasestorage.app",
  messagingSenderId: "892872810055",
  appId: "1:892872810055:web:dd07b20b94acdf410e1b62",
  measurementId: "G-9T14V33KR7",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
