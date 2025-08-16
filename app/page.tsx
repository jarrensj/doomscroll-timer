'use client';

import { useState, useEffect, useRef } from 'react';

interface TimerState {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

export default function Home() {
  const [timerState, setTimerState] = useState<TimerState>({
    startTime: null,
    elapsedTime: 0,
    isRunning: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      startTime: Date.now(),
      isRunning: true,
    }));
  };

  const stopTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: null,
    }));
  };

  const resetTimer = () => {
    setTimerState({
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
    });
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
        <p className="text-gray-600 mb-8">
          {timerState.isRunning ? 'Currently doomscrolling...' : 'Time how long you are doomscrolling for'}
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
          Timer automatically saves to local storage
        </div>
      )}
    </main>
  );
}