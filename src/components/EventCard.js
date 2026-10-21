import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function parseDate(str) {
  if (!str) return null;
  if (str instanceof Date) return isNaN(str.getTime()) ? null : new Date(str.getFullYear(), str.getMonth(), str.getDate(), 0, 0, 0, 0);
  if (typeof str === "object") {
    if (typeof str.toDate === "function") {
      const d = str.toDate();
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
    if (str.seconds !== undefined) {
      const d = new Date(str.seconds * 1000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    }
    if (str._seconds !== undefined) {
      const d = new Date(str._seconds * 1000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    }
  }
  if (typeof str === "number") {
    const d = new Date(str > 1e11 ? str : str * 1000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
  }
  if (typeof str === "string") {
    const cleanStr = str.replace(/^"|"$/g, "").trim();
    const m = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return null;
    if (cleanStr.includes("T") || cleanStr.includes("Z")) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  return null;
}
const formatShortDate = (val) => {
  const d = parseDate(val);
  if (!d) return val ? String(val) : "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function EventCard({ item, onPress, user, savedEvents, toggleSaveEvent }) {
  const title = item.name || item.title || item.Event || "Untitled Event";
  const venue = item.venue || item.Venue || item.location || "";
  const hall = item.hall || item["Hall / Room"] || item.room || "";
  const rawStart = item.startDate || item.loadIn || item.start || item.date || item.startTime;
  const rawEnd = item.endDate || item.loadOut || item.end || item.endTime;

  const startStr = formatShortDate(rawStart);
  const endStr = formatShortDate(rawEnd);
  const dateDisplay = startStr && endStr && startStr !== endStr
    ? `${startStr} - ${endStr}`
    : (startStr || endStr || "Date TBD");

  const isSaved = savedEvents && typeof savedEvents.has === "function" && savedEvents.has(item.id);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{title}</Text>
        {user && toggleSaveEvent ? (
          <TouchableOpacity
            onPress={() => toggleSaveEvent(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color="#FFD700"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color="#FFD700" style={styles.icon} />
        <Text style={styles.dateText}>{dateDisplay}</Text>
      </View>

      {Boolean(venue || hall) && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#aaa" style={styles.icon} />
          <Text style={styles.venueText} numberOfLines={1}>
            {[venue, hall].filter(Boolean).join(" • ")}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderRadius: 10,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD700",
    borderWidth: 1,
    borderColor: "#222222",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  icon: {
    marginRight: 6,
  },
  dateText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  venueText: {
    color: "#AAAAAA",
    fontSize: 13,
    flex: 1,
  },
});
