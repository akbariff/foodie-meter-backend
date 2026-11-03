import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Card,
  Field,
  ScreenTitle,
  uiStyles,
} from '../components/UI';

import {
  api,
  PublicRecipe,
  RecipeReviewData,
} from '../services/api';

import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function ReviewsScreen() {
  const { goBack, params } = useApp();

  const [recipes, setRecipes] =
    useState<PublicRecipe[]>([]);

  const [selectedRecipeId, setSelectedRecipeId] =
    useState<string | null>(
      params?.recipeId || null
    );

  const [data, setData] =
    useState<RecipeReviewData | null>(null);

  const [rating, setRating] =
    useState('5');

  const [comment, setComment] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const loadReviews = useCallback(
    async (recipeId: string) => {
      try {
        setLoading(true);

        const result =
          await api.getRecipeReviews(
            recipeId
          );

        setData(result);

        const mine =
          result.reviews.find(
            review => review.mine
          );

        if (mine) {
          setRating(
            String(mine.rating)
          );

          setComment(
            mine.comment
          );
        } else {
          setRating('5');
          setComment('');
        }
      } catch (error) {
        Alert.alert(
          'Could not load reviews',
          (error as Error).message
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const result =
          await api.getPublicRecipes();

        setRecipes(result);

        if (!result.length) {
          setSelectedRecipeId(null);
          return;
        }

        const requested =
          params?.recipeId;

        const requestedExists =
          requested &&
          result.some(
            recipe =>
              recipe.id === requested
          );

        const initialId =
          requestedExists
            ? requested
            : result[0].id;

        setSelectedRecipeId(
          initialId
        );

        await loadReviews(
          initialId
        );
      } catch (error) {
        Alert.alert(
          'Could not load recipes',
          (error as Error).message
        );
      }
    };

    void loadRecipes();
  }, []);

  const selectRecipe = async (
    recipeId: string
  ) => {
    setSelectedRecipeId(recipeId);

    await loadReviews(
      recipeId
    );
  };

  const saveReview = async () => {
    if (!selectedRecipeId) {
      return;
    }

    const numericRating =
      Math.min(
        5,
        Math.max(
          1,
          Number(rating) || 5
        )
      );

    if (!comment.trim()) {
      return Alert.alert(
        'Write a review',
        'Enter your recipe review.'
      );
    }

    try {
      setSaving(true);

      await api.saveMyRecipeReview(
        selectedRecipeId,
        numericRating,
        comment.trim()
      );

      await loadReviews(
        selectedRecipeId
      );

      Alert.alert(
        'Saved',
        'Your recipe review has been saved.'
      );
    } catch (error) {
      Alert.alert(
        'Save failed',
        (error as Error).message
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteMine = () => {
    if (!selectedRecipeId) return;

    Alert.alert(
      'Delete recipe review',
      'Delete your review?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await api.deleteMyRecipeReview(
                selectedRecipeId
              );

              await loadReviews(
                selectedRecipeId
              );
            } catch (error) {
              Alert.alert(
                'Delete failed',
                (error as Error).message
              );
            }
          },
        },
      ]
    );
  };

  const myReview =
    data?.reviews.find(
      review => review.mine
    );

  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={
        uiStyles.scrollContent
      }
    >
      <Pressable
        onPress={goBack}
        style={styles.backButton}
        hitSlop={10}
      >
        <Text style={styles.backIcon}>
          ←
        </Text>

        <Text style={styles.backText}>
          Back
        </Text>
      </Pressable>

      <ScreenTitle
        title="Recipe Reviews"
        subtitle="Read community feedback and manage only your own review"
      />

      <Text style={uiStyles.h2}>
        Choose recipe
      </Text>

      {recipes.length === 0 && (
        <Card>
          <Text style={uiStyles.body}>
            No community recipes are available yet.
          </Text>
        </Card>
      )}

      {recipes.map(recipe => {
        const selected =
          recipe.id ===
          selectedRecipeId;

        return (
          <Pressable
            key={recipe.id}
            onPress={() =>
              void selectRecipe(
                recipe.id
              )
            }
          >
            <Card
              style={
                selected
                  ? styles.selectedRecipe
                  : undefined
              }
            >
              <Text
                style={
                  styles.recipeTitle
                }
              >
                {recipe.title}
              </Text>

              <Text
                style={uiStyles.muted}
              >
                By {recipe.ownerName}
              </Text>
            </Card>
          </Pressable>
        );
      })}

      {selectedRecipeId && (
        <>
          <View
            style={uiStyles.divider}
          />

          <Text style={uiStyles.h2}>
            {myReview
              ? 'Update your review'
              : 'Leave a review'}
          </Text>

          <Field
            label="Rating (1–5)"
            keyboardType="numeric"
            value={rating}
            onChangeText={setRating}
          />

          <Field
            label="Your review"
            multiline
            value={comment}
            onChangeText={setComment}
            placeholder="What did you think about this recipe?"
          />

          <Button
            title={
              saving
                ? 'Saving...'
                : myReview
                ? 'Update review'
                : 'Create review'
            }
            disabled={saving}
            onPress={() =>
              void saveReview()
            }
          />

          {!!myReview && (
            <Button
              title="Delete my review"
              danger
              onPress={deleteMine}
            />
          )}

          <View
            style={uiStyles.divider}
          />

          <Text style={uiStyles.h2}>
            Community reviews
          </Text>

          {!!data && (
            <Text style={uiStyles.muted}>
              {data.count} review
              {data.count === 1
                ? ''
                : 's'}
              {data.averageRating !==
              null
                ? ` • ${data.averageRating.toFixed(
                    1
                  )}/5 average`
                : ''}
            </Text>
          )}

          {loading && (
            <Text style={uiStyles.muted}>
              Loading reviews...
            </Text>
          )}

          {data?.reviews.map(
            review => (
              <Card key={review.id}>
                <View
                  style={
                    uiStyles.spaceBetween
                  }
                >
                  <Text
                    style={
                      styles.author
                    }
                  >
                    {review.author}
                    {review.mine
                      ? ' (You)'
                      : ''}
                  </Text>

                  <Text
                    style={
                      styles.stars
                    }
                  >
                    {'★'.repeat(
                      review.rating
                    )}
                  </Text>
                </View>

                <Text
                  style={uiStyles.body}
                >
                  {review.comment}
                </Text>

                {review.mine && (
                  <Text
                    style={
                      styles.ownerLabel
                    }
                  >
                    You can edit or delete
                    this review using the
                    form above.
                  </Text>
                )}
              </Card>
            )
          )}

          {data &&
            data.reviews.length ===
              0 && (
              <Card>
                <Text
                  style={
                    uiStyles.body
                  }
                >
                  No reviews yet. Be the
                  first to review this
                  recipe.
                </Text>
              </Card>
            )}
        </>
      )}
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
  },

  backText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },

  selectedRecipe: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor:
      colors.primarySoft,
  },

  recipeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  author: {
    fontWeight: '800',
    color: colors.text,
  },

  stars: {
    color: '#E2AD39',
  },

  ownerLabel: {
    marginTop: 10,
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});