# FoodieMeter React Native Frontend

A functional Expo + React Native prototype based on the FoodieMeter wireframe style: white background, sage-green controls, compact cards, large grey headings, and a five-item bottom navigation.

## Included functional flows
- Login / logout (demo mode)
- Registration + email verification screen
- Forgot password screen
- Dashboard with daily calorie progress, water counter and quick actions
- Set calorie + macro goals
- Rule-based / Premium recommendations
- Recipe detail + log meal
- Manual meal logging
- Food diary + daily total + remove entry
- Personal recipes: Create / Read / Update / Delete / Share
- Profile editing
- Reviews: Create / Read / Update / Delete
- Free → Premium demo upgrade
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
The current package runs with local mock state so you can test every UI immediately.

- Free demo: `free@foodiemeter.local` / any non-empty password
- Premium demo: `premium@foodiemeter.local` / any non-empty password

Any email containing the word `premium` opens the Premium version.

## 4. Connect your Express backend
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
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

Physical Android phone example:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000/api
```
Use your PC's actual LAN IP and make sure the Express server listens on an accessible interface.

`src/services/api.ts` contains a ready API client. **The endpoint paths are placeholders** because your exact GitHub backend routes were not available when this frontend package was generated. Match them to your Swagger documentation, then replace the mock actions in `AppContext.tsx` with those API calls.

## 5. Suggested backend integration order
1. Login + JWT
2. Register + verify email
3. Profile
4. Calorie goal
5. Meal logging / diary
6. Recipe CRUD
7. Reviews
8. Premium subscription
9. Recommendation / recipe API
10. Advanced Premium features

## Design notes
The UI intentionally follows your wireframe direction rather than a generic Material UI look. The main palette is in `src/theme.ts`, so you can change the entire app appearance from one file.
