import React from 'react';
import { CommentData } from '../types';
import { clsx } from 'clsx';
import { Download } from 'lucide-react';

interface CommentsTableProps {
  data: CommentData[];
}

export const CommentsTable: React.FC<CommentsTableProps> = ({ data }) => {
  const downloadCSV = () => {
    const headers = ['Image Source', 'Comment', 'Sentiment', 'Confidence', 'Topic', 'Theme'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.imageSource}"`,
        `"${row.text.replace(/"/g, '""')}"`,
        row.sentiment,
        row.confidence,
        `"${row.topic}"`,
        `"${row.theme}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analysis_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="text-lg font-semibold text-slate-800">Résultats Détaillés</h3>
        <button 
          onClick={downloadCSV}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
            <tr>
              <th className="px-6 py-3 w-1/2">Commentaire</th>
              <th className="px-6 py-3">Sentiment</th>
              <th className="px-6 py-3">Sujet</th>
              <th className="px-6 py-3">Thème</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-slate-800 line-clamp-2" title={row.text}>{row.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{row.imageSource}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                    {
                      'bg-green-100 text-green-800': row.sentiment === 'positive',
                      'bg-red-100 text-red-800': row.sentiment === 'negative',
                      'bg-slate-100 text-slate-800': row.sentiment === 'neutral',
                    }
                  )}>
                    {row.sentiment === 'positive' ? 'Positif' : row.sentiment === 'negative' ? 'Négatif' : 'Neutre'}
                    <span className="ml-1 opacity-50 text-[10px]">({(row.confidence * 100).toFixed(0)}%)</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{row.topic}</td>
                <td className="px-6 py-4 text-slate-600">{row.theme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};