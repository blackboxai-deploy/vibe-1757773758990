"use client";

import { useState } from "react";
import Game from "@/components/Game";

export default function HomePage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  if (gameStarted) {
    return <Game onGameEnd={() => setGameStarted(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-2xl">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
            COSMIC DEFENDER
          </h1>
          <p className="text-xl text-gray-300">
            Defend Earth from the alien invasion!
          </p>
        </div>

        {/* Game Preview */}
        <div className="relative mx-auto w-80 h-60 bg-black rounded-lg border-2 border-cyan-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/20 to-purple-900/40">
            {/* Animated stars */}
            <div className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-12 right-12 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-300"></div>
            <div className="absolute top-20 left-16 w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-700"></div>
            <div className="absolute top-32 right-20 w-1 h-1 bg-white rounded-full animate-pulse delay-1000"></div>
            
            {/* Mock player ship */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-t from-cyan-400 to-white clip-path-polygon animate-bounce">
              <div className="w-full h-full bg-gradient-to-t from-cyan-500 to-white" style={{clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
            </div>
            
            {/* Mock enemies */}
            <div className="absolute top-16 left-1/4 w-6 h-6 bg-gradient-to-b from-red-500 to-red-700" style={{clipPath: 'polygon(50% 0%, 0% 50%, 50% 100%, 100% 50%)'}}></div>
            <div className="absolute top-16 right-1/4 w-6 h-6 bg-gradient-to-b from-red-500 to-red-700" style={{clipPath: 'polygon(50% 0%, 0% 50%, 50% 100%, 100% 50%)'}}></div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-4">
          <button
            onClick={() => setGameStarted(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
          >
            START GAME
          </button>
          
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 border border-gray-600 hover:border-gray-500"
          >
            {showInstructions ? 'HIDE INSTRUCTIONS' : 'HOW TO PLAY'}
          </button>
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6 border border-gray-600 text-left space-y-4">
            <h3 className="text-2xl font-bold text-cyan-400 text-center">Instructions</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-3">
                <span className="text-cyan-400 font-mono text-lg">←→</span>
                <span>Move left/right (or A/D keys)</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-cyan-400 font-mono text-lg">SPACE</span>
                <span>Shoot projectiles</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-cyan-400 font-mono text-lg">P</span>
                <span>Pause game</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-yellow-400 font-mono text-lg">★</span>
                <span>Collect power-ups for special abilities</span>
              </div>
              <div className="text-center pt-2 text-sm text-gray-400">
                <p>Destroy enemies to earn points • Avoid enemy projectiles • Survive as long as possible!</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-gray-500 text-sm">
          <p>Built with Next.js & TypeScript</p>
        </div>
      </div>
    </div>
  );
}