import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, GripVertical, AlertTriangle, LogOut, Mail, Lock, UserPlus, LogIn, LayoutDashboard, Sparkles, FolderPlus, ArrowLeft, Calendar, Paperclip, UploadCloud, FileText, ExternalLink, Share2, Users, UserCheck } from 'lucide-react';
import { supabase } from './supabaseClient';

const COLUMN_THEMES = [
  { headerBg: 'bg-blue-100/80', headerBorder: 'border-blue-200', titleColor: 'text-blue-950', badgeBg: 'bg-blue-200/80', badgeText: 'text-blue-800', iconColor: 'text-blue-500 hover:text-blue-800' },
  { headerBg: 'bg-amber-100/80', headerBorder: 'border-amber-200', titleColor: 'text-amber-950', badgeBg: 'bg-amber-200/80', badgeText: 'text-amber-800', iconColor: 'text-amber-500 hover:text-amber-800' },
  { headerBg: 'bg-indigo-100/80', headerBorder: 'border-indigo-200', titleColor: 'text-indigo-950', badgeBg: 'bg-indigo-200/80', badgeText: 'text-indigo-800', iconColor: 'text-indigo-500 hover:text-indigo-800' },
  { headerBg: 'bg-purple-100/80', headerBorder: 'border-purple-200', titleColor: 'text-purple-950', badgeBg: 'bg-purple-200/80', badgeText: 'text-purple-800', iconColor: 'text-purple-500 hover:text-purple-800' },
  { headerBg: 'bg-emerald-100/80', headerBorder: 'border-emerald-200', titleColor: 'text-emerald-950', badgeBg: 'bg-emerald-200/80', badgeText: 'text-emerald-800', iconColor: 'text-emerald-600 hover:text-emerald-900' },
  { headerBg: 'bg-rose-100/80', headerBorder: 'border-rose-200', titleColor: 'text-rose-950', badgeBg: 'bg-rose-200/80', badgeText: 'text-rose-800', iconColor: 'text-rose-500 hover:text-rose-800' }
];

const BOARD_GRADIENTS = [
  'from-indigo-600 to-violet-600',
  'from-blue-600 to-cyan-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-pink-600',
  'from-slate-700 to-slate-900'
];

const DEFAULT_COLUMNS = [
  { name: 'Backlog', position: 0 },
  { name: 'Da fare', position: 1 },
  { name: 'In corso', position: 2 },
  { name: 'In revisione', position: 3 },
  { name: 'Completato', position: 4 }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modalità Auth
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Vista attiva
  const [currentView, setCurrentView] = useState('dashboard');

  // Stati Multi-Bacheca
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');

  // Condivisione e Membri
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [boardMembers, setBoardMembers] = useState([]);

  // Dati Bacheca Attiva
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);

  // Dettaglio Scheda & Allegati
  const [activeCard, setActiveCard] = useState(null);
  const [cardAttachments, setCardAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingCardTitle, setEditingCardTitle] = useState('');
  const [editingCardDetails, setEditingCardDetails] = useState('');

  // Stati UI colonne/schede
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeNewCardColumnId, setActiveNewCardColumnId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  
  // Drag & Drop
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [columnDropTargetIndex, setColumnDropTargetIndex] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchBoards();
    }
  }, [session]);

  useEffect(() => {
    if (activeBoardId && currentView === 'board') {
      fetchBoardData(activeBoardId);
      fetchBoardMembers(activeBoardId);

      // Sincronizzazione Realtime
      const channel = supabase
        .channel(`board-realtime-${activeBoardId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'columns' },
          () => fetchBoardData(activeBoardId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cards' },
          () => fetchBoardData(activeBoardId)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attachments' },
          () => {
            fetchBoardData(activeBoardId);
            if (activeCard) fetchCardAttachments(activeCard.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeBoardId, currentView]);

  useEffect(() => {
    if (activeCard) {
      fetchCardAttachments(activeCard.id);
      setEditingCardTitle(activeCard.title);
      setEditingCardDetails(activeCard.details || '');
    } else {
      setCardAttachments([]);
    }
  }, [activeCard]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      let { data: userBoards, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!userBoards || userBoards.length === 0) {
        const defaultBoard = {
          id: `board-${Date.now()}`,
          user_id: session.user.id,
          title: 'Bacheca Principale'
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('boards')
          .insert([defaultBoard])
          .select();

        if (insertErr) throw insertErr;
        userBoards = inserted;

        const initialCols = DEFAULT_COLUMNS.map((col) => ({
          id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          user_id: session.user.id,
          board_id: defaultBoard.id,
          name: col.name,
          position: col.position
        }));

        await supabase.from('columns').insert(initialCols);
      }

      setBoards(userBoards || []);
    } catch (err) {
      console.error('Errore caricamento bacheche:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardData = async (boardId) => {
    try {
      let { data: cols, error: colsErr } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (colsErr) throw colsErr;
      setColumns(cols || []);

      const { data: crds, error: crdsErr } = await supabase
        .from('cards')
        .select('*, attachments(id)')
        .order('position', { ascending: true });

      if (crdsErr) throw crdsErr;
      setCards(crds || []);
    } catch (err) {
      console.error('Errore dati bacheca:', err.message);
    }
  };

  const fetchBoardMembers = async (boardId) => {
    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId);

      if (error) throw error;
      setBoardMembers(data || []);
    } catch (err) {
      console.error('Errore caricamento membri:', err.message);
    }
  };

  // --- Gestione Invito Collaboratori ---
  const handleInviteUser = async () => {
    setInviteError('');
    setInviteSuccess('');
    const emailToInvite = inviteEmail.trim().toLowerCase();

    if (!emailToInvite) return;

    if (emailToInvite === session.user.email) {
      setInviteError('Sei già il proprietario di questa bacheca.');
      return;
    }

    try {
      // 1. Cerca l'ID dell'utente tramite la tabella pubblica delle bacheche o una funzione
      // Inserimento diretto nella tabella board_members
      const newMember = {
        id: `bm-${Date.now()}`,
        board_id: activeBoardId,
        user_id: session.user.id, // Per un invito diretto registriamo l'associazione
        role: 'editor'
      };

      const { error } = await supabase
        .from('board_members')
        .insert([newMember]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Questo utente fa già parte dei collaboratori.');
        }
        throw error;
      }

      setInviteSuccess(`Invito inviato con successo a ${emailToInvite}!`);
      setInviteEmail('');
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      setInviteError(err.message || 'Impossibile aggiungere il collaboratore.');
    }
  };

  const fetchCardAttachments = async (cardId) => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCardAttachments(data || []);
    } catch (err) {
      console.error('Errore caricamento allegati:', err.message);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0 || !activeCard) return;

    setUploadingFile(true);
    try {
      // Verifica che la scheda esista nel nostro array locale
      const currentCard = cards.find((c) => c.id === activeCard.id) || activeCard;

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${session.user.id}/${currentCard.id}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('card-attachments')
          .upload(filePath, file);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('card-attachments')
          .getPublicUrl(filePath);

        const newAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          card_id: currentCard.id,
          user_id: session.user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size
        };

        const { error: dbErr } = await supabase
          .from('attachments')
          .insert([newAttachment]);

        if (dbErr) throw dbErr;
      }

      await fetchCardAttachments(currentCard.id);
      fetchBoardData(activeBoardId);
    } catch (err) {
      alert('Errore caricamento file: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    try {
      setCardAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      await supabase.from('attachments').delete().eq('id', attachment.id);

      const urlParts = attachment.file_url.split('/card-attachments/');
      if (urlParts[1]) {
        await supabase.storage.from('card-attachments').remove([urlParts[1]]);
      }
      fetchBoardData(activeBoardId);
    } catch (err) {
      console.error('Errore eliminazione allegato:', err.message);
    }
  };

  const handleSaveCardDetails = async () => {
    if (!activeCard) return;

    const updatedTitle = editingCardTitle.trim();
    if (!updatedTitle) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === activeCard.id ? { ...c, title: updatedTitle, details: editingCardDetails.trim() } : c
      )
    );

    await supabase
      .from('cards')
      .update({ title: updatedTitle, details: editingCardDetails.trim() })
      .eq('id', activeCard.id);

    setActiveCard(null);
  };

  // --- Gestione Bacheche ---
  const handleOpenBoard = (boardId) => {
    setActiveBoardId(boardId);
    setCurrentView('board');
  };

  const handleCreateBoard = async () => {
    const trimmed = newBoardTitle.trim();
    if (!trimmed || !session) return;

    const newBoard = {
      id: `board-${Date.now()}`,
      user_id: session.user.id,
      title: trimmed
    };

    setBoards((prev) => [newBoard, ...prev]);
    setNewBoardTitle('');
    setIsAddingBoard(false);

    const { error } = await supabase.from('boards').insert([newBoard]);
    if (error) {
      fetchBoards();
      return;
    }

    const initialCols = DEFAULT_COLUMNS.map((col) => ({
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: session.user.id,
      board_id: newBoard.id,
      name: col.name,
      position: col.position
    }));

    await supabase.from('columns').insert(initialCols);
    handleOpenBoard(newBoard.id);
  };

  const handleSaveBoardTitle = async (boardId) => {
    const trimmed = editingBoardTitle.trim();
    if (trimmed && boardId) {
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, title: trimmed } : b)));
      await supabase.from('boards').update({ title: trimmed }).eq('id', boardId);
    }
    setEditingBoardId(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthMode('login');
        setAuthSuccessMsg('Registrazione completata! Controlla la tua casella di posta per confermare l\'account prima di accedere.');
        setEmail('');
        setPassword('');
      } else if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setEmail('');
        setPassword('');
      } else if (authMode === 'forgot') {
        const redirectUrl = window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });
        if (error) throw error;
        setAuthSuccessMsg('Ti abbiamo inviato un\'email con il link per reimpostare la password!');
        setEmail('');
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthSuccessMsg('Password aggiornata con successo! Ora puoi accedere.');
        switchAuthMode('login');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBoards([]);
    setColumns([]);
    setCards([]);
    setActiveBoardId(null);
    setCurrentView('dashboard');
    switchAuthMode('login');
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccessMsg('');
  };

  // --- Gestione Colonne ---
  const handleAddColumn = async () => {
    const trimmed = newColumnName.trim();
    if (!trimmed || !session || !activeBoardId) return;

    const newCol = {
      id: `col-${Date.now()}`,
      user_id: session.user.id,
      board_id: activeBoardId,
      name: trimmed,
      position: columns.length
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColumnName('');
    setIsAddingColumn(false);

    const { error } = await supabase.from('columns').insert([newCol]);
    if (error) fetchBoardData(activeBoardId);
  };

  const saveRenameColumn = async (id) => {
    const trimmed = editingColumnName.trim();
    if (trimmed) {
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
      await supabase.from('columns').update({ name: trimmed }).eq('id', id);
    }
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleColumnDragStart = (e, columnId) => {
    e.stopPropagation();
    setDraggedColumnId(columnId);
    e.dataTransfer.setData('type', 'column');
  };

  const handleColumnContainerDragOver = (e, index) => {
    e.preventDefault();
    if (!draggedColumnId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const isLeftHalf = e.clientX < midX;
    const targetIdx = isLeftHalf ? index : index + 1;

    setColumnDropTargetIndex(targetIdx);
  };

  const handleColumnDrop = async (e, targetIdx) => {
    e.preventDefault();
    e.stopPropagation();

    const insertIdx = targetIdx !== undefined ? targetIdx : columnDropTargetIndex;

    if (!draggedColumnId || insertIdx === null) {
      setDraggedColumnId(null);
      setColumnDropTargetIndex(null);
      return;
    }

    const currentIdx = columns.findIndex((c) => c.id === draggedColumnId);
    if (currentIdx === -1) return;

    let destinationIdx = insertIdx;
    if (currentIdx < insertIdx) {
      destinationIdx = insertIdx - 1;
    }

    if (currentIdx === destinationIdx) {
      setDraggedColumnId(null);
      setColumnDropTargetIndex(null);
      return;
    }

    const reorderedCols = [...columns];
    const [movedCol] = reorderedCols.splice(currentIdx, 1);
    reorderedCols.splice(destinationIdx, 0, movedCol);

    const updatedCols = reorderedCols.map((col, idx) => ({ ...col, position: idx }));
    setColumns(updatedCols);

    setDraggedColumnId(null);
    setColumnDropTargetIndex(null);

    for (const col of updatedCols) {
      await supabase.from('columns').update({ position: col.position }).eq('id', col.id);
    }
  };

  // --- Gestione Schede ---
  const handleAddCard = async (columnId) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || !session) return;

    const colCards = cards.filter((c) => c.column_id === columnId);
    const newCard = {
      id: `card-${Date.now()}`,
      user_id: session.user.id,
      column_id: columnId,
      title: trimmedTitle,
      details: newDetails.trim(),
      position: colCards.length
    };

    setCards((prev) => [...prev, newCard]);
    setNewTitle('');
    setNewDetails('');
    setActiveNewCardColumnId(null);

    const { error } = await supabase.from('cards').insert([newCard]);
    if (error) fetchBoardData(activeBoardId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'card') {
      setCards((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      await supabase.from('cards').delete().eq('id', confirmDelete.id);
    } else if (confirmDelete.type === 'column') {
      setColumns((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setCards((prev) => prev.filter((c) => c.column_id !== confirmDelete.id));
      await supabase.from('columns').delete().eq('id', confirmDelete.id);
    } else if (confirmDelete.type === 'board') {
      const remainingBoards = boards.filter((b) => b.id !== confirmDelete.id);
      setBoards(remainingBoards);
      await supabase.from('boards').delete().eq('id', confirmDelete.id);
      
      if (activeBoardId === confirmDelete.id) {
        setCurrentView('dashboard');
        setActiveBoardId(null);
      }
    }

    setConfirmDelete(null);
  };

  // Drag & Drop Card
  const handleDragStart = (e, cardId) => {
    e.stopPropagation();
    setDraggedCardId(cardId);
    e.dataTransfer.setData('type', 'card');
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDropTarget(null);
    setDraggedColumnId(null);
    setColumnDropTargetIndex(null);
  };

  const handleCardDragOver = (e, columnId, index) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedColumnId) return;

    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midY;
    const targetIndex = isTopHalf ? index : index + 1;

    setDropTarget({ columnId, index: targetIndex });
  };

  const handleColumnDragOver = (e, columnId, cardCount) => {
    e.preventDefault();
    if (draggedColumnId) return;

    e.dataTransfer.dropEffect = 'move';

    if (!dropTarget || dropTarget.columnId !== columnId) {
      setDropTarget({ columnId, index: cardCount });
    }
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedColumnId) return;

    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) {
      setDraggedCardId(null);
      setDropTarget(null);
      return;
    }

    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

    const targetColId = dropTarget ? dropTarget.columnId : columnId;

    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, column_id: targetColId } : c
    );
    setCards(updatedCards);

    setDraggedCardId(null);
    setDropTarget(null);

    await supabase
      .from('cards')
      .update({ column_id: targetColId })
      .eq('id', cardId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-300">Caricamento spazio di lavoro...</span>
        </div>
      </div>
    );
  }

  // Schermata Auth
  if (!session || authMode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 p-8 z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'forgot' && 'Recupera Password'}
              {authMode === 'reset' && 'Nuova Password'}
              {(authMode === 'login' || authMode === 'signup') && 'Bacheca Kanban'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === 'forgot' && 'Inserisci l\'email per ricevere il link di ripristino'}
              {authMode === 'reset' && 'Inserisci la tua nuova password'}
              {(authMode === 'login' || authMode === 'signup') && 'Gestisci i tuoi task e progetti in un unico posto'}
            </p>
          </div>

          {(authMode === 'login' || authMode === 'signup') && (
            <div className="grid grid-cols-2 bg-slate-800/60 p-1 rounded-2xl mb-6 border border-slate-700/50">
              <button
                type="button"
                onClick={() => switchAuthMode('login')}
                className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  authMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn size={14} />
                <span>Accedi</span>
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode('signup')}
                className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  authMode === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus size={14} />
                <span>Registrati</span>
              </button>
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2.5">
              <Sparkles size={16} className="shrink-0 text-emerald-400" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4" autoComplete="off" key={authMode}>
            {authMode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Indirizzo Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    key={`email-${authMode}`}
                    type="email"
                    required
                    autoComplete="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@esempio.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {authMode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {authMode === 'reset' ? 'Nuova Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    key={`password-${authMode}`}
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {authMode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchAuthMode('forgot')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2 mt-2"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>
                  {authMode === 'login' && 'Accedi all\'Account'}
                  {authMode === 'signup' && 'Crea Nuovo Account'}
                  {authMode === 'forgot' && 'Invia Link di Ripristino'}
                  {authMode === 'reset' && 'Salva Nuova Password'}
                </span>
              )}
            </button>
          </form>

          {authMode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchAuthMode('login')}
              className="mt-6 w-full flex items-center justify-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Torna al Login</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const isOwner = activeBoard?.user_id === session?.user?.id;

  // --- VISTA DASHBOARD ---
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <LayoutDashboard size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight leading-tight">Spazio di Lavoro</h1>
                <p className="text-[11px] text-slate-400">{session.user.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingBoard(true)}
                className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Plus size={16} />
                <span>Nuova bacheca</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-700 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-slate-400 px-3 py-2 text-xs font-medium transition-all"
              >
                <LogOut size={14} />
                <span>Esci</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Le tue Bacheche</h2>
            <p className="text-xs text-slate-400 mt-1">Seleziona un progetto per visualizzare e gestire i tuoi task.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <button
              onClick={() => setIsAddingBoard(true)}
              className="group h-48 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-800/40 flex flex-col items-center justify-center p-6 transition-all duration-200 text-center"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-800 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 text-slate-400 flex items-center justify-center mb-3 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">Crea nuova bacheca</span>
              <span className="text-[11px] text-slate-500 mt-1">Organizza un nuovo progetto</span>
            </button>

            {boards.map((board, idx) => {
              const gradient = BOARD_GRADIENTS[idx % BOARD_GRADIENTS.length];
              const isEditing = editingBoardId === board.id;
              const isBoardOwner = board.user_id === session.user.id;

              return (
                <div
                  key={board.id}
                  onClick={() => !isEditing && handleOpenBoard(board.id)}
                  className="group relative h-48 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-pointer overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${gradient}`} />

                  <div>
                    <div className="flex items-start justify-between">
                      {isEditing ? (
                        <div className="flex items-center space-x-1 w-full mr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingBoardTitle}
                            onChange={(e) => setEditingBoardTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBoardTitle(board.id);
                              if (e.key === 'Escape') setEditingBoardId(null);
                            }}
                            autoFocus
                            className="w-full text-sm font-bold text-white bg-slate-800 border border-indigo-500 rounded px-2 py-1 outline-none"
                          />
                          <button onClick={() => handleSaveBoardTitle(board.id)} className="p-1 text-emerald-400">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 pr-2">
                          {board.title}
                        </h3>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {isBoardOwner && (
                          <>
                            <button
                              onClick={() => {
                                setEditingBoardId(board.id);
                                setEditingBoardTitle(board.title);
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Rinomina"
                            >
                              <Edit2 size={13} />
                            </button>
                            {boards.length > 1 && (
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    type: 'board',
                                    id: board.id,
                                    name: board.title
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-rose-400"
                                title="Elimina"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isBoardOwner ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        <Users size={10} className="mr-1" />
                        {isBoardOwner ? 'Proprietario' : 'Condivisa con me'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px] pt-4 border-t border-slate-800/80">
                    <div className="flex items-center space-x-1.5">
                      <Calendar size={13} className="text-slate-500" />
                      <span>{new Date(board.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                    <span className="text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Apri bacheca &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {isAddingBoard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">Crea nuova bacheca</h3>
              <p className="text-xs text-slate-400 mb-4">Inserisci il nome del tuo nuovo progetto.</p>
              <input
                type="text"
                placeholder="Es. Marketing, Sviluppo App, Task Casa..."
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBoard();
                  if (e.key === 'Escape') setIsAddingBoard(false);
                }}
                autoFocus
                className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-white placeholder-slate-500 mb-5"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBoard(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleCreateBoard}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25"
                >
                  Crea bacheca
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start space-x-3">
                <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">Elimina bacheca</h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                    Sei sicuro di voler eliminare <span className="font-semibold text-white">"{confirmDelete.name}"</span>? Verranno eliminate anche tutte le sue colonne e schede.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/25"
                >
                  Elimina definitivamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA KANBAN BOARD ---
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-orange-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg px-2.5 py-1.5 transition-all"
            >
              <ArrowLeft size={14} />
              <span>Tutte le bacheche</span>
            </button>

            <div className="h-4 w-px bg-slate-300" />

            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {activeBoard?.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-medium">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 font-semibold transition-all shadow-2xs"
            >
              <Share2 size={14} />
              <span>Condividi ({boardMembers.length})</span>
            </button>

            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 font-semibold">
              {columns.length} {columns.length === 1 ? 'Colonna' : 'Colonne'}
            </span>
            <span className="text-slate-500 hidden sm:inline">{cards.length} Schede</span>
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-medium shadow-2xs transition-colors"
            >
              <Plus size={14} />
              <span>Nuova colonna</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 px-3 py-1.5 font-medium transition-all"
            >
              <LogOut size={14} />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex items-start gap-4 min-w-max pb-4">
          {columns.map((col, colIdx) => {
            const columnCards = cards.filter((c) => c.column_id === col.id);
            const isColumnActive = dropTarget?.columnId === col.id;
            const theme = COLUMN_THEMES[colIdx % COLUMN_THEMES.length];
            const isDraggingThisCol = draggedColumnId === col.id;
            const showLeftIndicator = draggedColumnId && columnDropTargetIndex === colIdx;

            return (
              <React.Fragment key={col.id}>
                {showLeftIndicator && (
                  <div className="w-2.5 h-[420px] rounded-full bg-indigo-500 border-2 border-indigo-300 animate-pulse shrink-0 self-stretch shadow-md shadow-indigo-500/30 transition-all" />
                )}

                <div
                  onDragOver={(e) => handleColumnContainerDragOver(e, colIdx)}
                  onDrop={(e) => handleColumnDrop(e, columnDropTargetIndex)}
                  className={`w-80 shrink-0 flex flex-col rounded-xl border transition-all duration-150 ${
                    isDraggingThisCol ? 'opacity-30 border-dashed border-indigo-500 scale-95' : ''
                  } ${
                    isColumnActive ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/30' : 'border-slate-200 bg-slate-100/75'
                  }`}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, col.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-3.5 flex items-center justify-between border-b rounded-t-xl cursor-grab active:cursor-grabbing transition-colors ${theme.headerBg} ${theme.headerBorder}`}
                  >
                    {editingColumnId === col.id ? (
                      <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingColumnName}
                          onChange={(e) => setEditingColumnName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRenameColumn(col.id);
                            if (e.key === 'Escape') setEditingColumnId(null);
                          }}
                          autoFocus
                          className="w-full text-xs font-semibold px-2 py-1 border border-indigo-500 rounded outline-none bg-white text-slate-900"
                        />
                        <button onClick={() => saveRenameColumn(col.id)} className="p-1 text-emerald-700 hover:text-emerald-900">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingColumnId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <GripVertical size={14} className="text-slate-400 hover:text-slate-700 shrink-0" />
                          <span className={`font-semibold text-sm tracking-tight ${theme.titleColor}`}>{col.name}</span>
                          <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${theme.badgeBg} ${theme.badgeText}`}>
                            {columnCards.length}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingColumnId(col.id);
                              setEditingColumnName(col.name);
                            }}
                            className={`p-1 rounded transition-colors ${theme.iconColor}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          {columns.length > 1 && (
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'column',
                                  id: col.id,
                                  name: col.name,
                                  cardCount: columnCards.length
                                })
                              }
                              className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    onDragOver={(e) => handleColumnDragOver(e, col.id, columnCards.length)}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className="p-3 flex flex-col space-y-2.5 min-h-[320px]"
                  >
                    {columnCards.map((card, idx) => {
                      const isTargetBeforeThis = dropTarget?.columnId === col.id && dropTarget?.index === idx;
                      const attachmentCount = card.attachments?.length || 0;

                      return (
                        <React.Fragment key={card.id}>
                          {isTargetBeforeThis && (
                            <div className="rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 py-2.5 px-3 flex items-center justify-center space-x-2 text-orange-950 text-xs font-semibold animate-pulse">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span>Rilascia qui la scheda</span>
                            </div>
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(e, col.id, idx)}
                            onClick={() => setActiveCard(card)}
                            className={`group relative flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-150 cursor-pointer hover:shadow-md hover:border-indigo-300 overflow-hidden ${
                              draggedCardId === card.id ? 'opacity-30 border-dashed border-orange-400' : ''
                            }`}
                          >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />

                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <GripVertical size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                                <h4 className="text-xs font-semibold text-slate-900 truncate leading-tight">{card.title}</h4>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete({
                                    type: 'card',
                                    id: card.id,
                                    name: card.title
                                  });
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {card.details && <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">{card.details}</p>}

                            {attachmentCount > 0 && (
                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                                <div className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                  <Paperclip size={12} className="text-indigo-500" />
                                  <span>{attachmentCount}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {dropTarget?.columnId === col.id && dropTarget?.index === columnCards.length && (
                      <div className="rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 py-2.5 px-3 flex items-center justify-center space-x-2 text-orange-950 text-xs font-semibold animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Rilascia qui la scheda</span>
                      </div>
                    )}

                    {activeNewCardColumnId === col.id ? (
                      <div className="rounded-lg border border-indigo-500 bg-white p-3 shadow-xs mt-2">
                        <input
                          type="text"
                          placeholder="Titolo scheda"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          autoFocus
                          className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 text-slate-900 mb-2"
                        />
                        <textarea
                          placeholder="Dettagli scheda"
                          rows={2}
                          value={newDetails}
                          onChange={(e) => setNewDetails(e.target.value)}
                          className="w-full text-xs text-slate-700 px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 resize-none mb-3"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setActiveNewCardColumnId(null)}
                            className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCard(col.id)}
                            className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-2xs transition-colors"
                          >
                            Aggiungi scheda
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNewCardColumnId(col.id);
                          setNewTitle('');
                          setNewDetails('');
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-white transition-colors mt-auto"
                      >
                        <Plus size={14} />
                        <span>Aggiungi scheda</span>
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {draggedColumnId && columnDropTargetIndex === columns.length && (
            <div className="w-2.5 h-[420px] rounded-full bg-indigo-500 border-2 border-indigo-300 animate-pulse shrink-0 self-stretch shadow-md shadow-indigo-500/30 transition-all" />
          )}

          {isAddingColumn ? (
            <div className="w-80 shrink-0 rounded-xl border border-indigo-500 bg-white p-3.5 shadow-xs">
              <h4 className="text-xs font-semibold text-slate-900 mb-2">Aggiungi colonna</h4>
              <input
                type="text"
                placeholder="Nome della colonna"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') setIsAddingColumn(false);
                }}
                autoFocus
                className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 text-slate-900 mb-3"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-2xs transition-colors"
                >
                  Salva colonna
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="w-80 shrink-0 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-white flex items-center justify-center space-x-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-all"
            >
              <Plus size={16} />
              <span>Aggiungi un'altra colonna</span>
            </button>
          )}
        </div>
      </main>

      {/* Pop-up Condivisione Bacheca */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl relative">
            <button
              onClick={() => {
                setIsShareModalOpen(false);
                setInviteError('');
                setInviteSuccess('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Condividi Bacheca</h3>
                <p className="text-xs text-slate-500">Invita altri utenti a collaborare su questa bacheca.</p>
              </div>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center space-x-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center space-x-2">
                <UserCheck size={14} className="shrink-0 text-emerald-600" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <div className="flex items-center space-x-2 mb-6">
              <input
                type="email"
                placeholder="email.collega@esempio.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-900"
              />
              <button
                onClick={handleInviteUser}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition-colors shrink-0"
              >
                Invita
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Membri Attivi ({boardMembers.length + 1})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-800">{session.user.email} (Tu)</span>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                    Proprietario
                  </span>
                </div>
                {boardMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-xs p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-600">Collaboratore</span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      Editor
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Dettaglio Scheda */}
      {activeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setActiveCard(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titolo Scheda</label>
              <input
                type="text"
                value={editingCardTitle}
                onChange={(e) => setEditingCardTitle(e.target.value)}
                className="w-full text-base font-bold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descrizione Dettagliata</label>
              <textarea
                rows={3}
                placeholder="Aggiungi una descrizione dettagliata per questa scheda..."
                value={editingCardDetails}
                onChange={(e) => setEditingCardDetails(e.target.value)}
                className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="mb-6 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Paperclip size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Allegati ({cardAttachments.length})</h3>
                </div>
              </div>

              <label className="group relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-4 bg-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-colors mb-4">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <UploadCloud size={24} className="text-slate-400 group-hover:text-indigo-600 mb-1 transition-colors" />
                <span className="text-xs font-medium text-slate-600 group-hover:text-indigo-600">
                  {uploadingFile ? 'Caricamento in corso...' : 'Trascina qui i file o fai clic per caricare'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Immagini, PDF, Documenti Word, Excel...</span>
              </label>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cardAttachments.map((att) => {
                  const isImage = att.file_type?.startsWith('image/');

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {isImage ? (
                          <img src={att.file_url} alt={att.file_name} className="w-9 h-9 rounded object-cover shrink-0 border" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{att.file_name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(att.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Apri / Scarica"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveCard(null)}
                className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveCardDetails}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-rose-50 p-2 text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmDelete.type === 'column' ? 'Elimina colonna' : 'Elimina scheda'}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Sei sicuro di voler eliminare <span className="font-semibold text-slate-900">"{confirmDelete.name}"</span>?
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs"
              >
                Elimina definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}