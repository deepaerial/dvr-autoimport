import { useState, useCallback } from 'react';


export const useErrorMessage = (timeoutMs: number = 5000): [string | null, (message: string) => void] => {
    const [error, setError] = useState<string | null>(null);

    const showError = useCallback((message: string) => {
        setError(message);
        const timer = setTimeout(() => setError(null), timeoutMs);
        return () => clearTimeout(timer);
    }, [timeoutMs]);

    return [ error, showError ];
};