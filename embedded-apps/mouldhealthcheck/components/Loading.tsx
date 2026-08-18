import { StyleSheet, Text, View,
    ActivityIndicator,
    ActivityIndicatorProps
 } from "react-native";
import React from "react";
import { colors } from "@/constants/theme";

const Loading = ({
    size = "large",
    color = "#fff",
}: ActivityIndicatorProps) => {
  return (
    <View style={styles.container}>
        <ActivityIndicator size={size} color={color} />
    </View>
  );
}

export default Loading;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral900,
    },
    text: {
        color: '#fff',
        fontSize: 18,
    },
}); 