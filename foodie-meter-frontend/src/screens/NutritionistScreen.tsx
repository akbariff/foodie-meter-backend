import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import {
  api, CuratedRecipe, ModerationAction, ModerationEntry, ModerationRecipe, ModerationStatus,
  NutritionCategory, NutritionContent,
} from '../services/api';
import { colors, radius } from '../theme';

type Tab = 'recipes' | 'articles' | 'moderation';
const TABS: { key: Tab; label: string }[] = [
  { key: 'recipes', label: 'Curated recipes' },
  { key: 'articles', label: 'Articles' },
  { key: 'moderation', label: 'Moderation' },
];

const message = (title: string, text: string) =>
  Platform.OS === 'web' ? window.alert(`${title}\n\n${text}`) : Alert.alert(title, text);

// Alert buttons do nothing on web, so fall back to the browser's confirm box there.
function confirm(title: string, text: string, actionLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${text}`)) onConfirm();
    return;
  }
  Alert.alert(title, text, [{ text: 'Cancel', style: 'cancel' }, { text: actionLabel, style: 'destructive', onPress: onConfirm }]);
}

const errorText = (err: unknown) => String((err as Error).message || err);

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function NutritionistScreen() {
  const { user, navigate } = useApp();
  const [tab, setTab] = useState<Tab>('recipes');
  const allowed = user?.role === 'NUTRITIONIST' || user?.role === 'ADMIN';

  if (!allowed) {
    return (
      <ScrollView style={uiStyles.screen}>
        <ScreenTitle title="Nutritionist tools" subtitle="Access denied" back />
        <Text style={uiStyles.body}>This area requires a Nutritionist or Administrator account.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent} keyboardShouldPersistTaps="handled">
      <ScreenTitle title="Nutritionist tools" subtitle="Curate recipes, write articles and moderate community recipes" back />
      <Card style={styles.aiCard}>
        <View style={uiStyles.spaceBetween}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>AI meal review</Text>
            <Text style={uiStyles.muted}>Check and approve AI-generated meals before Premium users see them.</Text>
          </View>
        </View>
        <Button title="Open AI meal review" secondary onPress={() => navigate('AiMealReview')} />
      </Card>
      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'recipes' && <CuratedRecipesTab />}
      {tab === 'articles' && <ArticlesTab />}
      {tab === 'moderation' && <ModerationTab />}
    </ScrollView>
  );
}

// ---------------- Curated recipes ----------------

const emptyRecipe = { title: '', ingredients: '', instructions: '' };

function CuratedRecipesTab() {
  const [recipes, setRecipes] = useState<CuratedRecipe[]>([]);
  const [editing, setEditing] = useState<CuratedRecipe | null>(null);
  const [form, setForm] = useState(emptyRecipe);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { setRecipes(await api.getCuratedRecipes()); setError(''); } catch (err) { setError(errorText(err)); }
  };
  useEffect(() => { void load(); }, []);

  const startNew = () => { setEditing(null); setForm(emptyRecipe); setShowForm(true); };
  const startEdit = (recipe: CuratedRecipe) => {
    setEditing(recipe);
    setForm({ title: recipe.title, ingredients: recipe.ingredients, instructions: recipe.instructions });
    setShowForm(true);
  };
  const cancel = () => { setEditing(null); setForm(emptyRecipe); setShowForm(false); };

  const save = async () => {
    if (!form.title.trim() || !form.ingredients.trim() || !form.instructions.trim()) {
      return message('Missing details', 'Enter a title, the ingredients and the instructions.');
    }
    setBusy(true);
    try {
      if (editing) await api.updateCuratedRecipe(editing.id, form);
      else await api.createCuratedRecipe(form);
      cancel();
      await load();
      message('Saved', editing ? 'The curated recipe was updated.' : 'The curated recipe was added to the library.');
    } catch (err) {
      message('Save failed', errorText(err));
    } finally { setBusy(false); }
  };

  const remove = (recipe: CuratedRecipe) => confirm(
    'Delete curated recipe?',
    `"${recipe.title}" will be removed from the library. Copies that users already saved are kept.`,
    'Delete',
    async () => {
      try { await api.deleteCuratedRecipe(recipe.id); if (editing?.id === recipe.id) cancel(); await load(); }
      catch (err) { message('Delete failed', errorText(err)); }
    },
  );

  return (
    <View>
      <Text style={uiStyles.muted}>Recipes in this library are shown to every user, who can copy them into My recipes.</Text>
      {!showForm && <Button title="＋ Add curated recipe" onPress={startNew} />}
      {showForm && (
        <Card>
          <Text style={uiStyles.h2}>{editing ? 'Edit curated recipe' : 'New curated recipe'}</Text>
          <Field label="Title" value={form.title} onChangeText={title => setForm(f => ({ ...f, title }))} />
          <Field label="Ingredients (one per line)" multiline value={form.ingredients} onChangeText={ingredients => setForm(f => ({ ...f, ingredients }))} />
          <Field label="Instructions (one step per line)" multiline value={form.instructions} onChangeText={instructions => setForm(f => ({ ...f, instructions }))} />
          <Button title={busy ? 'Saving...' : editing ? 'Save changes' : 'Add to library'} disabled={busy} onPress={() => void save()} />
          <Button title="Cancel" secondary onPress={cancel} />
        </Card>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {recipes.length === 0 && !error && <Card><Text style={uiStyles.body}>No curated recipes yet.</Text></Card>}
      {recipes.map(recipe => (
        <Card key={recipe.id}>
          <Text style={styles.cardTitle}>{recipe.title}</Text>
          <Text style={uiStyles.muted} numberOfLines={2}>{recipe.ingredients.split('\n').filter(Boolean).join(' • ')}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => startEdit(recipe)}><Text style={styles.link}>Edit</Text></Pressable>
            <Pressable onPress={() => remove(recipe)}><Text style={styles.danger}>Delete</Text></Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ---------------- Nutrition articles ----------------

const emptyArticle = { title: '', content: '' };

function ArticlesTab() {
  const { user } = useApp();
  const [categories, setCategories] = useState<NutritionCategory[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [articles, setArticles] = useState<NutritionContent[]>([]);
  const [editing, setEditing] = useState<NutritionContent | null>(null);
  const [form, setForm] = useState(emptyArticle);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyNutritionCategories()
      .then(list => { setCategories(list); setCategoryId(list[0]?.id ?? null); })
      .catch(err => { setCategories([]); setError(errorText(err)); });
  }, []);

  const load = async (id = categoryId) => {
    if (!id) return setArticles([]);
    try { setArticles(await api.getNutritionContents(id)); setError(''); } catch (err) { setError(errorText(err)); }
  };
  useEffect(() => { void load(categoryId); cancel(); }, [categoryId]);

  const cancel = () => { setEditing(null); setForm(emptyArticle); setShowForm(false); };
  const startEdit = (article: NutritionContent) => {
    setEditing(article); setForm({ title: article.title, content: article.content }); setShowForm(true);
  };
  const canEdit = (article: NutritionContent) => user?.role === 'ADMIN' || article.authorId === user?.id;

  const save = async () => {
    if (!categoryId) return;
    if (!form.title.trim() || !form.content.trim()) return message('Missing details', 'Enter a title and the article text.');
    setBusy(true);
    try {
      if (editing) await api.updateNutritionContent(editing.id, form);
      else await api.createNutritionContent({ categoryId, ...form });
      cancel();
      await load();
      message('Saved', editing ? 'The article was updated.' : 'The article was published in this category.');
    } catch (err) {
      message('Save failed', errorText(err));
    } finally { setBusy(false); }
  };

  const remove = (article: NutritionContent) => confirm(
    'Delete article?', `"${article.title}" will be permanently deleted.`, 'Delete',
    async () => {
      try { await api.deleteNutritionContent(article.id); if (editing?.id === article.id) cancel(); await load(); }
      catch (err) { message('Delete failed', errorText(err)); }
    },
  );

  if (categories === null) return <Text style={uiStyles.muted}>Loading your categories...</Text>;
  if (categories.length === 0) {
    return (
      <Card>
        <Text style={styles.cardTitle}>No categories assigned yet</Text>
        <Text style={uiStyles.body}>You can write articles only in the nutrition categories an administrator has assigned to you. Ask an administrator to assign you to a category.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Card>
    );
  }

  const current = categories.find(c => c.id === categoryId);
  return (
    <View>
      <Text style={uiStyles.muted}>You can write in the categories assigned to you. You can change or delete only your own articles.</Text>
      <View style={styles.chipRow}>
        {categories.map(c => <Chip key={c.id} label={c.name} active={c.id === categoryId} onPress={() => setCategoryId(c.id)} />)}
      </View>
      {!!current?.description && <Text style={[uiStyles.muted, styles.space]}>{current.description}</Text>}
      {!showForm && <Button title="＋ Write article" onPress={() => { setEditing(null); setForm(emptyArticle); setShowForm(true); }} />}
      {showForm && (
        <Card>
          <Text style={uiStyles.h2}>{editing ? 'Edit article' : `New article in ${current?.name ?? 'this category'}`}</Text>
          <Field label="Title" value={form.title} onChangeText={title => setForm(f => ({ ...f, title }))} />
          <Field label="Article text" multiline style={styles.tall} value={form.content} onChangeText={content => setForm(f => ({ ...f, content }))} />
          <Button title={busy ? 'Saving...' : editing ? 'Save changes' : 'Publish article'} disabled={busy} onPress={() => void save()} />
          <Button title="Cancel" secondary onPress={cancel} />
        </Card>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {articles.length === 0 && !error && <Card><Text style={uiStyles.body}>No articles in this category yet.</Text></Card>}
      {articles.map(article => (
        <Card key={article.id}>
          <Text style={styles.cardTitle}>{article.title}</Text>
          <Text style={uiStyles.body} numberOfLines={4}>{article.content}</Text>
          <Text style={[uiStyles.muted, styles.space]}>
            {article.authorId === user?.id ? 'Written by you' : 'Written by another nutritionist'} • {new Date(article.updatedAt).toLocaleDateString()}
          </Text>
          {canEdit(article) && (
            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(article)}><Text style={styles.link}>Edit</Text></Pressable>
              <Pressable onPress={() => remove(article)}><Text style={styles.danger}>Delete</Text></Pressable>
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

// ---------------- Recipe moderation ----------------

const STATUSES: { key: ModerationStatus; label: string }[] = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'FLAGGED', label: 'Flagged' },
  { key: 'REMOVED', label: 'Removed' },
];
const ACTION_LABEL: Record<ModerationAction, string> = {
  APPROVED: 'Approved', CLEARED: 'Cleared', FLAGGED: 'Flagged', REMOVED: 'Removed',
};

function ModerationTab() {
  const [status, setStatus] = useState<ModerationStatus>('ACTIVE');
  const [recipes, setRecipes] = useState<ModerationRecipe[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<ModerationEntry[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (next = status) => {
    try { setRecipes(await api.getModerationQueue(next)); setError(''); } catch (err) { setError(errorText(err)); }
  };
  useEffect(() => { setOpenId(null); void load(status); }, [status]);

  const open = async (recipe: ModerationRecipe) => {
    if (openId === recipe.id) return setOpenId(null);
    setOpenId(recipe.id); setReason(''); setHistory([]);
    try { setHistory(await api.getModerationHistory(recipe.id)); } catch (err) { setError(errorText(err)); }
  };

  const act = async (recipe: ModerationRecipe, action: ModerationAction) => {
    if ((action === 'FLAGGED' || action === 'REMOVED') && !reason.trim()) {
      return message('Reason needed', 'Enter a reason before flagging or removing a recipe. The reason is kept in the moderation history.');
    }
    setBusy(true);
    try {
      await api.moderateRecipe(recipe.id, action, reason.trim() || undefined);
      setOpenId(null);
      await load();
      message('Done', `"${recipe.title}" was marked ${ACTION_LABEL[action].toLowerCase()}.`);
    } catch (err) {
      message('Action failed', errorText(err));
    } finally { setBusy(false); }
  };

  const confirmRemove = (recipe: ModerationRecipe) => {
    if (!reason.trim()) return void act(recipe, 'REMOVED');
    confirm('Remove recipe?', `"${recipe.title}" will be hidden from the community. Its owner keeps their copy.`, 'Remove', () => void act(recipe, 'REMOVED'));
  };

  return (
    <View>
      <Text style={uiStyles.muted}>Recipes that members have shared with the community. Flagged and removed recipes are hidden from other users.</Text>
      <View style={styles.chipRow}>
        {STATUSES.map(s => <Chip key={s.key} label={s.label} active={s.key === status} onPress={() => setStatus(s.key)} />)}
      </View>
      <Button title="Refresh" secondary onPress={() => void load()} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {recipes.length === 0 && !error && <Card><Text style={uiStyles.body}>No {status.toLowerCase()} shared recipes.</Text></Card>}
      {recipes.map(recipe => (
        <Card key={recipe.id}>
          <Pressable onPress={() => void open(recipe)}>
            <View style={uiStyles.spaceBetween}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{recipe.title}</Text>
                <Text style={uiStyles.muted}>Shared by {recipe.ownerName} • {new Date(recipe.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.badge, recipe.moderationStatus !== 'ACTIVE' && styles.badgeWarn]}>{recipe.moderationStatus}</Text>
            </View>
          </Pressable>
          {openId === recipe.id && (
            <View>
              <View style={uiStyles.divider} />
              <Text style={styles.label}>Ingredients</Text>
              {recipe.ingredients.split(/\n|,/).map(x => x.trim()).filter(Boolean).map((x, i) => <Text key={i} style={uiStyles.body}>• {x}</Text>)}
              <Text style={[styles.label, styles.space]}>Instructions</Text>
              <Text style={uiStyles.body}>{recipe.instructions}</Text>
              <Text style={[styles.label, styles.space]}>Moderation history</Text>
              {history.length === 0
                ? <Text style={uiStyles.muted}>No moderation actions yet.</Text>
                : history.map(h => (
                  <Text key={h.id} style={uiStyles.muted}>
                    {new Date(h.createdAt).toLocaleString()} — {ACTION_LABEL[h.action]}{h.reason ? `: ${h.reason}` : ''}
                  </Text>
                ))}
              <View style={uiStyles.divider} />
              <Field label="Reason (required to flag or remove)" multiline value={reason} onChangeText={setReason} />
              {recipe.moderationStatus === 'ACTIVE' && (
                <>
                  <Button title="Approve" secondary disabled={busy} onPress={() => void act(recipe, 'APPROVED')} />
                  <Button title="Flag for review" disabled={busy} onPress={() => void act(recipe, 'FLAGGED')} />
                </>
              )}
              {recipe.moderationStatus !== 'ACTIVE' && (
                <Button title="Restore (clear flag)" secondary disabled={busy} onPress={() => void act(recipe, 'CLEARED')} />
              )}
              {recipe.moderationStatus !== 'REMOVED' && (
                <Button title="Remove from community" danger disabled={busy} onPress={() => confirmRemove(recipe)} />
              )}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  aiCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  tabs: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm - 2, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: colors.primaryDark },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  chipTextActive: { color: 'white' },
  actions: { flexDirection: 'row', gap: 20, marginTop: 12 },
  link: { color: colors.primaryDark, fontWeight: '700' },
  danger: { color: colors.danger, fontWeight: '700' },
  error: { color: colors.danger, marginVertical: 8 },
  label: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 4 },
  space: { marginTop: 10 },
  tall: { height: 180 },
  badge: { fontSize: 10, fontWeight: '800', color: colors.primaryDark, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgeWarn: { color: '#996515', backgroundColor: colors.warningBg },
});
