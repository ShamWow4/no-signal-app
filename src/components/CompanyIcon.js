import React, { useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";

const SOCIAL_DOMAINS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "linktr.ee"
];

export const getSourceLogoUrl = (src, website = null) => {
  let domain = "";

  if (website && String(website).trim()) {
    let clean = String(website).toLowerCase().trim();
    clean = clean.replace(/^https?:\/\//, "").replace(/^www\./, "");
    domain = clean.split("/")[0].trim();
  } else if (src && String(src).trim()) {
    const s = String(src).toLowerCase().trim();
    if (s.includes("avnetwork")) domain = "avnetwork.com";
    else if (s.includes("commercialintegrator")) domain = "commercialintegrator.com";
    else if (s.includes("mccno")) domain = "mccno.com";
    else if (s.includes("asmglobal") || s === "asm global") domain = "asmglobal.com";
    else if (s.includes("freeman")) domain = "freeman.com";
    else if (s.includes("lasso")) domain = "lasso.io";
    else if (s.includes("http://") || s.includes("https://") || s.includes("www.")) {
      const clean = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
      domain = clean.split("/")[0].trim();
    }
  }

  if (!domain || !domain.includes(".") || SOCIAL_DOMAINS.some(d => domain.endsWith(d))) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

const getInitials = (name) => {
  if (!name) return "AV";
  const cleaned = String(name).replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "AV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export default function CompanyIcon({ name, website, size = 38, style }) {
  const [imgError, setImgError] = useState(false);
  const url = getSourceLogoUrl(name, website);
  const boxSize = Math.max(size, 36);

  if (url && !imgError) {
    return (
      <View
        style={[
          styles.logoContainer,
          { width: boxSize, height: boxSize, borderRadius: Math.round(boxSize * 0.22) },
          style,
        ]}
      >
        <Image
          source={{ uri: url }}
          style={{
            width: Math.round(boxSize * 0.78),
            height: Math.round(boxSize * 0.78),
            resizeMode: "contain",
          }}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.monogramContainer,
        { width: boxSize, height: boxSize, borderRadius: Math.round(boxSize * 0.22) },
        style,
      ]}
    >
      <Text style={[styles.monogramText, { fontSize: Math.round(boxSize * 0.38) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    backgroundColor: "#F4F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD70066",
    marginRight: 12,
    overflow: "hidden",
  },
  monogramContainer: {
    backgroundColor: "#1F1A08",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD70088",
    marginRight: 12,
  },
  monogramText: {
    color: "#FFD700",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
