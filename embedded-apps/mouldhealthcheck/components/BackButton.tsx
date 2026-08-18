import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { BackButtonProps } from "@/types";
import { useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { verticalScale } from "@/utils/styling";
import { colors, radius } from "@/constants/theme";

const BackButton = ({
    style,
    iconSize = 26,
    color,
}: BackButtonProps) => {
    const router = useRouter();
    return (
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, style]}>
            <CaretLeftIcon
                size={verticalScale(iconSize)}
                color={color || colors.white}
                weight="bold"
            />
        </TouchableOpacity>
    );
};

export default BackButton;

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.neutral600,
        borderRadius: radius._12,
        borderCurve: 'continuous',
        alignSelf: 'flex-start',
        padding: 5,
    },  
});