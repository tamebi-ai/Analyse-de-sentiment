import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { StatsCards } from './StatsCards';
import { Charts } from './Charts';
import { CommentsTable } from './CommentsTable';
import { processImage } from '../services/geminiService';
import { Post, CommentData, FileWithPreview } from '../types';

interface PostViewProps {
  post: Post;
  onUpdatePost: (updatedPost: Post) => void;
}

export const PostView: React.FC<PostViewProps> = ({ post, onUpdatePost }) => {
  const [statusMessage, setStatusMessage] = useState('');

  // Derived Statistics
  const stats = useMemo(() => {
    return post.data.reduce((acc, curr) => {
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
  }, [post.data]);

  const handleSetFiles = (action: React.SetStateAction<FileWithPreview[]>) => {
    const newFiles = typeof action === 'function' ? action(post.files) : action;
    onUpdatePost({ ...post, files: newFiles });
  };

  const handleStartAnalysis = async () => {
    if (post.files.length === 0) return;

    // Reset previous data for re-run
    onUpdatePost({ ...post, appState: 'analyzing', data: [] });

    try {
      const allResults: CommentData[] = [];
      let currentData: CommentData[] = [];

      for (const file of post.files) {
        const results = await processImage(file, (msg) => setStatusMessage(msg));
        allResults.push(...results);
        currentData = [...currentData, ...results];
        
        // Update parent state incrementally
        onUpdatePost({ 
            ...post, 
            appState: 'analyzing',
            data: currentData 
        });
      }

      onUpdatePost({ 
        ...post, 
        appState: 'complete',
        data: allResults 
      });
      setStatusMessage('Analyse terminée !');
    } catch (error) {
      console.error(error);
      onUpdatePost({ ...post, appState: 'error' });
      setStatusMessage("Une erreur s'est produite pendant l'analyse.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{post.name}</h2>
          <p className="text-slate-500">Ajoutez des captures d'écran pour analyser les sentiments.</p>
        </div>
        <button
          onClick={handleStartAnalysis}
          disabled={post.appState === 'analyzing' || post.files.length === 0}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all
            ${post.appState === 'analyzing' || post.files.length === 0 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'}
          `}
        >
          {post.appState === 'analyzing' ? <Loader2 className="animate-spin" /> : null}
          {post.appState === 'analyzing' ? 'Traitement en cours...' : "Lancer l'analyse"}
        </button>
      </div>

      {/* Input Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">1. Import des Captures</h3>
              {post.appState === 'analyzing' && <span className="text-sm text-blue-600 animate-pulse">{statusMessage}</span>}
          </div>
        <FileUpload 
          files={post.files} 
          setFiles={handleSetFiles} 
          disabled={post.appState === 'analyzing'} 
        />
      </section>

      {/* Results Section */}
      {post.data.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Vue d'ensemble</h3>
              <StatsCards stats={stats} />
              <Charts stats={stats} />
          </div>
          
          <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Explorateur de données</h3>
              <CommentsTable data={post.data} />
          </div>
        </div>
      )}
    </div>
  );
};