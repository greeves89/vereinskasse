# VereinsKasse Mobile App

React Native / Expo App für Vereinsmitglieder (iOS & Android).

## Features

- **Übersicht**: Mitgliedsstatus, Gruppe, Beitrag, offene Zahlungen
- **Veranstaltungen**: Bevorstehende Events mit Anmeldestatus
- **Dokumente**: Vereinsdokumente einsehen (Protokolle, Satzung, etc.)
- **Profil**: Persönliche Daten anzeigen

## Zugang

Mitglieder erhalten einen persönlichen Portal-Token vom Vereinsvorstand.
Dieser wird in VereinsKasse unter *Mitglieder → Portal-Link generieren* erzeugt.

## Setup (Entwicklung)

```bash
cd mobile
npm install
npx expo start
```

## Build (Produktion)

```bash
# iOS (macOS + Xcode erforderlich)
eas build --platform ios

# Android
eas build --platform android
```

## Technologie

- **Expo SDK 52** + Expo Router (file-based routing)
- **React Native** 0.76
- **expo-secure-store** für sichere Token-Speicherung
- **axios** für API-Kommunikation
- **@tanstack/react-query** für Data Fetching

## API

Die App nutzt die bestehenden VereinsKasse Portal-Endpoints:
- `GET /api/v1/portal/{token}` – Mitgliedsdaten, Events, Dokumente, Zahlungserinnerungen
