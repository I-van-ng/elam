import { Router, Request, Response } from 'express';

const router = Router();
const updatedAt = '18 octobre 2026';

function renderPage(title: string, description: string, content: string) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <title>${title} | ELAM Santé</title>
</head>
<body>
  <header>
    <p><a href="/">ELAM Santé · Gabon</a></p>
    <h1>${title}</h1>
    <p>Mis à jour le ${updatedAt}</p>
  </header>
  <main>
    <p><strong>Contact :</strong> <a href="mailto:hansmbandong@gmail.com">hansmbandong@gmail.com</a></p>
    <aside><strong>Information :</strong> cette page décrit les services et traitements actuellement identifiés. Les informations juridiques et opérationnelles doivent être confirmées par ELAM avant d’être considérées comme des conditions définitives ou une certification de conformité.</aside>
    ${content}
  </main>
  <footer><p>© ${new Date().getFullYear()} ELAM Health Gabon. Porteur du projet : Mba Ndong Hans.</p></footer>
</body>
</html>`;
}

router.get('/cgu', (_req: Request, res: Response) => {
  const content = `
    <section>
      <h2>1. Objet du service</h2>
      <p>ELAM est un service numérique de mise en relation et d’information en santé au Gabon. Il permet notamment de rechercher des professionnels et établissements, de consulter des informations de disponibilité, de demander des rendez-vous ou réservations et d’accéder à des informations de premiers secours.</p>
    </section>
    <section>
      <h2>2. Création et sécurité du compte</h2>
      <p>Vous devez fournir des informations exactes, tenir vos coordonnées à jour et protéger vos identifiants. Vous êtes responsable des opérations réalisées depuis votre compte. Contactez ELAM si vous soupçonnez un accès non autorisé.</p>
    </section>
    <section>
      <h2>3. Utilisation responsable</h2>
      <p>Vous vous engagez à utiliser ELAM conformément aux lois applicables, à ne pas perturber le service, contourner ses protections, usurper une identité, publier des informations trompeuses ou accéder aux données d’autrui sans autorisation.</p>
    </section>
    <section>
      <h2>4. Informations et services de santé</h2>
      <p>Les informations d’annuaire, de disponibilité et de localisation peuvent être fournies ou mises à jour par des tiers. Elles peuvent évoluer et doivent être vérifiées directement auprès du professionnel ou de l’établissement concerné. ELAM ne remplace pas une consultation médicale.</p>
      <p>L’assistant IA et les contenus de premiers secours sont fournis à titre d’orientation et ne constituent ni un diagnostic ni un traitement. En cas d’urgence, contactez immédiatement les services d’urgence locaux ou rendez-vous dans un établissement de santé.</p>
    </section>
    <section>
      <h2>5. Paiements et abonnements</h2>
      <p>Le prix, les modalités et le statut d’un paiement sont ceux affichés au moment de la demande et confirmés par l’opérateur de paiement concerné. Ne communiquez jamais votre code secret Mobile Money à ELAM. Les conditions de renouvellement, remboursement et résiliation doivent être précisées avant toute souscription payante.</p>
    </section>
    <section>
      <h2>6. Disponibilité et évolution</h2>
      <p>ELAM s’efforce de maintenir le service disponible et à jour, mais certaines fonctions peuvent être interrompues pour maintenance, incident ou évolution technique. Les fonctionnalités peuvent être modifiées pour améliorer le service ou respecter les obligations applicables.</p>
    </section>
    <section>
      <h2>7. Données personnelles</h2>
      <p>L’utilisation du service implique le traitement de données personnelles décrit dans la <a href="/api/v1/legal/rgpd">page Données personnelles et confidentialité</a>. Consultez cette page avant de créer un compte ou d’utiliser les fonctions qui traitent des informations de santé.</p>
    </section>
    <section>
      <h2>8. Contact</h2>
      <p>Pour toute question au sujet de ces conditions, écrivez à <a href="mailto:hansmbandong@gmail.com">hansmbandong@gmail.com</a>.</p>
    </section>`;

  res.type('html').send(renderPage('Conditions générales d’utilisation (CGU)', 'Conditions d’utilisation des services ELAM Santé.', content));
});

router.get('/rgpd', (_req: Request, res: Response) => {
  const content = `
    <section>
      <h2>1. Données traitées</h2>
      <p>Selon les fonctions utilisées, ELAM peut traiter les nom, prénom, e-mail, téléphone, rôle, informations de profil, données d’assurance comme le numéro CNAMGS, ainsi que les rendez-vous, réservations et paiements. Les professionnels peuvent fournir des informations sur leur activité et leur établissement. Le service de secours peut recevoir le message, l’état signalé de la victime et une adresse si elle est saisie.</p>
    </section>
    <section>
      <h2>2. Finalités</h2>
      <p>Les données servent à gérer les comptes, mettre en relation patients et professionnels, organiser rendez-vous et réservations, traiter les paiements, fournir les fonctions demandées, répondre aux demandes et protéger le service.</p>
    </section>
    <section>
      <h2>3. Informations de santé et assistant IA</h2>
      <p>Les données relatives à la santé sont sensibles. Ne transmettez que les informations nécessaires à la fonction utilisée. Lorsque l’assistant IA est activé, le texte de votre demande, l’historique récent et certains éléments de situation peuvent être transmis à Google Gemini pour produire une réponse. Évitez les informations identifiantes qui ne sont pas nécessaires.</p>
    </section>
    <section>
      <h2>4. Destinataires et transferts</h2>
      <p>Les données nécessaires peuvent être communiquées aux prestataires d’hébergement et de base de données, aux opérateurs Mobile Money pour traiter les transactions, et à Google lorsque l’assistant IA est utilisé. La carte peut charger des ressources OpenStreetMap. Certains prestataires peuvent traiter des données hors du Gabon ; les lieux d’hébergement et garanties de transfert applicables doivent être confirmés avec eux. ELAM ne vend pas les données personnelles.</p>
    </section>
    <section>
      <h2>5. Durée et sécurité</h2>
      <p>Les données doivent être conservées pendant la durée nécessaire aux finalités annoncées et aux obligations applicables, puis supprimées ou archivées selon les règles de conservation d’ELAM. Les durées exactes par catégorie doivent être déterminées et communiquées. Des mesures techniques et organisationnelles visent à limiter les accès et à protéger les données, sans qu’un risque nul puisse être garanti.</p>
    </section>
    <section>
      <h2>6. Vos droits et demandes</h2>
      <p>Vous pouvez demander l’accès à vos données, leur rectification ou leur suppression, ainsi que des informations sur leur utilisation. D’autres droits et limites peuvent dépendre de la législation applicable. Envoyez votre demande à <a href="mailto:hansmbandong@gmail.com?subject=Demande%20relative%20%C3%A0%20mes%20donn%C3%A9es">hansmbandong@gmail.com</a>, en indiquant le compte concerné. Une vérification d’identité peut être requise.</p>
    </section>
    <section>
      <h2>7. Stockage dans le navigateur</h2>
      <p>L’application web conserve dans le stockage local du navigateur le jeton de session et le thème d’affichage. Elle ne met actuellement en place aucun cookie facultatif de publicité ou de mesure d’audience. Vous pouvez effacer les données locales dans les paramètres de votre navigateur ; cela peut vous déconnecter ou réinitialiser le thème.</p>
    </section>`;

  res.type('html').send(renderPage('Données personnelles et confidentialité', 'Informations sur les données personnelles utilisées par ELAM Santé.', content));
});

export default router;
