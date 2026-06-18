import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-ruter-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useChat } from "./hooks/useAuth";