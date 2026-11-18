import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, SafeAreaView } from "react-native";

const TAB_CONFIG = {
  index: { label: "Calendar", icon: "calendar-outline" },
  gigs: { label: "Gigs", icon: "flash-outline" },
  cheatsheets: { label: "Cheat Sheets", icon: "book-outline" },
  calculator: { label: "Calculator", icon: "calculator-outline" },
  toolbox: { label: "Toolbox", icon: "hammer-outline" },
  "rf-coordination": { label: "RF Coord", icon: "radio-outline" },
  directory: { label: "Directory", icon: "people-outline" },
  education: { label: "Education", icon: "school-outline" },
  news: { label: "AV News", icon: "newspaper-outline" },
  donors: { label: "Donors", icon: "heart-outline" },
  support: { label: "Support", icon: "construct-outline" },
};

function BrandHeaderAndTopTabs({ state, descriptors, navigation }) {
  return (
    <SafeAreaView style={styles.safeTop}>
      {/* Global Consistent Brand Masthead */}
      <View style={styles.brandHeader}>
        <Text style={styles.brandTitle}>No Signal!</Text>
        <Text style={styles.brandSubtitle}>The NOLA AV Newsletter</Text>
      </View>

      {/* Scrollable Top Navigation Bar */}
      <View style={styles.topBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.name] || {};
            if (options?.href === null) return null;

            const config = TAB_CONFIG[route.name] || {
              label: options?.title || route.name,
              icon: "ellipse-outline",
            };

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[styles.tabButton, isFocused && styles.tabButtonActive]}
              >
                <Ionicons
                  name={config.icon}
                  size={15}
                  color={isFocused ? "#000000" : "#E6C587"}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BrandHeaderAndTopTabs {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: "top",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Calendar" }} />
      <Tabs.Screen name="gigs" options={{ title: "Gigs" }} />
      <Tabs.Screen name="cheatsheets" options={{ title: "Cheat Sheets" }} />
      <Tabs.Screen name="calculator" options={{ title: "Calculator" }} />
      <Tabs.Screen name="toolbox" options={{ title: "Toolbox" }} />
      <Tabs.Screen name="rf-coordination" options={{ title: "RF Coord" }} />
      <Tabs.Screen name="directory" options={{ title: "Directory" }} />
      <Tabs.Screen name="education" options={{ title: "Education" }} />
      <Tabs.Screen name="news" options={{ title: "AV News" }} />
      <Tabs.Screen name="donors" options={{ title: "Donors" }} />
      <Tabs.Screen name="support" options={{ title: "Support" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    backgroundColor: "#000000",
    paddingTop: Platform.OS === "android" ? 28 : 0,
  },
  brandHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#000000",
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#E6C587",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FBF0D9",
    letterSpacing: 2,
    marginTop: 4,
    textAlign: "center",
  },
  topBarContainer: {
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#3A2E18",
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#090806",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3A2E18",
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: "#E6C587",
    borderColor: "#FBF0D9",
  },
  tabText: {
    color: "#E6C587",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  tabTextActive: {
    color: "#000000",
  },
});
