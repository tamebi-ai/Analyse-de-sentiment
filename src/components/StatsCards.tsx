import React from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { AnalysisStats } from '../types';

interface StatsCardsProps {
  stats: AnalysisStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
          <MessageSquare size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Total Comm.</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
          <ThumbsUp size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Positif</p>
          <p className="text-2xl font-bold text-slate-800">{stats.positive}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
          <ThumbsDown size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Négatif</p>
          <p className="text-2xl font-bold text-slate-800">{stats.negative}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
          <Minus size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Neutre</p>
          <p className="text-2xl font-bold text-slate-800">{stats.neutral}</p>
        </div>
      </div>
    </div>
  );
};