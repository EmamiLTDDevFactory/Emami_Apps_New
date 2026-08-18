import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Icons from 'phosphor-react-native';
import { colors, font, radius, shadow } from '@/constants/theme';

export type FeedbackState = {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "confirm" | null;
  confirmText?: string;
  cancelText?: string;
  onApprove?: () => void;
  onCancel?: () => void;
};

type Props = {
  feedback: FeedbackState;
  setFeedback: (f: FeedbackState) => void;
};

export default function FeedbackModal({ feedback, setFeedback }: Props) {
  const handleClose = () => {
    setFeedback({ ...feedback, visible: false });
    if (feedback.onCancel) {
      feedback.onCancel();
    }
  };

  const handleApprove = () => {
    setFeedback({ ...feedback, visible: false });
    if (feedback.onApprove) {
      feedback.onApprove();
    }
  };

  return (
    <Modal visible={feedback.visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            {feedback.type === "success" ? (
              <Icons.CheckCircle size={32} color={colors.success} weight="fill" />
            ) : feedback.type === "error" ? (
              <Icons.XCircle size={32} color="#ef4444" weight="fill" />
            ) : (
              <Icons.Question size={32} color={colors.info} weight="fill" />
            )}
            <Text style={styles.modalTitle}>{feedback.title}</Text>
          </View>
          
          <Text style={styles.modalMessage}>{feedback.message}</Text>

          <View style={styles.modalActions}>
            {feedback.type === "confirm" && (
              <TouchableOpacity 
                style={[styles.modalBtnCancel]} 
                onPress={handleClose}
              >
                <Text style={styles.modalBtnCancelText}>{feedback.cancelText || "Cancel"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[
                styles.modalBtnApprove, 
                { backgroundColor: feedback.type === 'error' ? "#ef4444" : feedback.type === 'confirm' ? colors.danger : colors.success }
              ]} 
              onPress={handleApprove}
            >
              <Text style={styles.modalBtnApproveText}>{feedback.confirmText || "OK"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius._20 || 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...(shadow.card || { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: font.black,
    color: colors.ink,
  },
  modalMessage: {
    fontSize: font.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtnApprove: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius._12 || 12,
  },
  modalBtnApproveText: {
    fontSize: font.body,
    fontWeight: font.bold,
    color: "#fff",
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius._12 || 12,
    backgroundColor: colors.surfaceAlt,
  },
  modalBtnCancelText: {
    fontSize: font.body,
    fontWeight: font.bold,
    color: colors.textMuted,
  },
});
