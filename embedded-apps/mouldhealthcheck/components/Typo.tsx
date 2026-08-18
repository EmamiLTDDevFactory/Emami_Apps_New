import { StyleSheet, Text, View, Image, TextStyle } from "react-native";
import React, { useEffect } from "react";
import { colors } from "@/constants/theme";
import { TypoProps } from "@/types";

const Typo = ({
    size,
    color = colors.white,
    children,
    style,
    textProps = {},
    fontWeight,
}: TypoProps) => {  
    const textStyle: TextStyle = {  
        fontSize: size,     
        color,
        fontWeight,
    };
    
    return (        
    <Text style={[textStyle, style]} {...textProps}>
        {children}
    </Text> 
    );
};

export default Typo;

const styles = StyleSheet.create({});