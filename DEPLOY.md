# Déployer AFK Farm sur GitHub Pages

Le jeu est 100 % statique et **n'utilise que des chemins relatifs** : il
fonctionne tel quel depuis un sous-dossier comme `…/afk-farm/`. Tu n'as donc
**aucune adresse à saisir** nulle part.

## Méthode simple (recommandée) — « Deploy from a branch »

1. Sur GitHub, ouvre le dépôt **`MathieuBal/afk-farm`**.
2. **Settings** (réglages du dépôt) → menu de gauche **Pages**.
3. Section **Build and deployment** :
   - **Source** : choisis **« Deploy from a branch »**.
   - **Branch** : sélectionne **`main`** et le dossier **`/ (root)`**.
   - Clique **Save**.
4. Attends ~1 minute, puis recharge la page Settings → Pages.

➡️ Ton jeu sera en ligne à cette adresse **exacte** (note le `/` final) :

```
https://mathieubal.github.io/afk-farm/
```

> ⚠️ Le format de l'URL Pages est **toujours** :
> `https://<utilisateur>.github.io/<dépôt>/`
> — tout en minuscules, avec un `/` à la fin. Ici : utilisateur =
> `mathieubal`, dépôt = `afk-farm`.

## Méthode alternative — « GitHub Actions »

Le dépôt contient déjà un workflow (`.github/workflows/deploy-pages.yml`).
1. **Settings → Pages → Source** : choisis **« GitHub Actions »**.
2. À chaque push sur `main`, le site est redéployé automatiquement
   (onglet **Actions** pour suivre).

L'adresse finale est la même : `https://mathieubal.github.io/afk-farm/`.

## Erreurs fréquentes (le « format d'adresse »)

- **Custom domain** : laisse ce champ **vide** tant que tu ne possèdes pas un
  vrai nom de domaine. Y mettre un texte casse le déploiement.
- N'écris pas l'adresse à la main dans les réglages : GitHub la génère seul.
  Le seul choix à faire est *Source / Branch / Folder*.
- Si tu vois une page blanche : vide le cache (le jeu a un service worker) en
  faisant **Ctrl/Cmd + Maj + R**, ou désinstalle l'ancienne version (PWA).
- Page 404 juste après l'activation : c'est normal, attends 1–2 minutes.

## Installer comme application (PWA)

Une fois en ligne, sur mobile : menu du navigateur → **« Ajouter à l'écran
d'accueil »**. Le jeu s'ouvre alors en plein écran et fonctionne hors-ligne.
