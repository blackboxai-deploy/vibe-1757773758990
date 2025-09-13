"use client";

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './GameEngine';
import { AudioManager } from './AudioManager';

interface GameProps {
  onGameEnd: () => void;
}

export default function Game({ onGameEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [activePowerUps, setActivePowerUps] = useState<Array<{type: string, timeLeft: number}>>([]);

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Initialize game engine
    gameEngineRef.current = new GameEngine(canvas, {
      onScoreChange: setScore,
      onLivesChange: setLives,
      onLevelChange: setLevel,
      onPowerUpChange: setActivePowerUps,
      onGameOver: () => setGameState('gameOver')
    });

    // Initialize audio
    audioManagerRef.current = new AudioManager();

    // Start game loop
    const gameLoop = (timestamp: number) => {
      if (gameState === 'playing' && gameEngineRef.current) {
        gameEngineRef.current.update(timestamp);
        gameEngineRef.current.render(ctx);
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameEngineRef.current) return;

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          e.preventDefault();
          gameEngineRef.current.setPlayerInput('left', true);
          break;
        case 'arrowright':
        case 'd':
          e.preventDefault();
          gameEngineRef.current.setPlayerInput('right', true);
          break;
        case ' ':
          e.preventDefault();
          gameEngineRef.current.setPlayerInput('shoot', true);
          if (audioManagerRef.current) {
            audioManagerRef.current.playSound('shoot');
          }
          break;
        case 'p':
          e.preventDefault();
          setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
          break;
        case 'escape':
          e.preventDefault();
          setGameState('paused');
          break;
      }
    };

    const handleKeyRelease = (e: KeyboardEvent) => {
      if (!gameEngineRef.current) return;

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          gameEngineRef.current.setPlayerInput('left', false);
          break;
        case 'arrowright':
        case 'd':
          gameEngineRef.current.setPlayerInput('right', false);
          break;
        case ' ':
          gameEngineRef.current.setPlayerInput('shoot', false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyRelease);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyRelease);
    };
  }, []);

  const handleRestart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setActivePowerUps([]);
    setGameState('playing');
    
    if (gameEngineRef.current) {
      gameEngineRef.current.reset();
    }
  };

  const handleQuit = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    onGameEnd();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-purple-900 to-black p-4">
      <div className="relative">
        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 rounded-t-lg border-b border-cyan-500">
          <div className="flex justify-between items-center text-white">
            <div className="flex space-x-8">
              <div className="text-cyan-400">
                <span className="text-sm opacity-75">SCORE</span>
                <div className="text-2xl font-bold font-mono">{score.toLocaleString()}</div>
              </div>
              <div className="text-green-400">
                <span className="text-sm opacity-75">LIVES</span>
                <div className="text-2xl font-bold">
                  {Array.from({length: lives}, () => '♥').join(' ')}
                </div>
              </div>
              <div className="text-yellow-400">
                <span className="text-sm opacity-75">LEVEL</span>
                <div className="text-2xl font-bold font-mono">{level}</div>
              </div>
            </div>
            
            {/* Active Power-ups */}
            <div className="flex space-x-2">
              {activePowerUps.map((powerUp, index) => (
                <div key={index} className="bg-purple-600 px-3 py-1 rounded-full text-xs font-bold">
                  <span className="mr-1">
                    {powerUp.type === 'rapidFire' ? '⚡' : powerUp.type === 'shield' ? '🛡️' : '⭐'}
                  </span>
                  {powerUp.type.toUpperCase()}
                  <span className="ml-1 opacity-75">{Math.ceil(powerUp.timeLeft)}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          className="block border-2 border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/25"
          style={{ marginTop: '80px' }}
        />

        {/* Pause Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-cyan-400">GAME PAUSED</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setGameState('playing')}
                  className="block w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  RESUME
                </button>
                <button
                  onClick={handleRestart}
                  className="block w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  RESTART
                </button>
                <button
                  onClick={handleQuit}
                  className="block w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  QUIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center space-y-6">
              <h2 className="text-5xl font-bold text-red-500 animate-pulse">GAME OVER</h2>
              <div className="text-2xl text-white">
                <p>Final Score: <span className="text-cyan-400 font-bold font-mono">{score.toLocaleString()}</span></p>
                <p>Level Reached: <span className="text-yellow-400 font-bold">{level}</span></p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleRestart}
                  className="block w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 transform hover:scale-105"
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={handleQuit}
                  className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  BACK TO MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls Help */}
        <div className="mt-4 text-center text-gray-400 text-sm space-x-6">
          <span>←→ Move</span>
          <span>SPACE Shoot</span>
          <span>P Pause</span>
          <span>ESC Menu</span>
        </div>
      </div>
    </div>
  );
}