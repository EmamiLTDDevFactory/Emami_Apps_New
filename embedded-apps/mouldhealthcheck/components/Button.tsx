import { StyleSheet, Text, View, Image, TextStyle, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useEffect } from "react";
import { CustomButtonProps } from "@/types";
import { colors } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Loading from "./Loading";

const Button = ({
    onPress,
    style,
    loading = false,
    children,
}: CustomButtonProps) => {

    if (loading) {
        return (
            <View style={[styles.button, style, { backgroundColor: "transparent" }]}>
               <Loading/>
            </View>
        );
    }
    return (
        <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
            {children}
        </TouchableOpacity>
    );
}

export default Button;

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        borderCurve: 'continuous',
        height: verticalScale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
});