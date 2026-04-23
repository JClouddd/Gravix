'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const GlobalEventContext = createContext({
  events: [],
  isConnected: false
});

export const useGlobalEvents = () => useContext(GlobalEventContext);

export function GlobalEventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/events/sse');

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('SSE connection established');
      };

      eventSource.addEventListener('connected', (event) => {
         console.log('SSE connection ready:', event.data);
      });

      // Listen for all unnamed message events
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setEvents((prev) => [...prev, { type: 'message', data, timestamp: Date.now() }]);
        } catch (e) {
          console.error('Failed to parse SSE message:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <GlobalEventContext.Provider value={{ events, isConnected }}>
      {children}
    </GlobalEventContext.Provider>
  );
}
