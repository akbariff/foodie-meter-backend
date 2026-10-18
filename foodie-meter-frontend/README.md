# FoodieMeter React Native Frontend

A functional Expo + React Native prototype. Auth, profile, calorie goal, diary, AI recommendations, and nutritionist review use the Express backend. Other screens still contain local demo data.

## Included functional flows
- Login / logout through the backend
- Registration + email verification screen
- Forgot password screen
- Dashboard with daily calorie progress, water counter and quick actions
- Set calorie + macro goals
- Nutritionist-reviewed Premium AI meal recommendations
- Recipe detail + log meal
- Manual meal logging
- Food diary + daily total + remove entry
- Personal recipes: Create / Read / Update / Delete / Share
- Profile editing
- Reviews: Create / Read / Update / Delete
- Manually assigned Premium test access
- Premium insights screen

## 1. VS Code setup
Install:
- **Node.js 22.13+**
- **VS Code**
- VS Code extension: **React Native Tools** (recommended, not mandatory)
- Android Studio if you want an Android emulator, or Expo Go on a physical device.

## 2. Run the project
```bash
npm install
npx expo start
```
Then:
- press **a** to open an Android emulator, or
- scan the QR code using Expo Go.

## 3. Demo accounts
Use the root README's `demo:users` command to create verified local Premium and nutritionist accounts, or register and verify accounts before assigning test access with `demo:access`. An email containing `premium` does not grant Premium access. Some unrelated screens still use local demo data.

## 4. Connect your Express backend

Login, profile, calorie goal, diary, AI meal recommendations, and nutritionist review now call the Express backend. Run its AI migration and set up demo accounts as described in the root README. A local model is needed only when generating new candidates; approved recommendations can be viewed while Ollama is offline.
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Android emulator example:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4477/api
```

Physical Android phone example:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:4477/api
```
Use your PC's actual LAN IP and make sure the Express server listens on an accessible interface.

`src/services/api.ts` contains the connected API client. Other screens still contain demo data and should not be treated as backend-persisted features. Login tokens are kept in memory for this FYP demo, so restarting the app requires logging in again.

## Design notes
The UI intentionally follows your wireframe direction rather than a generic Material UI look. The main palette is in `src/theme.ts`, so you can change the entire app appearance from one file.
