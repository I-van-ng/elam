# ELAM Mobile 🇬🇦 (Application Native en Python & Flet)
> **Le Waze de la Santé au Gabon — Application Mobile Native (Python / Flet / Flutter Engine / SQLite)**

---

## 📱 Caractéristiques de l'Application

- **100% Python & Moteur Flutter** : Fluidité 60 FPS, composants tactiles natifs (Bottom Bar, Modales, SnackBar, Switchs).
- **Moteur Waze de la Santé** : Calcul de proximité GPS en temps réel (Akanda, Centre-ville, Glass, Owendo).
- **Disponibilité des Médicaments** : Recherche immédiate avec fraîcheur des stocks (*"Vérifié il y a 15 min"*) et mise de côté / réservation d'ordonnance.
- **Médecins Spécialistes** : Annuaire officiel avec vérification CNOM (Conseil National de l'Ordre des Médecins) et prise de RDV.
- **Urgences 24/7** : Appel direct en 1 clic vers le **SAMU Gabon (1300)** et les Pompiers (18).
- **Portails Professionnels Démo** :
  - *Mode Médecin* : Validation des consultations et gestion de patientèle.
  - *Mode Pharmacie* : Basculement direct de la permanence de garde 24/7 et gestion des stocks.

---

## 🚀 Lancer l'Application sur PC (Mode Aperçu Smartphone)

Dans le dossier `elam_mobile_python` :
```powershell
& "C:\Python314\python.exe" main.py
```
Une fenêtre au format smartphone s'ouvre directement avec l'ensemble des fonctionnalités interactives. La barre de navigation s'adapte désormais aux petits écrans et le thème sombre peut être basculé depuis l'accueil.

---

## 📦 Compiler en Application Android (.APK)

Pour générer le fichier APK installable sur smartphone Android :
```powershell
& "C:\Python314\python.exe" -m flet build apk
```
Le fichier `.apk` généré peut être directement transféré et installé sur n'importe quel téléphone Android.
