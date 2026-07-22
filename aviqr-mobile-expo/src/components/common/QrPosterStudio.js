import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import { Input } from './Input.js';
import { Button } from './Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../theme/index.js';
import { TEMPLATES, THEMES, BATCH_SIZES, DEFAULT_FORM, buildSingleHtml, buildBatchHtml } from '../../utils/posterTemplates.js';

// Mobile port of web's QrPosterStudio + Print Designer/Batch Print tabs
// (aviqr-ui-web/src/components/shared/QrPosterStudio.jsx + QrTemplates.jsx).
// Web renders posters as plain HTML/CSS and exports via window.print(); this
// does the same thing via expo-print, which renders real HTML/CSS natively —
// same visual approach, just handed to a different print API.
export function QrPosterStudio({ visible, onClose, shopId, shopName, targetUrl }) {
  const [step, setStep] = useState('template'); // template -> theme -> fields -> preview
  const [template, setTemplate] = useState('tent');
  const [themeKey, setThemeKey] = useState('emerald');
  const [batchOn, setBatchOn] = useState(false);
  const [batchCount, setBatchCount] = useState(6);
  const [form, setForm] = useState({ ...DEFAULT_FORM, shopName: shopName || '' });
  const [busy, setBusy] = useState(false);
  const qrRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tpl = TEMPLATES.find(t => t.key === template);
  const previewUrl = targetUrl || `https://aviqr.in/menu/${shopId}`;

  const reset = () => { setStep('template'); setTemplate('tent'); setThemeKey('emerald'); setBatchOn(false); setForm({ ...DEFAULT_FORM, shopName: shopName || '' }); };
  const close = () => { reset(); onClose(); };

  const getQrDataUrl = (value) => new Promise((resolve, reject) => {
    // react-native-qrcode-svg renders whatever `value` its ref currently
    // holds — for batch mode we swap `value` via state and read the ref
    // again on the next tick, one table at a time (rendering all N at once
    // off-screen would multiply memory use for no benefit here).
    setTimeout(() => {
      if (!qrRef.current) return reject(new Error('QR not ready'));
      qrRef.current.toDataURL((data) => resolve(`data:image/png;base64,${data}`));
    }, 60);
  });

  const [renderValue, setRenderValue] = useState(previewUrl);

  const handlePrint = async () => {
    setBusy(true);
    try {
      if (batchOn && tpl.batchable) {
        const cards = [];
        for (let i = 1; i <= batchCount; i++) {
          const val = `${previewUrl}?t=${i}`;
          setRenderValue(val);
          const dataUrl = await getQrDataUrl(val);
          cards.push({ tableNum: i, qrDataUrl: dataUrl });
        }
        const html = buildBatchHtml({ themeKey, form, cards });
        await Print.printAsync({ html });
      } else {
        setRenderValue(previewUrl);
        const dataUrl = await getQrDataUrl(previewUrl);
        const html = buildSingleHtml({ template, themeKey, form, qrDataUrl: dataUrl });
        await Print.printAsync({ html });
      }
    } catch (e) { Alert.alert('Print failed', 'Could not open the print dialog. Please try again.'); }
    finally { setBusy(false); }
  };

  const handleSharePdf = async () => {
    setBusy(true);
    try {
      let html;
      if (batchOn && tpl.batchable) {
        const cards = [];
        for (let i = 1; i <= batchCount; i++) {
          const val = `${previewUrl}?t=${i}`;
          setRenderValue(val);
          const dataUrl = await getQrDataUrl(val);
          cards.push({ tableNum: i, qrDataUrl: dataUrl });
        }
        html = buildBatchHtml({ themeKey, form, cards });
      } else {
        setRenderValue(previewUrl);
        const dataUrl = await getQrDataUrl(previewUrl);
        html = buildSingleHtml({ template, themeKey, form, qrDataUrl: dataUrl });
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert('Export failed', 'Could not generate the PDF. Please try again.'); }
    finally { setBusy(false); }
  };

  const downloadQrPng = async () => {
    setBusy(true);
    try {
      setRenderValue(previewUrl);
      const dataUrl = await getQrDataUrl(previewUrl);
      const base64 = dataUrl.replace('data:image/png;base64,', '');
      const path = `${FileSystem.cacheDirectory}qr-${(form.shopName || 'aviqr').toLowerCase().replace(/\s+/g, '-')}.png`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'image/png' });
    } catch { Alert.alert('Failed to prepare the QR image'); }
    finally { setBusy(false); }
  };

  const theme = THEMES[themeKey];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={ss.screen}>
        <View style={ss.header}>
          <TouchableOpacity onPress={step === 'template' ? close : () => setStep(prevStep(step))}>
            <Text style={ss.back}>{step === 'template' ? '✕' : '‹ Back'}</Text>
          </TouchableOpacity>
          <Text style={ss.title}>Poster & Print Studio</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={ss.stepDots}>
          {['template', 'theme', 'fields', 'preview'].map(s => (
            <View key={s} style={[ss.dot, step === s && ss.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={ss.body}>
          {step === 'template' && (
            <>
              <Text style={ss.sectionTitle}>Choose a template</Text>
              {TEMPLATES.map(t => (
                <TouchableOpacity key={t.key} style={[ss.optRow, template === t.key && ss.optRowActive]} onPress={() => setTemplate(t.key)}>
                  <Text style={ss.optEmoji}>{t.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.optLabel}>{t.label}</Text>
                    <Text style={ss.optDesc}>{t.desc}</Text>
                  </View>
                  {template === t.key && <Text style={ss.check}>✓</Text>}
                </TouchableOpacity>
              ))}
              {tpl?.batchable && (
                <View style={ss.batchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.optLabel}>Batch print (multiple tables)</Text>
                    <Text style={ss.optDesc}>Generate one card per table number, all in one print job</Text>
                  </View>
                  <Switch value={batchOn} onValueChange={setBatchOn} trackColor={{ true: Colors.primary }} />
                </View>
              )}
              {tpl?.batchable && batchOn && (
                <View style={ss.chipRow}>
                  {BATCH_SIZES.map(n => (
                    <TouchableOpacity key={n} style={[ss.chip, batchCount === n && ss.chipActive]} onPress={() => setBatchCount(n)}>
                      <Text style={[ss.chipText, batchCount === n && ss.chipTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Button title="Next: Theme" onPress={() => setStep('theme')} style={{ marginTop: 20 }} />
            </>
          )}

          {step === 'theme' && (
            <>
              <Text style={ss.sectionTitle}>Choose a color theme</Text>
              <View style={ss.themeGrid}>
                {Object.entries(THEMES).map(([key, th]) => (
                  <TouchableOpacity key={key} style={[ss.themeSwatch, { backgroundColor: th.bg }, themeKey === key && ss.themeSwatchActive]} onPress={() => setThemeKey(key)}>
                    <View style={[ss.themeDot, { backgroundColor: th.accent }]} />
                    <Text style={[ss.themeName, { color: th.text }]}>{th.name}</Text>
                    {themeKey === key && <Text style={[ss.check, { color: th.text }]}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Next: Details" onPress={() => setStep('fields')} style={{ marginTop: 20 }} />
            </>
          )}

          {step === 'fields' && (
            <>
              <Text style={ss.sectionTitle}>Card details</Text>
              <Input label="Shop / venue name" value={form.shopName} onChangeText={v => set('shopName', v)} placeholder="My Restaurant" />
              <Input label="Tagline (optional)" value={form.tagline} onChangeText={v => set('tagline', v)} placeholder="Fresh food, fast service" />
              {template === 'marketing' && (
                <Input label="Scan CTA text" value={form.scanCta} onChangeText={v => set('scanCta', v)} placeholder="Scan to see today's offers" />
              )}

              <ToggleField label="Discount badge" on={form.discountOn} onToggle={v => set('discountOn', v)}>
                <Input value={form.discountText} onChangeText={v => set('discountText', v)} placeholder="10% off today" />
              </ToggleField>

              <ToggleField label="New item highlight" on={form.newItemOn} onToggle={v => set('newItemOn', v)}>
                <Input value={form.newItemText} onChangeText={v => set('newItemText', v)} placeholder="Try our new biryani!" />
              </ToggleField>

              {template === 'tent' && (
                <ToggleField label="WiFi details" on={form.wifiOn} onToggle={v => set('wifiOn', v)}>
                  <Input label="Network name" value={form.wifiName} onChangeText={v => set('wifiName', v)} placeholder="Restaurant_WiFi" />
                  <Input label="Password" value={form.wifiPass} onChangeText={v => set('wifiPass', v)} placeholder="welcome123" />
                </ToggleField>
              )}

              {(template === 'poster' || template === 'counter') && (
                <ToggleField label="Contact info" on={form.contactOn} onToggle={v => set('contactOn', v)}>
                  <Input label="Phone" value={form.contactPhone} onChangeText={v => set('contactPhone', v)} placeholder="+91 98450 12345" />
                  <Input label="Address" value={form.contactAddress} onChangeText={v => set('contactAddress', v)} placeholder="12 MG Road, Bengaluru" />
                  <Input label="Website" value={form.contactWebsite} onChangeText={v => set('contactWebsite', v)} placeholder="aviqr.in" />
                </ToggleField>
              )}

              <ToggleField label="Footer message" on={form.footerOn} onToggle={v => set('footerOn', v)}>
                <Input value={form.footerText} onChangeText={v => set('footerText', v)} placeholder="Thank you for visiting!" />
              </ToggleField>

              <Button title="Next: Preview" onPress={() => setStep('preview')} style={{ marginTop: 12 }} />
            </>
          )}

          {step === 'preview' && (
            <>
              <Text style={ss.sectionTitle}>Preview{batchOn && tpl?.batchable ? ` — card 1 of ${batchCount}` : ''}</Text>
              <View style={[ss.previewCard, { backgroundColor: theme.bg }]}>
                <Text style={[ss.previewShop, { color: theme.text }]}>{form.shopName || 'Your Shop'}</Text>
                {!!form.tagline && <Text style={[ss.previewTagline, { color: theme.text }]}>{form.tagline}</Text>}
                <View style={ss.previewQrWrap}>
                  <QRCode
                    getRef={c => (qrRef.current = c)}
                    value={batchOn && tpl?.batchable ? `${previewUrl}?t=1` : previewUrl}
                    size={130}
                    color={Colors.gray900}
                    backgroundColor="white"
                  />
                </View>
                <Text style={[ss.previewCta, { color: theme.accent }]}>{form.scanCta || 'Scan to view menu & order'}</Text>
                <View style={ss.previewBadges}>
                  {form.discountOn && !!form.discountText && (
                    <View style={[ss.badge, { backgroundColor: theme.accent }]}><Text style={ss.badgeText}>{form.discountText}</Text></View>
                  )}
                  {form.newItemOn && !!form.newItemText && (
                    <View style={[ss.badge, { backgroundColor: theme.accent }]}><Text style={ss.badgeText}>✨ {form.newItemText}</Text></View>
                  )}
                </View>
              </View>

              <View style={{ gap: 10, marginTop: 20 }}>
                <Button title={busy ? 'Working…' : '🖨️ Print'} onPress={handlePrint} disabled={busy} />
                <Button title={busy ? 'Working…' : '📄 Share as PDF'} onPress={handleSharePdf} disabled={busy} variant="outline" />
                <Button title={busy ? 'Working…' : '⬇️ Download QR (PNG)'} onPress={downloadQrPng} disabled={busy} variant="outline" />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function prevStep(s) {
  const order = ['template', 'theme', 'fields', 'preview'];
  const i = order.indexOf(s);
  return order[Math.max(0, i - 1)];
}

function ToggleField({ label, on, onToggle, children }) {
  return (
    <View style={ss.toggleField}>
      <View style={ss.toggleFieldHeader}>
        <Text style={ss.toggleFieldLabel}>{label}</Text>
        <Switch value={on} onValueChange={onToggle} trackColor={{ true: Colors.primary }} />
      </View>
      {on && <View style={{ marginTop: 8 }}>{children}</View>}
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900 },
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: Colors.white },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.gray200 },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
  body: { padding: Spacing.base, paddingBottom: 60 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.gray900, marginBottom: 12 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm },
  optRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optEmoji: { fontSize: 24 },
  optLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  optDesc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  check: { fontSize: 18, color: Colors.primary, fontWeight: '800' },
  batchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700 },
  chipTextActive: { color: Colors.white },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeSwatch: { width: '47%', borderRadius: Radius.lg, padding: 16, gap: 6, borderWidth: 2, borderColor: 'transparent' },
  themeSwatchActive: { borderColor: Colors.primary },
  themeDot: { width: 22, height: 22, borderRadius: 11 },
  themeName: { fontSize: FontSize.sm, fontWeight: '800' },
  toggleField: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  toggleFieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleFieldLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  previewCard: { borderRadius: Radius.xl, padding: 22, alignItems: 'flex-start', gap: 4 },
  previewShop: { fontSize: FontSize['2xl'], fontWeight: '800' },
  previewTagline: { fontSize: FontSize.sm, opacity: 0.85 },
  previewQrWrap: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, marginVertical: 10 },
  previewCta: { fontSize: FontSize.sm, fontWeight: '800' },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800', color: '#1a1a1a' },
});
