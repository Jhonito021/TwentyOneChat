import React, { createContext, useState, useContext, useEffect, Children } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}

export const ThemeProvider = ({ Children }) => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? JSON.parse(saved) : true;
    })

    useEffect(() => {
        localStorage.setItem('theme', JSON.stringify(isDark));
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    const toggeTheme = () => setIsDark(!isDark);

    return (
        <ThemeContext.Provider value={{isDark, toggeTheme}}>
            {Children}
        </ThemeContext.Provider>
    )
}