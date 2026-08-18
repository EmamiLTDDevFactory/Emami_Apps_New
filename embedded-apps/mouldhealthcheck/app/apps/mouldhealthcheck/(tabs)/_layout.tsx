import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import CustomTabs from '@/components/CustomTabs';

const _layout = () => {
  return (
    <Tabs tabBar={(props) => <CustomTabs {...props} />} screenOptions={{headerShown: false}}>
    </Tabs>
  )
}

export default _layout

const styles = StyleSheet.create({})