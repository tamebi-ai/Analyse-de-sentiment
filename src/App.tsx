import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Folder, Plus, ChevronRight, Facebook, Instagram, Linkedin, Twitter, Video, 
  FileText, Upload, Save, PieChart, List, LogOut, Loader2
} from 'lucide-react';
import { PostView } from './components/PostView';
import { PlatformDashboard } from './components/PlatformDashboard';
import { AuthScreen } from './components/AuthScreen';
import { Campaign, PlatformFolder, PlatformId, Post } from './types';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Constants for default structure
const DEFAULT_FOLDERS: {id: PlatformId, name: string, icon: string}[] = [
  { id: 'facebook', name: 'Facebook', icon: 'Facebook' },
  { id: 'instagram', name: 'Instagram', icon: 'Instagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'Video' },
  { id: 'x', name: 'X (Twitter)', icon: 'Twitter' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin' },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // State for data tree
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Navigation State
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activePlatformId, setActivePlatformId] = useState<PlatformId | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [platformViewMode, setPlatformViewMode] = useState<'list' | 'synthesis'>('list');

  // UI State
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostName, setNewPostName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. Auth & Initial Load ---
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingAuth(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
          setCampaigns([]);
          setActiveCampaignId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. Data Fetching from Supabase ---
  useEffect(() => {
    if (session) {
        fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
        // Fetch Campaigns
        const { data: campaignsData, error: campError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (campError) throw campError;

        // Fetch Posts for these campaigns
        // Note: In a larger app, we would fetch posts only when clicking a campaign
        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*');

        if (postsError) throw postsError;

        // Reconstruct the Tree Structure (Campaign -> Folders -> Posts)
        const reconstructedCampaigns: Campaign[] = campaignsData.map((c: any) => {
            const campaignPosts = postsData.filter((p: any) => p.campaign_id === c.id);
            
            // Generate the platform folders
            const folders: PlatformFolder[] = DEFAULT_FOLDERS.map(df => {
                const folderPosts = campaignPosts
                    .filter((p: any) => p.platform_id === df.id)
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        createdAt: new Date(p.created_at).getTime(),
                        files: [], // Files are not in DB, always start empty
                        data: p.analysis_data || [], // JSONB from DB
                        appState: (p.analysis_data && p.analysis_data.length > 0) ? 'complete' : 'idle'
                    } as Post));

                return {
                    ...df,
                    posts: folderPosts
                };
            });

            return {
                id: c.id,
                name: c.name,
                createdAt: new Date(c.created_at).getTime(),
                folders: folders
            };
        });

        setCampaigns(reconstructedCampaigns);

    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Impossible de charger les données depuis le serveur.");
    } finally {
        setIsLoadingData(false);
    }
  };


  // --- 3. Mutations (Actions) ---

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim() || !session) return;
    
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .insert([{ 
                name: newCampaignName, 
                user_id: session.user.id 
            }])
            .select()
            .single();

        if (error) throw error;

        // Optimistic UI Update
        const newCampaign: Campaign = {
            id: data.id,
            name: data.name,
            createdAt: new Date(data.created_at).getTime(),
            folders: DEFAULT_FOLDERS.map(df => ({ ...df, posts: [] }))
        };
        setCampaigns([newCampaign, ...campaigns]);
        setNewCampaignName('');
        setIsCreatingCampaign(false);
        setActiveCampaignId(newCampaign.id);

    } catch (e: any) {
        console.error(e);
        alert("Erreur création campagne: " + e.message);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostName.trim() || !activeCampaignId || !activePlatformId) return;

    try {
        const { data, error } = await supabase
            .from('posts')
            .insert([{
                campaign_id: activeCampaignId,
                platform_id: activePlatformId,
                name: newPostName,
                analysis_data: []
            }])
            .select()
            .single();

        if (error) throw error;

        const newPost: Post = {
            id: data.id,
            name: data.name,
            createdAt: new Date(data.created_at).getTime(),
            files: [],
            data: [],
            appState: 'idle'
        };

        setCampaigns(prev => prev.map(c => {
            if (c.id !== activeCampaignId) return c;
            return {
                ...c,
                folders: c.folders.map(f => {
                    if (f.id !== activePlatformId) return f;
                    return { ...f, posts: [...f.posts, newPost] };
                })
            };
        }));

        setNewPostName('');
        setIsCreatingPost(false);
        setActivePostId(newPost.id);

    } catch (e: any) {
        console.error(e);
        alert("Erreur création post: " + e.message);
    }
  };

  const updatePost = async (updatedPost: Post) => {
    // 1. Update UI Optimistically (for responsiveness)
    setCampaigns(prev => prev.map(c => {
      if (c.id !== activeCampaignId) return c;
      return {
        ...c,
        folders: c.folders.map(f => {
          if (f.id !== activePlatformId) return f;
          return {
            ...f,
            posts: f.posts.map(p => p.id === updatedPost.id ? updatedPost : p)
          };
        })
      };
    }));

    // 2. Persist to Supabase if data changed (We don't save files, only analysis results)
    if (updatedPost.data.length > 0) {
        try {
            const { error } = await supabase
                .from('posts')
                .update({ analysis_data: updatedPost.data })
                .eq('id', updatedPost.id);
            
            if (error) throw error;
        } catch (e) {
            console.error("Failed to save analysis to Supabase", e);
            // Optionally show a toaster error
        }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Export (JSON) - Still useful for backups ---
  const exportData = () => {
    const dataStr = JSON.stringify(campaigns, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0,10);
    link.download = `commentAI_cloud_export_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Icon Helper ---
  const getIcon = (iconName: string, size: number = 24, className: string = '') => {
    const props = { size, className };
    switch (iconName) {
      case 'Facebook': return <Facebook {...props} />;
      case 'Instagram': return <Instagram {...props} />;
      case 'Video': return <Video {...props} />;
      case 'Twitter': return <Twitter {...props} />;
      case 'Linkedin': return <Linkedin {...props} />;
      default: return <Folder {...props} />;
    }
  };

  // --- Render Logic ---

  if (isLoadingAuth) {
      return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2" /> Chargement...</div>;
  }

  if (!session) {
    return <AuthScreen onLogin={() => {}} />;
  }

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  const activeFolder = activeCampaign?.folders.find(f => f.id === activePlatformId);
  const activePost = activeFolder?.posts.find(p => p.id === activePostId);

  const renderBreadcrumbs = () => (
    <div className="flex items-center text-sm text-slate-500 mb-6">
      <button 
        onClick={() => { setActivePlatformId(null); setActivePostId(null); }}
        className="hover:text-blue-600 transition-colors"
      >
        {activeCampaign?.name || 'Campagnes'}
      </button>
      {activePlatformId && (
        <>
          <ChevronRight size={16} className="mx-2" />
          <button 
            onClick={() => setActivePostId(null)}
            className="hover:text-blue-600 transition-colors"
          >
            {DEFAULT_FOLDERS.find(f => f.id === activePlatformId)?.name}
          </button>
        </>
      )}
      {activePostId && (
        <>
          <ChevronRight size={16} className="mx-2" />
          <span className="font-semibold text-slate-800">{activePost?.name}</span>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    if (isLoadingData) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;
    }

    if (!activeCampaign) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="bg-blue-50 p-6 rounded-full mb-6">
            <LayoutDashboard size={48} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bienvenue, {session.user.email}</h2>
          <p className="text-slate-500 max-w-md mb-8">
            Vos données sont synchronisées dans le Cloud. Créez une campagne pour commencer.
          </p>
          <button 
            onClick={() => setIsCreatingCampaign(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Créer une Campagne
          </button>
        </div>
      );
    }

    if (!activePlatformId) {
      return (
        <div>
           {renderBreadcrumbs()}
           <h2 className="text-2xl font-bold text-slate-800 mb-6">Dossiers Plateformes</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {activeCampaign.folders.map(folder => (
               <button
                 key={folder.id}
                 onClick={() => setActivePlatformId(folder.id)}
                 className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
               >
                 <div className="flex items-center justify-between mb-4">
                   <div className={`p-3 rounded-lg ${
                     folder.id === 'facebook' ? 'bg-blue-100 text-blue-600' :
                     folder.id === 'instagram' ? 'bg-pink-100 text-pink-600' :
                     folder.id === 'linkedin' ? 'bg-sky-100 text-sky-700' :
                     folder.id === 'tiktok' ? 'bg-slate-900 text-white' :
                     'bg-slate-100 text-slate-700'
                   }`}>
                     {getIcon(folder.icon)}
                   </div>
                   <div className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">
                     {folder.posts.length} posts
                   </div>
                 </div>
                 <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600">{folder.name}</h3>
               </button>
             ))}
           </div>
        </div>
      );
    }

    if (!activePostId) {
      return (
        <div>
          {renderBreadcrumbs()}
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              {getIcon(activeFolder?.icon || '', 28, 'text-slate-700')}
              {activeFolder?.name}
            </h2>
            
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex shadow-sm">
                <button
                    onClick={() => setPlatformViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        platformViewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <List size={16} /> Posts
                </button>
                <button
                    onClick={() => setPlatformViewMode('synthesis')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        platformViewMode === 'synthesis' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <PieChart size={16} /> Bilan
                </button>
            </div>
          </div>

          {platformViewMode === 'synthesis' && activeFolder ? (
              <PlatformDashboard folder={activeFolder} />
          ) : (
            <>
                <div className="flex justify-end mb-6">
                    <button
                    onClick={() => setIsCreatingPost(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                    <Plus size={16} /> Nouveau Post
                    </button>
                </div>

                {isCreatingPost && (
                    <div className="bg-slate-100 p-4 rounded-lg mb-6 border border-slate-200 animate-in fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nom du Post</label>
                    <div className="flex gap-2">
                        <input 
                        autoFocus
                        type="text" 
                        value={newPostName} 
                        onChange={(e) => setNewPostName(e.target.value)}
                        placeholder="Ex: Teaser Lancement"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePost()}
                        />
                        <button 
                        onClick={handleCreatePost}
                        disabled={!newPostName.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:bg-slate-300"
                        >
                        Créer
                        </button>
                        <button onClick={() => setIsCreatingPost(false)} className="text-slate-500 px-4 py-2 hover:text-slate-700">Annuler</button>
                    </div>
                    </div>
                )}

                <div className="space-y-3">
                {activeFolder?.posts.map(post => (
                    <button
                    key={post.id}
                    onClick={() => setActivePostId(post.id)}
                    className="w-full bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-md ${post.appState === 'complete' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        <FileText size={20} />
                        </div>
                        <div className="text-left">
                        <h4 className="font-semibold text-slate-800 group-hover:text-blue-600">{post.name}</h4>
                        <p className="text-xs text-slate-500">
                             {post.data.length > 0 ? `${post.data.length} commentaires analysés` : "Brouillon"}
                        </p>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                    </button>
                ))}
                </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div>
        {renderBreadcrumbs()}
        {activePost && <PostView post={activePost} onUpdatePost={updatePost} />}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="mb-6 flex items-center gap-2 cursor-pointer" onClick={() => { setActiveCampaignId(null); setActivePlatformId(null); setActivePostId(null); }}>
          <LayoutDashboard className="text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">CommentAI</h1>
        </div>

        <div className="bg-slate-800 rounded-lg p-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                    {session.user.email?.substring(0,2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate w-24" title={session.user.email}>{session.user.email}</p>
                </div>
            </div>
            <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Déconnexion"
            >
                <LogOut size={16} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vos Campagnes</h3>
            <button 
              onClick={() => setIsCreatingCampaign(true)}
              className="p-1 hover:bg-slate-800 rounded-md transition-colors"
            >
              <Plus size={14} className="text-slate-400 hover:text-white" />
            </button>
          </div>

          {isCreatingCampaign && (
            <div className="mb-4 bg-slate-800 p-2 rounded-md animate-in fade-in">
              <input 
                autoFocus
                type="text" 
                placeholder="Nom campagne..."
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                className="w-full bg-slate-900 text-white text-sm px-2 py-1.5 rounded border border-slate-700 focus:border-blue-500 focus:outline-none mb-2"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName.trim()}
                  className="bg-blue-600 text-xs px-2 py-1 rounded text-white disabled:opacity-50"
                >
                  Ok
                </button>
                <button onClick={() => setIsCreatingCampaign(false)} className="text-slate-400 text-xs px-2 py-1 hover:text-white">Annuler</button>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            {campaigns.map(campaign => (
              <button 
                key={campaign.id}
                onClick={() => { 
                  setActiveCampaignId(campaign.id); 
                  setActivePlatformId(null); 
                  setActivePostId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCampaignId === campaign.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Folder size={16} />
                <span className="truncate">{campaign.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700">
             <button 
                onClick={exportData}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Save size={14} /> Exporter JSON
              </button>
            <div className="text-xs text-slate-500 mt-4 text-center">
                <p>Propulsé par Gemini & Supabase</p>
            </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
             {renderContent()}
          </div>
      </main>
    </div>
  );
}

export default App;