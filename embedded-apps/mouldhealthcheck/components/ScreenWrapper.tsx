import {
    Platform,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import React, { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapperProps } from '@/types';
import { colors } from '@/constants/theme';

const ScreenWrapper = ({ style , children }: ScreenWrapperProps) => {
    const insets = useSafeAreaInsets();
    let paddingTop = Platform.OS === 'ios' ? insets.top : 50;

    return (
        <View style={[
            {
                flex: 1,
                backgroundColor: colors.neutral900,
                paddingTop,
            },
            style,
        ]}>
        <StatusBar barStyle="light-content"/>
            {children}
        </View>
    );
};

export default ScreenWrapper;

const styles = StyleSheet.create({});
