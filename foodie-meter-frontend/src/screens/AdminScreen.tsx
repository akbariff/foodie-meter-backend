  import React, { useCallback, useEffect, useState } from 'react';
  import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
  } from 'react-native';

  import {
  api,
  AdminReview,
  AdminUser,
  NutritionistApplication,
  PublicRecipe,
  WebsiteInfo,
} from '../services/api';

  import {
    Button,
    Card,
    Field,
    ScreenTitle,
    uiStyles,
  } from '../components/UI';

  import { useApp } from '../context/AppContext';
  import { colors } from '../theme';

  export function AdminDashboardScreen() {
    const {user, logout, updateProfile,} = useApp();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [applications, setApplications] =useState<NutritionistApplication[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [profileName, setProfileName] = useState(user?.name ?? '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] =useState('');
    const [confirmNewPassword, setConfirmNewPassword,] = useState('');
    const [changingPassword,setChangingPassword,] = useState(false);
    const [websiteInfo,setWebsiteInfo,] = useState<WebsiteInfo | null>(null);
    const [websiteDraft,setWebsiteDraft,] = useState<WebsiteInfo | null>(null);
    const [websiteLoading,setWebsiteLoading,] = useState(false);
    const [websiteSaving,setWebsiteSaving,] = useState(false);
    const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]); 
    const [reviewSearch, setReviewSearch] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [sharedRecipes, setSharedRecipes] = useState<PublicRecipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId,] = useState('');
    const [newReviewRating, setNewReviewRating,] = useState('5');
    const [newReviewComment, setNewReviewComment,] = useState('');
    const [editingReviewId, setEditingReviewId,] = useState<string | null>(null);
    const [editReviewRating, setEditReviewRating,] = useState('5');
    const [editReviewComment, setEditReviewComment,] = useState('');
    const load = useCallback(async () => {try { setLoading(true);
      const [userData, applicationData] = await Promise.all([
          api.getAdminUsers({
            search: search.trim() || undefined,
          }),
          api.getNutritionistApplications('PENDING'),
        ]);
        setUsers(userData);
        setApplications(applicationData);
      } catch (error) {
        Alert.alert('Admin error',(error as Error).message);
      } finally {
        setLoading(false);
      }
    }, [search]);

    const saveAdminProfile = async () => {
    const name = profileName.trim();
    if (!name) {Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({name,});
      Alert.alert('Profile updated','Your administrator profile has been updated.');
    } 
    catch (error) {Alert.alert('Profile update failed',
        (error as Error).message
      );
    } finally {setSavingProfile(false);}
  };

  const changeAdminPassword = async () => {
    if (!currentPassword) {
      Alert.alert('Current password required','Enter your current password.');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Password too short','Your new password must be at least 8 characters.'
      );
      return;
    }

    if ( newPassword !== confirmNewPassword) 
      { Alert.alert('Passwords do not match','The new password confirmation does not match.');
      return;
    }

    if ( currentPassword === newPassword) 
      {
      Alert.alert('Choose a new password','Your new password must be different from your current password.');
      return;
    }
    try {
      setChangingPassword(true);
      await api.changePassword(currentPassword,newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      Alert.alert('Password changed','Your password has been changed successfully.');
    } 
    catch (error) 
    {
      Alert.alert('Password change failed',(error as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

const loadWebsiteInfo =
  async () => {
    try {
      setWebsiteLoading(true);
      const info =await api.getWebsiteInfo();
      setWebsiteInfo(info);
      setWebsiteDraft(info);
    } catch (error) {
      Alert.alert('Website information error',(error as Error).message);
    } finally {setWebsiteLoading(false);}
  };

  const updateWebsiteDraft = (
  field: keyof WebsiteInfo,
  value: string) => {setWebsiteDraft(current => {
    if (!current) {
      return current;
    }
    return {...current,[field]: value,};
  });
};

const saveWebsiteInfo =
  async () => {
    if (!websiteDraft) {
      return;
    }
    try {setWebsiteSaving(true);
      const {
        id,
        createdAt,
        updatedAt,
        ...payload
      } = websiteDraft;
      const saved =await api.updateWebsiteInfo(payload);
      setWebsiteInfo(saved);
      setWebsiteDraft(saved);
      Alert.alert(
        'Website updated',
        'The public website information has been updated successfully.'
      );
    } catch (error) {
      Alert.alert(
        'Website update failed',
        (error as Error).message
      );
    } finally {
      setWebsiteSaving(false);
    }
  };

  const loadReviewManagement = async () => {
    try {
      setReviewLoading(true);
      const [reviewData, recipeData,] = await Promise.all([
        api.getAdminReviews(reviewSearch.trim() ||undefined),
        api.getPublicRecipes(),]);
        setAdminReviews(reviewData);
        setSharedRecipes(recipeData);
        if (!selectedRecipeId && recipeData.length > 0) {
        setSelectedRecipeId(recipeData[0].id);
      }
    } catch (error) {
      Alert.alert('Review management error', (error as Error).message);
    } finally {
      setReviewLoading(false);
    }
  };
  const createAdminReview = async () => {
    if (!selectedRecipeId) {
      Alert.alert('Select recipe', 'Choose a shared recipe first.');
      return;
    }

    const rating = Number(newReviewRating);
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) 
    { Alert.alert('Invalid rating','Rating must be between 1 and 5.');
      return;
    }

    if (!newReviewComment.trim()) 
      {
      Alert.alert(
        'Review required',
        'Enter review content.'
      );

      return;
    }

    try {
      await api.createAdminReview(
        selectedRecipeId,
        rating,
        newReviewComment.trim()
      );

      setNewReviewRating('5');
      setNewReviewComment('');

      Alert.alert(
        'Review saved',
        'Administrator review content has been saved.'
      );

      await loadReviewManagement();
    } catch (error) {
      Alert.alert(
        'Save failed',
        (error as Error).message
      );
    }
  };

  const startEditingReview = (review: AdminReview) => {
  setEditingReviewId(review.id);
  setEditReviewRating(String(review.rating));
  setEditReviewComment(review.comment);
};

const saveEditedReview =async () => {
    if (!editingReviewId) {
      return;
    }
    const rating = Number(editReviewRating);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      Alert.alert('Invalid rating', 'Rating must be between 1 and 5.');
      return;
    }

    if (
      !editReviewComment.trim()
    ) {
      Alert.alert(
        'Review required',
        'Review content cannot be empty.'
      );
      return;
    }

    try {
      await api.updateAdminReview(
        editingReviewId,
        {
          rating,
          comment:
            editReviewComment.trim(),
        }
      );

      setEditingReviewId(null);
      setEditReviewComment('');
      setEditReviewRating('5');

      Alert.alert(
        'Review updated',
        'Review content has been updated.'
      );

      await loadReviewManagement();
    } catch (error) {
      Alert.alert('Update failed',(error as Error).message);
    }
  };

  const removeAdminReview = (review: AdminReview) => {
  Alert.alert(
    'Delete review?',
    `Delete the review from ${review.user.name} for ${review.recipe.title}?`,
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
            await api.deleteAdminReview(
              review.id
            );

            Alert.alert(
              'Review deleted',
              'The review has been removed.'
            );
              await loadReviewManagement();
          } catch (error) {Alert.alert(
              'Delete failed',
              (error as Error).message
            );
          }
        },
      },
    ]
  );
};

  useEffect(() => {load();}, []);
  useEffect(() => {void loadWebsiteInfo();}, []);
  useEffect(() => {void loadReviewManagement();}, []);
  const changeStatus = (account: AdminUser) => {
  const next =account.status === 'ACTIVE'? 'SUSPENDED' : 'ACTIVE';
  Alert.alert(next === 'SUSPENDED'
      ? 'Suspend account?'
      : 'Reinstate account?',
    `${account.name} (${account.email})`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text:
          next === 'SUSPENDED'
            ? 'Suspend'
            : 'Reinstate',
        style:
          next === 'SUSPENDED'
            ? 'destructive'
            : 'default',
        onPress: async () => {
          try {await api.updateAdminUserStatus(
              account.id,
              next
            );

            await load();
          } catch (error) {
            Alert.alert(
              'Update failed',
              (error as Error).message
            );
          }
        },
      },
    ]
  );
};

    const makeNutritionist = (account: AdminUser) => {
      Alert.alert(
        'Change role?',
        `Make ${account.name} a Nutritionist?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await api.updateAdminUserRole(
                  account.id,
                  'NUTRITIONIST'
                );

                await load();
              } catch (error) {
                Alert.alert(
                  'Role update failed',
                  (error as Error).message
                );
              }
            },
          },
        ]
      );
    };

    const approveApplication = async (application: NutritionistApplication) => {
      try {
        await api.approveNutritionistApplication(application.id);
        Alert.alert('Approved','Nutritionist application approved.');

        await load();
      } catch (error) {
        Alert.alert('Approval failed',(error as Error).message);
      }
    };

    const rejectApplication = async (application: NutritionistApplication) => {
    try {
      await api.rejectNutritionistApplication(application.id,'Application rejected by administrator');
      Alert.alert(
        'Rejected',
        'Nutritionist application rejected.'
      );

      await load();
    } catch (error) {
      Alert.alert(
        'Rejection failed',
        (error as Error).message
      );
    }
  };

    if (user?.role !== 'ADMIN') {
      return (
        <ScrollView style={uiStyles.screen}>
          <ScreenTitle
            title="Administrator"
            subtitle="Access denied"
          />

          <Text style={uiStyles.body}>
            This area requires a System Administrator account.
          </Text>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={uiStyles.screen}
        contentContainerStyle={uiStyles.scrollContent}
      >
        <ScreenTitle
          title="Admin dashboard"
          subtitle="Manage FoodieMeter accounts and Nutritionists"
        />
        
        <Card><Text style={styles.adminName}>{user.name}</Text>
        <Text style={uiStyles.muted}>System Administrator</Text>
        <Text style={uiStyles.muted}>{user.email}</Text></Card>
        <Text style={styles.sectionTitle}>My profile</Text>
        <Card>
          <Field label="Name" value={profileName} onChangeText= {setProfileName} placeholder="Administrator name"/>
          <Field label="Email" value={user.email} editable={false}/>
          <Text style={uiStyles.muted}> Your email address cannot be changed from this page. </Text>
          <Button title={ savingProfile ? 'Saving...' : 'Save profile'}
          disabled={savingProfile}
          onPress={() => void saveAdminProfile()}/>
          </Card>
          
          <Text style={styles.sectionTitle}>Manage users</Text>

        <Field
          label="Search by name or email"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        <Button
          title={loading ? 'Loading...' : 'Search / Refresh'}
          disabled={loading}
          onPress={load}
        />

        {users.map(account => (
          <Card key={account.id}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.name}>
                  {account.name}
                </Text>

                <Text style={uiStyles.muted}>
                  {account.email}
                </Text>
              </View>

              <Text
                style={[
                  styles.status,
                  account.status === 'SUSPENDED' &&
                    styles.suspended,
                ]}
              >
                {account.status}
              </Text>
            </View>

            <View style={uiStyles.divider} />

            <Text style={uiStyles.body}>
              Role: {account.role}
            </Text>

            <Text style={uiStyles.body}>
              Tier: {account.subscriptionTier}
            </Text>

            <Text style={uiStyles.body}>
              Verified: {account.isVerified ? 'Yes' : 'No'}
            </Text>

            {account.email !== user.email && (
              <>
                <Button
                  title={
                    account.status === 'ACTIVE'
                      ? 'Suspend account'
                      : 'Reinstate account'
                  }
                  danger={account.status === 'ACTIVE'}
                  secondary={
                    account.status === 'SUSPENDED'
                  }
                  onPress={() =>
                    changeStatus(account)
                  }
                />

                {account.role === 'USER' && (
                  <Button
                    title="Make Nutritionist"
                    secondary
                    onPress={() =>
                      makeNutritionist(account)
                    }
                  />
                )}
                <Button title="Send password reset"
                secondary onPress={() => {
                  Alert.alert(
                    'Send password reset?',
                    `Send password reset instructions to ${account.email}?`,
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Send',
                        onPress: async () => {
                          try {
                            await api.sendAdminPasswordReset(
                              account.id
                            );
                            Alert.alert(
                              'Reset requested',
                              'Password reset instructions have been generated for the user.'
                            );
                          } catch (error) {
                            Alert.alert(
                              'Reset failed',
                              (error as Error).message
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
              />

              <Button
                title="Remove account"
                danger
                onPress={() => {
                  Alert.alert(
                    'Remove account?',
                    `Permanently remove ${account.name} (${account.email})? This cannot be undone.`,
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await api.deleteAdminUser(
                              account.id
                            );

                            Alert.alert(
                              'Account removed',
                              'The account has been removed.'
                            );

                            await load();
                          } catch (error) {
                            Alert.alert(
                              'Remove failed',
                              (error as Error).message
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
              />
              </>
              
            )}
          </Card>
        ))}
        <Text style={styles.sectionTitle}>
      Manage Website Information
    </Text>

    <Card>
      {websiteLoading ? (
        <Text style={uiStyles.body}>
          Loading website information...
        </Text>
      ) : !websiteDraft ? (
        <Text style={uiStyles.body}>
          Website information could not be loaded.
        </Text>
      ) : (
        <>
          <Text style={uiStyles.h2}>
            General
          </Text>

          <Field
            label="Website name"
            value={websiteDraft.siteName}
            onChangeText={value =>
              updateWebsiteDraft(
                'siteName',
                value
              )
            }
          />


          <Text style={uiStyles.h2}>
            Hero section
          </Text>

          <Field
            label="Hero heading"
            value={
              websiteDraft.heroHeadingPrimary
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'heroHeadingPrimary',
                value
              )
            }
          />

          <Field
            label="Hero highlighted heading"
            value={
              websiteDraft.heroHeadingAccent
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'heroHeadingAccent',
                value
              )
            }
          />

          <Field
            label="Hero description"
            value={
              websiteDraft.heroDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'heroDescription',
                value
              )
            }
            multiline
          />


          <Text style={uiStyles.h2}>
            Features section
          </Text>

          <Field
            label="Features heading"
            value={
              websiteDraft.featuresHeading
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'featuresHeading',
                value
              )
            }
          />

          <Field
            label="Features description"
            value={
              websiteDraft.featuresDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'featuresDescription',
                value
              )
            }
            multiline
          />


          <Text style={uiStyles.h2}>
            Plans
          </Text>

          <Field
            label="Free plan description"
            value={
              websiteDraft.freePlanDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'freePlanDescription',
                value
              )
            }
            multiline
          />

          <Field
            label="Premium plan description"
            value={
              websiteDraft.premiumPlanDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'premiumPlanDescription',
                value
              )
            }
            multiline
          />


          <Text style={uiStyles.h2}>
            About FoodieMeter
          </Text>

          <Field
            label="About heading"
            value={
              websiteDraft.aboutHeading
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'aboutHeading',
                value
              )
            }
          />

          <Field
            label="About description"
            value={
              websiteDraft.aboutDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'aboutDescription',
                value
              )
            }
            multiline
          />

          <Field
            label="Medical disclaimer"
            value={
              websiteDraft.medicalDisclaimer
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'medicalDisclaimer',
                value
              )
            }
            multiline
          />


          <Text style={uiStyles.h2}>
            Call to action
          </Text>

          <Field
            label="CTA heading"
            value={
              websiteDraft.ctaHeading
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'ctaHeading',
                value
              )
            }
          />

          <Field
            label="CTA description"
            value={
              websiteDraft.ctaDescription
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'ctaDescription',
                value
              )
            }
            multiline
          />


          <Text style={uiStyles.h2}>
            Footer
          </Text>

          <Field
            label="Footer tagline"
            value={
              websiteDraft.footerTagline
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'footerTagline',
                value
              )
            }
          />

          <Field
            label="Footer copyright"
            value={
              websiteDraft.footerCopyright
            }
            onChangeText={value =>
              updateWebsiteDraft(
                'footerCopyright',
                value
              )
            }
            multiline
          />


          <Button
            title={
              websiteSaving
                ? 'Saving website...'
                : 'Save website information'
            }
            disabled={websiteSaving}
            onPress={() =>
              void saveWebsiteInfo()
            }
          />

          {websiteInfo && (
            <Text style={uiStyles.muted}>
              Last updated:{' '}
              {new Date(
                websiteInfo.updatedAt
              ).toLocaleString()}
            </Text>
          )}
        </>
      )}
    </Card>

            <Text style={styles.sectionTitle}>Review management</Text>
            <Card>
              <Text style={uiStyles.h2}>
        Search reviews
        </Text>
        <Field
          label="Search by recipe, user, email or comment"
          value={reviewSearch}
          onChangeText={
            setReviewSearch
          }
          autoCapitalize="none"
        />

      <Button
        title={
          reviewLoading
            ? 'Loading...'
            : 'Search / Refresh reviews'
        }
        disabled={reviewLoading}
        onPress={() =>
          void loadReviewManagement()
        }
      />
    </Card>


    <Card>
      <Text style={uiStyles.h2}>
        Add review content
      </Text>

      <Text style={uiStyles.muted}>
        Select a shared community recipe.
      </Text>

      {sharedRecipes.length === 0 && (
        <Text style={uiStyles.body}>
          No shared recipes are currently available.
        </Text>
      )}

      {sharedRecipes.map(
        recipe => (
          <Button
            key={recipe.id}
            title={
              selectedRecipeId ===
              recipe.id
                ? `✓ ${recipe.title}`
                : recipe.title
            }
            secondary={
              selectedRecipeId !==
              recipe.id
            }
            onPress={() =>
              setSelectedRecipeId(
                recipe.id
              )
            }
          />
        )
      )}

      <Field
        label="Rating (1–5)"
        value={newReviewRating}
        onChangeText={
          setNewReviewRating
        }
        keyboardType="numeric"
      />

      <Field
        label="Review content"
        value={newReviewComment}
        onChangeText={
          setNewReviewComment
        }
        multiline
        placeholder="Administrator review content"
      />

      <Button
        title="Add review"
        disabled={
          !selectedRecipeId
        }
        onPress={() =>
          void createAdminReview()
        }
      />
    </Card>


    <Text style={uiStyles.h2}>
      Existing reviews
    </Text>

    {adminReviews.length === 0 && (
      <Card>
        <Text style={uiStyles.body}>
          No reviews found.
        </Text>
      </Card>
    )}

{adminReviews.map(
  review => (
    <Card key={review.id}>
      <Text style={styles.name}>
        {review.recipe.title}
      </Text>

      <Text style={uiStyles.muted}>
        Review by {review.user.name}
      </Text>

      <Text style={uiStyles.muted}>
        {review.user.email}
      </Text>

      <View
        style={uiStyles.divider}
      />

      {editingReviewId ===
      review.id ? (
        <>
          <Field
            label="Rating (1–5)"
            value={
              editReviewRating
            }
            onChangeText={
              setEditReviewRating
            }
            keyboardType="numeric"
          />

          <Field
            label="Review content"
            value={
              editReviewComment
            }
            onChangeText={
              setEditReviewComment
            }
            multiline
          />

          <Button
            title="Save changes"
            onPress={() =>
              void saveEditedReview()
            }
          />

          <Button
            title="Cancel edit"
            secondary
            onPress={() => {
              setEditingReviewId(
                null
              );

              setEditReviewComment(
                ''
              );
            }}
          />
        </>
      ) : (
        <>
          <Text style={styles.reviewStars}>
            {'★'.repeat(
              review.rating
            )}
            {'☆'.repeat(
              5 - review.rating
            )}
          </Text>

          <Text style={uiStyles.body}>
            {review.comment}
          </Text>

          <Text style={uiStyles.muted}>
            Created:{' '}
            {new Date(
              review.createdAt
            ).toLocaleString()}
          </Text>

          <Button
            title="Edit review"
            secondary
            onPress={() =>
              startEditingReview(
                review
              )
            }
          />

          <Button
            title="Delete review"
            danger
            onPress={() =>
              removeAdminReview(
                review
              )
            }
          />
        </>
      )}
    </Card>
  )
)}
        
        <Text style={styles.sectionTitle}>
          Pending Nutritionist applications
        </Text>

        {applications.length === 0 && (
          <Card>
            <Text style={uiStyles.body}>
              No pending Nutritionist applications.
            </Text>
          </Card>
        )}

        {applications.map(application => (
          <Card key={application.id}>
            <Text style={styles.name}>
              {application.name}
            </Text>

            <Text style={uiStyles.muted}>
              {application.email}
            </Text>

            <View style={uiStyles.divider} />

            <Text style={uiStyles.body}>
              Qualification: {application.qualification}
            </Text>

            <Text style={uiStyles.body}>
              Specialty: {application.specialty}
            </Text>

            {!!application.experience && (
              <Text style={uiStyles.body}>
                Experience: {application.experience}
              </Text>
            )}

            <Button
              title="Approve application"
              onPress={() =>
                approveApplication(application)
              }
            />

            <Button
              title="Reject application"
              danger
              onPress={() =>
                rejectApplication(application)
              }
            />
          </Card>
        ))}

        <Button
          title="Log out"
          danger
          onPress={logout}
        />
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginTop: 14,
      marginBottom: 10,
    },

    adminName: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.primaryDark,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },

    flex: {
      flex: 1,
    },

    name: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },

    status: {
      color: colors.success,
      fontSize: 11,
      fontWeight: '800',
    },

    suspended: {
      color: colors.danger,
    },

    reviewStars: {
      color: '#E2AD39',
      fontSize: 18,
      marginBottom: 8,
},
  });

  