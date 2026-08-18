import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CenteredModal, ModalHeader } from '@/components/CenteredModal';
import { GhostButton, ModalButtonRow, PrimaryButton } from '@/components/Form';
import { colors, radius } from '@/constants/theme';

/**
 * Ported from _pod_view_simple() in dis_shared_components.py. Note: in the
 * original app the POD uploader is disabled and load_pod_store() never
 * populates anything, so pod_store is always effectively empty and this
 * modal is never actually shown in practice — see completed.tsx's podStore
 * constant. Built fully and correctly anyway so the plumbing is ready for
 * whenever a real POD data source is wired up.
 */
export interface PodRecord {
  filename: string;
  content_type: string;
  data?: string; // base64
  url?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

function isImageFile(pod: PodRecord): boolean {
  return IMAGE_TYPES.includes(pod.content_type) || /\.(jpe?g|png|gif)$/i.test(pod.filename ?? '');
}
function isPdfFile(pod: PodRecord): boolean {
  return pod.content_type === 'application/pdf' || /\.pdf$/i.test(pod.filename ?? '');
}

export function PodViewModal({
  visible,
  invoiceNo,
  pod,
  onClose,
}: {
  visible: boolean;
  invoiceNo: string;
  pod: PodRecord | null;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const filename = pod?.filename || 'pod_document';

  // NOTE: react-native-webview is not installed in this project, so a PDF
  // can't be rendered inline here the way the original does via an
  // <iframe data:application/pdf;base64,...>. Degrading to a generic file
  // line + note per the task's acceptable-gap guidance rather than adding
  // a new dependency.
  async function handleDownload() {
    if (!pod?.data) return;
    setDownloading(true);
    try {
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(dest, pod.data, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: pod.content_type || 'application/octet-stream' });
      }
    } catch {
      // Best-effort — there is no real POD data source upstream yet (see
      // completed.tsx's pod-store note), so this path is currently unreachable.
    } finally {
      setDownloading(false);
    }
  }

  function renderBody() {
    if (pod?.data) {
      if (isImageFile(pod)) {
        return (
          <Image
            source={{ uri: `data:${pod.content_type || 'image/jpeg'};base64,${pod.data}` }}
            style={styles.image}
            resizeMode="contain"
          />
        );
      }
      if (isPdfFile(pod)) {
        return (
          <View>
            <Text style={styles.fileLine}>📄 {filename}</Text>
            <Text style={styles.note}>
              PDF preview isn&apos;t available in this app build — use Download to view the file.
            </Text>
          </View>
        );
      }
      return <Text style={styles.fileLine}>📄 {filename}</Text>;
    }
    if (pod?.url) {
      return (
        <Pressable onPress={() => Linking.openURL(pod.url as string)}>
          <Text style={styles.link}>🔗 Open POD in new tab</Text>
        </Pressable>
      );
    }
    return (
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>No file data found for this POD.</Text>
      </View>
    );
  }

  return (
    <CenteredModal visible={visible} onClose={onClose} maxWidth={620}>
      <ModalHeader
        iconBg={colors.navyLt}
        icon="📎"
        title="POD Document"
        titleColor={colors.navy}
        subtitle={`Invoice · ${invoiceNo} · ${filename}`}
      />

      {renderBody()}

      {!pod?.data && (
        <Text style={styles.downloadHint}>Download is only available once the file bytes are present.</Text>
      )}

      <ModalButtonRow>
        <GhostButton label="✕ Close" onPress={onClose} />
        <PrimaryButton
          label={downloading ? 'Downloading…' : '⬇ Download POD'}
          onPress={handleDownload}
          color={colors.navy}
          loading={downloading}
        />
      </ModalButtonRow>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 320, borderRadius: radius.sm, backgroundColor: colors.g100 },
  fileLine: { fontSize: 13, fontWeight: '600', color: colors.nearBlack },
  note: { fontSize: 11, color: colors.g500, marginTop: 6 },
  link: { fontSize: 13, color: colors.navy, fontWeight: '700' },
  warnBox: {
    backgroundColor: colors.amberLt,
    borderWidth: 1.5,
    borderColor: colors.amberBd,
    borderRadius: radius.sm,
    padding: 12,
  },
  warnText: { color: colors.amberDk, fontSize: 12, fontWeight: '600' },
  downloadHint: { fontSize: 10, color: colors.g400, marginTop: 8 },
});
