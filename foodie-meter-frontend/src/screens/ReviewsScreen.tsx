import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, ScreenTitle, uiStyles } from '../components/UI';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function ReviewsScreen() {
  const { reviews, saveReview, deleteReview, goBack, params } = useApp();
  const [recipeTitle, setRecipeTitle] = useState(params?.recipeTitle || '');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [editId, setEditId] = useState<string | undefined>();

  const submit = () => {
    if (!recipeTitle.trim()) {
      return Alert.alert('Select a recipe', 'Enter the recipe name you are reviewing.');
    }
    if (!comment.trim()) {
      return Alert.alert('Write a review', 'Enter your recipe review.');
    }

    saveReview(recipeTitle.trim(), Math.min(5, Math.max(1, Number(rating) || 5)), comment.trim(), editId);
    setComment('');
    setEditId(undefined);
    setRating('5');
  };

  return (
    <ScrollView style={uiStyles.screen} contentContainerStyle={uiStyles.scrollContent}>
      <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
        <Text style={styles.backIcon}>←</Text>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScreenTitle
        title="Recipe Reviews"
        subtitle="Read recipe feedback or manage your own recipe review"
      />

      <Field
        label="Recipe name"
        value={recipeTitle}
        onChangeText={setRecipeTitle}
        placeholder="e.g. Teriyaki salmon bowl"
      />
      <Field
        label="Rating (1–5)"
        keyboardType="numeric"
        value={rating}
        onChangeText={setRating}
      />
      <Field
        label="Your recipe review"
        multiline
        value={comment}
        onChangeText={setComment}
        placeholder="What did you think about this recipe?"
      />
      <Button title={editId ? 'Update recipe review' : 'Create recipe review'} onPress={submit} />

      {reviews.map((v) => (
        <Card key={v.id}>
          <Text style={styles.recipeTitle}>{v.recipeTitle}</Text>
          <View style={uiStyles.spaceBetween}>
            <Text style={styles.author}>{v.author}</Text>
            <Text style={styles.stars}>{'★'.repeat(v.rating)}</Text>
          </View>
          <Text style={uiStyles.body}>{v.comment}</Text>

          {v.mine && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  setEditId(v.id);
                  setRecipeTitle(v.recipeTitle);
                  setRating(String(v.rating));
                  setComment(v.comment);
                }}
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete recipe review', 'Delete this recipe review?', [
                    { text: 'Cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteReview(v.id) },
                  ])
                }
              >
                <Text style={styles.danger}>Delete</Text>
              </Pressable>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  backIcon: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: 24,
  },
  backText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
  recipeTitle: {
    fontWeight: '900',
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  author: { fontWeight: '800', color: colors.text },
  stars: { color: '#E2AD39' },
  actions: { flexDirection: 'row', gap: 20, marginTop: 12 },
  link: { color: colors.primaryDark, fontWeight: '700' },
  danger: { color: colors.danger, fontWeight: '700' },
});
