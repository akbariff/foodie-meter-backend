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
    AdminUser,
    NutritionistApplication,
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
    const load = useCallback(async () => {
      try {
        setLoading(true);

        const [userData, applicationData] = await Promise.all([
          api.getAdminUsers({
            search: search.trim() || undefined,
          }),
          api.getNutritionistApplications('PENDING'),
        ]);

        setUsers(userData);
        setApplications(applicationData);
      } catch (error) {
        Alert.alert(
          'Admin error',
          (error as Error).message
        );
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

    useEffect(() => {load();}, []);

    const changeStatus = (
      account: AdminUser
    ) => {
      const next =
        account.status === 'ACTIVE'
          ? 'SUSPENDED'
          : 'ACTIVE';

      Alert.alert(
        next === 'SUSPENDED'
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
              try {
                await api.updateAdminUserStatus(
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

    const makeNutritionist = (
      account: AdminUser
    ) => {
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

    const approveApplication = async (
      application: NutritionistApplication
    ) => {
      try {
        await api.approveNutritionistApplication(
          application.id
        );

        Alert.alert(
          'Approved',
          'Nutritionist application approved.'
        );

        await load();
      } catch (error) {
        Alert.alert(
          'Approval failed',
          (error as Error).message
        );
      }
    };

    const rejectApplication = async (
    application: NutritionistApplication
  ) => {
    try {
      await api.rejectNutritionistApplication(
        application.id,
        'Application rejected by administrator'
      );

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
  });