import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  api,
  FollowingUser,
  GamificationBadge,
  GamificationChallenge,
  GamificationDashboard,
  LeaderboardData,
} from '../services/api';

import {
  Button,
  Card,
  ScreenTitle,
  uiStyles,
} from '../components/UI';

import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export function GamificationScreen() {
  const { user } = useApp();

  const [dashboard, setDashboard] =
    useState<GamificationDashboard | null>(null);

  const [badges, setBadges] =
    useState<GamificationBadge[]>([]);

  const [challenges, setChallenges] =
    useState<GamificationChallenge[]>([]);

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardData | null>(null);

  const [following, setFollowing] =
    useState<FollowingUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [
        dashboardData,
        badgeData,
        challengeData,
        leaderboardData,
        followingData,
      ] = await Promise.all([
        api.getGamificationDashboard(),
        api.getBadges(),
        api.getChallenges(),
        api.getLeaderboard(),
        api.getFollowing(),
      ]);

      setDashboard(dashboardData);
      setBadges(badgeData);
      setChallenges(challengeData);
      setLeaderboard(leaderboardData);
      setFollowing(followingData);
    } catch (error) {
      Alert.alert(
        'Unable to load achievements',
        (error as Error).message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const joinChallenge = async (id: string) => {
    try {
      setActionId(id);
      await api.joinChallenge(id);
      await load();
    } catch (error) {
      Alert.alert(
        'Unable to join challenge',
        (error as Error).message
      );
    } finally {
      setActionId(null);
    }
  };

  const isFollowing = (id: string) =>
    following.some(item => item.id === id);

  const toggleFollow = async (id: string) => {
    try {
      setActionId(id);

      if (isFollowing(id)) {
        await api.unfollowUser(id);
      } else {
        await api.followUser(id);
      }

      await load();
    } catch (error) {
      Alert.alert(
        'Unable to update follow',
        (error as Error).message
      );
    } finally {
      setActionId(null);
    }
  };

  const updateSetting = async (
    key: 'leaderboardOptIn' | 'shareProgressOptIn',
    value: boolean
  ) => {
    if (!dashboard) return;

    const oldValue = dashboard[key];

    setDashboard({
      ...dashboard,
      [key]: value,
    });

    try {
      await api.updateGamificationSettings({
        [key]: value,
      });
    } catch (error) {
      setDashboard({
        ...dashboard,
        [key]: oldValue,
      });

      Alert.alert(
        'Unable to save setting',
        (error as Error).message
      );
    }
  };

  if (!user?.premium) {
    return (
      <ScrollView
        style={uiStyles.screen}
        contentContainerStyle={uiStyles.scrollContent}
      >
        <ScreenTitle
          title="Achievements"
          subtitle="Premium feature"
          back
        />

        <Card>
          <Text style={uiStyles.body}>
            Upgrade to Premium to unlock streaks, badges,
            challenges, leaderboards and community progress.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  if (loading && !dashboard) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text style={uiStyles.muted}>
          Loading achievements...
        </Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <ScrollView style={uiStyles.screen}>
        <ScreenTitle
          title="Achievements"
          subtitle="Unable to load gamification data"
          back
        />

        <Button
          title="Try again"
          onPress={load}
        />
      </ScrollView>
    );
  }

  const currentStreak =
    dashboard.userStreak?.currentStreak || 0;

  const longestStreak =
    dashboard.userStreak?.longestStreak || 0;

  const earnedCount =
    badges.filter(badge => badge.earned).length;

  return (
    <ScrollView
      style={uiStyles.screen}
      contentContainerStyle={uiStyles.scrollContent}
    >
      <ScreenTitle
        title="Achievements & community"
        subtitle="Track streaks, earn badges and challenge yourself"
        back
      />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            🔥 {currentStreak}
          </Text>
          <Text style={uiStyles.muted}>
            day streak
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {dashboard.gamificationPoints}
          </Text>
          <Text style={uiStyles.muted}>
            points
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {earnedCount}
          </Text>
          <Text style={uiStyles.muted}>
            badges
          </Text>
        </View>
      </View>

      <Card>
        <Text style={styles.heading}>
          Streak progress
        </Text>

        <Text style={styles.bigNumber}>
          {currentStreak} days
        </Text>

        <Text style={uiStyles.muted}>
          Longest streak: {longestStreak} days
        </Text>

        {currentStreak === 0 && (
          <Text style={styles.tip}>
            Log a meal today to start your first streak.
          </Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>
        Badges
      </Text>

      {badges.map(badge => (
        <Card key={badge.code}>
          <View style={styles.row}>
            <Text style={styles.badgeIcon}>
              {badge.earned ? '🏅' : '🔒'}
            </Text>

            <View style={styles.flex}>
              <Text style={styles.heading}>
                {badge.title}
              </Text>

              <Text style={uiStyles.body}>
                {badge.description}
              </Text>

              {badge.earnedAt && (
                <Text style={uiStyles.muted}>
                  Earned{' '}
                  {new Date(
                    badge.earnedAt
                  ).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>
        Challenges
      </Text>

      {challenges.length === 0 && (
        <Card>
          <Text style={uiStyles.body}>
            No active challenges right now.
          </Text>
        </Card>
      )}

      {challenges.map(challenge => {
        const progress = Math.min(
          challenge.progress / challenge.targetValue,
          1
        );

        return (
          <Card key={challenge.id}>
            <View style={styles.spaceBetween}>
              <View style={styles.flex}>
                <Text style={styles.heading}>
                  {challenge.title}
                </Text>

                <Text style={uiStyles.body}>
                  {challenge.description}
                </Text>
              </View>

              <Text style={styles.points}>
                +{challenge.pointsReward}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>

            <Text style={uiStyles.muted}>
              {challenge.progress} / {challenge.targetValue}
            </Text>

            {challenge.completedAt ? (
              <Text style={styles.completed}>
                ✓ Challenge completed
              </Text>
            ) : challenge.joined ? (
              <Text style={styles.joined}>
                Challenge joined
              </Text>
            ) : (
              <Button
                title={
                  actionId === challenge.id
                    ? 'Joining...'
                    : 'Join challenge'
                }
                disabled={actionId === challenge.id}
                onPress={() =>
                  joinChallenge(challenge.id)
                }
              />
            )}
          </Card>
        );
      })}

      <Text style={styles.sectionTitle}>
        Community leaderboard
      </Text>

      <Card>
        <View style={styles.setting}>
          <View style={styles.flex}>
            <Text style={styles.heading}>
              Join leaderboard
            </Text>

            <Text style={uiStyles.muted}>
              Allow your name and points to appear
              on the Premium leaderboard.
            </Text>
          </View>

          <Switch
            value={dashboard.leaderboardOptIn}
            onValueChange={value =>
              updateSetting(
                'leaderboardOptIn',
                value
              )
            }
          />
        </View>

        <View style={uiStyles.divider} />

        <View style={styles.setting}>
          <View style={styles.flex}>
            <Text style={styles.heading}>
              Share progress
            </Text>

            <Text style={uiStyles.muted}>
              Let followers see your streak and points.
            </Text>
          </View>

          <Switch
            value={dashboard.shareProgressOptIn}
            onValueChange={value =>
              updateSetting(
                'shareProgressOptIn',
                value
              )
            }
          />
        </View>
      </Card>

      {leaderboard?.currentUserRank && (
        <Card>
          <Text style={uiStyles.muted}>
            Your leaderboard rank
          </Text>

          <Text style={styles.rank}>
            #{leaderboard.currentUserRank}
          </Text>
        </Card>
      )}

      {leaderboard?.entries.map(entry => (
        <Card key={entry.id}>
          <View style={styles.spaceBetween}>
            <View style={styles.row}>
              <Text style={styles.rankNumber}>
                #{entry.rank}
              </Text>

              <View>
                <Text style={styles.heading}>
                  {entry.name}
                  {entry.id === dashboard.id
                    ? ' (You)'
                    : ''}
                </Text>

                <Text style={uiStyles.muted}>
                  {entry.gamificationPoints} points
                </Text>
              </View>
            </View>

            {entry.id !== dashboard.id && (
              <Pressable
                disabled={actionId === entry.id}
                onPress={() =>
                  toggleFollow(entry.id)
                }
              >
                <Text style={styles.followButton}>
                  {isFollowing(entry.id)
                    ? 'Following'
                    : 'Follow'}
                </Text>
              </Pressable>
            )}
          </View>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>
        Following
      </Text>

      {following.length === 0 ? (
        <Card>
          <Text style={uiStyles.body}>
            You are not following anyone yet.
          </Text>

          <Text style={uiStyles.muted}>
            Follow Premium members from the leaderboard
            to view progress they choose to share.
          </Text>
        </Card>
      ) : (
        following.map(friend => (
          <Card key={friend.id}>
            <View style={styles.spaceBetween}>
              <View style={styles.flex}>
                <Text style={styles.heading}>
                  {friend.name}
                </Text>

                {friend.progress ? (
                  <>
                    <Text style={uiStyles.body}>
                      🔥 {friend.progress.currentStreak} day streak
                    </Text>

                    <Text style={uiStyles.muted}>
                      {friend.progress.gamificationPoints} points
                    </Text>
                  </>
                ) : (
                  <Text style={uiStyles.muted}>
                    This user has chosen not to share progress.
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() =>
                  toggleFollow(friend.id)
                }
              >
                <Text style={styles.unfollow}>
                  Unfollow
                </Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Button
        title="Refresh"
        secondary
        onPress={load}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 10,
  },

  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },

  bigNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primaryDark,
    marginBottom: 4,
  },

  tip: {
    color: colors.primaryDark,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  flex: {
    flex: 1,
  },

  badgeIcon: {
    fontSize: 28,
  },

  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  points: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  progressTrack: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 7,
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  completed: {
    color: colors.success,
    fontWeight: '800',
    marginTop: 10,
  },

  joined: {
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: 10,
  },

  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  rank: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  rankNumber: {
    width: 34,
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  followButton: {
    color: colors.primaryDark,
    fontWeight: '800',
  },

  unfollow: {
    color: colors.danger,
    fontWeight: '700',
  },
});