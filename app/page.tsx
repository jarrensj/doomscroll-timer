'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

interface TimerState {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

interface DailyStats {
  date: string;
  total_time_ms: number;
}

export default function Home() {
  const { user, isLoaded } = useUser();
  const [timerState, setTimerState] = useState<TimerState>({
    startTime: null,
    elapsedTime: 0,
    isRunning: false,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('doomscroll-timer');
    if (savedState) {
      const parsed: TimerState = JSON.parse(savedState);
      // If timer was running when page was closed, calculate elapsed time
      if (parsed.isRunning && parsed.startTime) {
        const now = Date.now();
        const totalElapsed = parsed.elapsedTime + (now - parsed.startTime);
        setTimerState({
          startTime: now,
          elapsedTime: totalElapsed,
          isRunning: true,
        });
      } else {
        setTimerState(parsed);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('doomscroll-timer', JSON.stringify(timerState));
  }, [timerState]);

  // Update timer every second when running
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedTime: prev.startTime ? prev.elapsedTime + (Date.now() - prev.startTime) : prev.elapsedTime,
          startTime: Date.now(),
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning]);

  // Fetch today's daily stats from database
  const fetchDailyStats = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/today');
      if (response.ok) {
        const data = await response.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  // Sync session time to database
  const syncToDatabase = async (additionalTime: number) => {
    if (!user || additionalTime <= 0) return;
    
    try {
      const response = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additional_time_ms: additionalTime
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDailyStats(data);
      }
    } catch (error) {
      console.error('Error syncing to database:', error);
    }
  };

  // Load daily stats when user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      fetchDailyStats();
    }
  }, [isLoaded, user]);

  // Periodic sync to database (every 30 seconds when timer is running)
  useEffect(() => {
    if (timerState.isRunning && user) {
      syncIntervalRef.current = setInterval(() => {
        const currentTime = timerState.elapsedTime;
        const timeToSync = currentTime - lastSyncTime;
        
        if (timeToSync > 0) {
          syncToDatabase(timeToSync);
          setLastSyncTime(currentTime);
        }
      }, 30000); // Sync every 30 seconds
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.elapsedTime, lastSyncTime, user]);

  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      startTime: Date.now(),
      isRunning: true,
    }));
  };

  const stopTimer = async () => {
    // Sync remaining time to database before stopping
    if (user && timerState.elapsedTime > lastSyncTime) {
      const timeToSync = timerState.elapsedTime - lastSyncTime;
      await syncToDatabase(timeToSync);
      setLastSyncTime(timerState.elapsedTime);
    }
    
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
    }));
  };

  const resetTimer = async () => {
    // Sync remaining time to database before resetting
    if (user && timerState.elapsedTime > lastSyncTime) {
      const timeToSync = timerState.elapsedTime - lastSyncTime;
      await syncToDatabase(timeToSync);
    }
    
    setTimerState({
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
    });
    setLastSyncTime(0);
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getMileCount = (): number => {
    const totalSeconds = Math.floor(timerState.elapsedTime / 1000);
    const mileTime = 330; // 5:30 minutes mile time
    return Math.floor(totalSeconds / mileTime); // How many miles could have been run
  };

  const shouldShowMileMessage = (): boolean => {
    return getMileCount() > 0;
  };

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">doomscroll timer</h1>
      
      <div className="mb-8">
        <div className="text-6xl font-mono font-bold text-blue-600 mb-4">
          {formatTime(timerState.elapsedTime)}
        </div>
        <p className="text-gray-600 mb-2">
          {timerState.isRunning ? 'Currently doomscrolling...' : 'Time how long you are doomscrolling for'}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Current session • {user && dailyStats ? `Daily total: ${formatTime(dailyStats.total_time_ms + (timerState.elapsedTime - lastSyncTime))}` : 'Sign in to track daily totals'}
        </p>
        
        {shouldShowMileMessage() && (
          <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg max-w-md mx-auto">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🏃‍♂️</div>
              <div>
                <p className="text-orange-800 font-semibold text-lg">
                  You could have run {getMileCount()} {getMileCount() === 1 ? 'mile' : 'miles'}!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!timerState.isRunning ? (
          <button
            onClick={startTimer}
            className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            Start Timer
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            Stop Timer
          </button>
        )}
        
        {(timerState.elapsedTime > 0 || !timerState.isRunning) && (
          <button
            onClick={resetTimer}
            className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            Reset
          </button>
        )}
      </div>

      {timerState.elapsedTime > 0 && (
        <div className="mt-8 text-sm text-gray-500">
          {user ? 'Session saves locally • Daily totals sync to your account' : 'Timer saves locally • Sign in to track daily totals'}
        </div>
      )}
    </main>
  );
}