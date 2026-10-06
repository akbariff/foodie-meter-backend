import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { ScreenName } from '../types';
import { useApp } from '../context/AppContext';

export function ScreenTitle({ title, subtitle, back = false }: { title: string; subtitle?: string; back?: boolean }) {
  const { goBack } = useApp();
  return <View style={styles.titleWrap}>
    {back && <Pressable onPress={goBack}><Text style={styles.back}>‹ Back</Text></Pressable>}
    <Text style={styles.title}>{title}</Text>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>;
}

export function Field(props: TextInputProps & { label?: string }) {
  return <View style={styles.fieldWrap}>
    {!!props.label && <Text style={styles.label}>{props.label}</Text>}
    <TextInput placeholderTextColor="#B7BEBA" {...props} style={[styles.input, props.multiline && styles.multiline, props.style]} />
  </View>;
}

export function Button({ title, onPress, secondary=false, danger=false, disabled=false }: { title:string; onPress:()=>void; secondary?:boolean; danger?:boolean; disabled?:boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, disabled && { opacity: .5 }]}>
    <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
  </Pressable>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const tabs: { label:string; glyph:string; screen:ScreenName }[] = [
  { label:'Home', glyph:'⌂', screen:'Home' }, { label:'Log', glyph:'＋', screen:'LogMeal' },
  { label:'Diary', glyph:'▤', screen:'Diary' }, { label:'Premium', glyph:'✦', screen:'Premium' },
  { label:'Profile', glyph:'○', screen:'Profile' },
];

export function BottomNav() {
  const { route, navigate } = useApp();
  return <View style={styles.nav}>{tabs.map(t => {
    const active = route === t.screen;
    return <Pressable key={t.label} style={styles.navItem} onPress={() => navigate(t.screen)}>
      <Text style={[styles.navGlyph, active && styles.navActive]}>{t.glyph}</Text>
      <Text style={[styles.navText, active && styles.navActive]}>{t.label}</Text>
    </Pressable>;
  })}</View>;
}

export const uiStyles = StyleSheet.create({
  screen: { flex:1, backgroundColor:colors.background, paddingHorizontal:22 },
  scrollContent: { paddingBottom:120 },
  h2: { fontSize:17, fontWeight:'700', color:colors.text, marginBottom:8 },
  body: { color:colors.text, fontSize:14, lineHeight:21 },
  muted: { color:colors.muted, fontSize:12, lineHeight:18 },
  row: { flexDirection:'row', alignItems:'center' },
  spaceBetween: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  divider: { height:1, backgroundColor:colors.line, marginVertical:14 },
});

const styles = StyleSheet.create({
  titleWrap:{ marginTop:12, marginBottom:20 },
  back:{ color:colors.primaryDark, fontSize:14, marginBottom:8 },
  title:{ fontSize:26, fontWeight:'800', color:colors.text, letterSpacing:-.4 },
  subtitle:{ color:colors.muted, marginTop:4, fontSize:13 },
  fieldWrap:{ marginBottom:13 }, label:{ color:colors.text, fontSize:12, marginBottom:6, fontWeight:'600' },
  input:{ height:48, borderWidth:1, borderColor:colors.line, borderRadius:radius.sm, backgroundColor:colors.surface, paddingHorizontal:14, color:colors.text, fontSize:14 },
  multiline:{ height:100, paddingTop:12, textAlignVertical:'top' },
  button:{ minHeight:48, borderRadius:radius.sm, backgroundColor:colors.primary, alignItems:'center', justifyContent:'center', paddingHorizontal:18, marginVertical:6 },
  buttonSecondary:{ backgroundColor:colors.primarySoft, borderWidth:1, borderColor:colors.primary },
  buttonDanger:{ backgroundColor:colors.danger },
  buttonText:{ color:'white', fontWeight:'700', fontSize:14 }, buttonSecondaryText:{ color:colors.primaryDark },
  card:{ backgroundColor:colors.surface, borderRadius:radius.md, borderWidth:1, borderColor:colors.line, padding:16, marginBottom:12 },
  nav:{ position:'absolute', left:0, right:0, bottom:0, height:76, flexDirection:'row', backgroundColor:'#FFFFFF', borderTopWidth:1, borderTopColor:colors.line, paddingTop:8, paddingBottom:8 },
  navItem:{ flex:1, alignItems:'center', justifyContent:'center' }, navGlyph:{ color:'#ADB5B1', fontSize:22 }, navText:{ color:'#ADB5B1', fontSize:10, marginTop:2 }, navActive:{ color:colors.primaryDark, fontWeight:'700' },
});
