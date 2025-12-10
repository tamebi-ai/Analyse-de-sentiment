import React, { useMemo } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { StatsCards } from './StatsCards';
import { Charts } from './Charts';
import { CommentsTable } from './CommentsTable';
import { PlatformFolder } from '../types';

interface PlatformDashboardProps {
  folder: PlatformFolder;
}

export const PlatformDashboard: React.FC<PlatformDashboardProps> = ({ folder }) => {
  // 1. Agréger toutes les données de tous les posts du dossier
  const aggregatedData = useMemo(() => {
    return folder.posts.flatMap(post => post.data);
  }, [folder.posts]);

  // 2. Recalculer les statistiques sur la totalité des données
  const stats = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => {
      acc.total++;
      acc[curr.sentiment]++;
      acc.themes[curr.theme] = (acc.themes[curr.theme] || 0) + 1;
      acc.topics[curr.topic] = (acc.topics[curr.topic] || 0) + 1;
      return acc;
    }, {
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      themes: {} as Record<string, number>,
      topics: {} as Record<string, number>
    });
  }, [aggregatedData]);

  if (aggregatedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-center animate-in fade-in">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <BarChart3 className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Pas assez de données</h3>
        <p className="text-slate-500 max-w-sm mt-2">
          Pour voir le bilan global de <strong>{folder.name}</strong>, vous devez d'abord créer des posts et lancer des analyses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Summary */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="text-blue-400" />
            Bilan Global : {folder.name}
          </h2>
          <p className="text-slate-400 mt-1">
            Consolidation de {folder.posts.length} posts et {aggregatedData.length} commentaires analysés.
          </p>
        </div>
        <div className="flex gap-4">
            <div className="text-center px-4 border-r border-slate-700">
                <span className="block text-2xl font-bold text-green-400">{((stats.positive / stats.total) * 100).toFixed(0)}%</span>
                <span className="text-xs text-slate-400 uppercase">Positif</span>
            </div>
            <div className="text-center px-4">
                <span className="block text-2xl font-bold text-red-400">{((stats.negative / stats.total) * 100).toFixed(0)}%</span>
                <span className="text-xs text-slate-400 uppercase">Négatif</span>
            </div>
        </div>
      </div>

      {/* Visualizations */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Indicateurs de Performance Clés</h3>
        <StatsCards stats={stats} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Répartition & Thématiques Globales</h3>
        <Charts stats={stats} />
      </div>

      {/* Data Explorer */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Base de données complète ({folder.name})</h3>
        <CommentsTable data={aggregatedData} />
      </div>
    </div>
  );
};